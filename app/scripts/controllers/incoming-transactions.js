const ObservableStore = require('obs-store')
const log = require('loglevel')
const BN = require('bn.js')
const createId = require('../lib/random-id')
const { bnToHex } = require('../lib/util')
const {
  MAINNET_CODE,
  ROPSTEN_CODE,
  RINKEYBY_CODE,
  KOVAN_CODE,
  ROPSTEN,
  RINKEBY,
  KOVAN,
  MAINNET,
} = require('./network/enums')
const networkTypeToIdMap = {
  [ROPSTEN]: String(ROPSTEN_CODE),
  [RINKEBY]: String(RINKEYBY_CODE),
  [KOVAN]: String(KOVAN_CODE),
  [MAINNET]: String(MAINNET_CODE),
}

class IncomingTransactionsController {

  constructor (opts = {}) {
    const {
      blockTracker,
      networkController,
      preferencesController,
    } = opts
    this.blockTracker = blockTracker
    this.networkController = networkController
    this.preferencesController = preferencesController
    this.getCurrentNetwork = () => networkController.getProviderConfig().type

    const initState = Object.assign({
      incomingTransactions: {},
      incomingTxLastFetchedBlocksByNetwork: {
        [ROPSTEN]: null,
        [RINKEBY]: null,
        [KOVAN]: null,
        [MAINNET]: null,
      },
    }, opts.initState)
    this.store = new ObservableStore(initState)

    this.networkController.on('networkDidChange', async (newType) => {
      const address = this.preferencesController.getSelectedAddress()
      await this._update({
        address,
        networkType: newType,
      })
    })
    this.blockTracker.on('latest', async (newBlockNumberHex) => {
      const address = this.preferencesController.getSelectedAddress()
      await this._update({
        address,
        newBlockNumberDec: parseInt(newBlockNumberHex, 16),
      })
    })
    this.preferencesController.store.subscribe(async ({ selectedAddress }) => {
      await this._update({
        address: selectedAddress,
      })
    })
  }

  async _update ({ address, newBlockNumberDec, networkType } = {}) {
    try {
      const dataForUpdate = await this._getDataForUpdate({ address, newBlockNumberDec, networkType })
      await this._updateStateWithNewTxData(dataForUpdate)
    } catch (err) {
      log.error(err)
    }
  }

  async _getDataForUpdate ({ address, newBlockNumberDec, networkType } = {}) {
    const {
      incomingTransactions: currentIncomingTxs,
      incomingTxLastFetchedBlocksByNetwork: currentBlocksByNetwork,
    } = this.store.getState()

    const network = networkType || this.getCurrentNetwork()
    const lastFetchBlockByCurrentNetwork = currentBlocksByNetwork[network]
    let blockToFetchFrom = lastFetchBlockByCurrentNetwork || newBlockNumberDec
    if (blockToFetchFrom === undefined) {
      blockToFetchFrom = parseInt(this.blockTracker.getCurrentBlock(), 16)
    }

    const { latestIncomingTxBlockNumber, txs: newTxs } = await this._fetchAll(address, blockToFetchFrom, network)

    return {
      latestIncomingTxBlockNumber,
      newTxs,
      currentIncomingTxs,
      currentBlocksByNetwork,
      fetchedBlockNumber: blockToFetchFrom,
      network,
    }
  }

  async _updateStateWithNewTxData ({
    latestIncomingTxBlockNumber,
    newTxs,
    currentIncomingTxs,
    currentBlocksByNetwork,
    fetchedBlockNumber,
    network,
  }) {
    const newLatestBlockHashByNetwork = latestIncomingTxBlockNumber
      ? parseInt(latestIncomingTxBlockNumber, 10) + 1
      : fetchedBlockNumber + 1
    const newIncomingTransactions = {
      ...currentIncomingTxs,
    }
    newTxs.forEach(tx => { newIncomingTransactions[tx.hash] = tx })

    this.store.updateState({
      incomingTxLastFetchedBlocksByNetwork: {
        ...currentBlocksByNetwork,
        [network]: newLatestBlockHashByNetwork,
      },
      incomingTransactions: newIncomingTransactions,
    })
  }

  async _fetchAll (address, fromBlock, networkType) {
    try {
      const fetchedTxResponse = await this._fetchTxs(address, fromBlock, networkType)
      return this._processTxFetchResponse(fetchedTxResponse)
    } catch (err) {
      log.error(err)
    }
  }

  async _fetchTxs (address, fromBlock, networkType) {
    let etherscanSubdomain = 'api'
    const currentNetworkID = networkTypeToIdMap[networkType]
    const supportedNetworkTypes = [ROPSTEN, RINKEBY, KOVAN, MAINNET]

    if (supportedNetworkTypes.indexOf(networkType) === -1) {
      return {}
    }

    if (networkType !== MAINNET) {
      etherscanSubdomain = `api-${networkType}`
    }
    const apiUrl = `https://${etherscanSubdomain}.etherscan.io`
    let url = `${apiUrl}/api?module=account&action=txlist&address=${address}&tag=latest&page=1`

    if (fromBlock) {
      url += `&startBlock=${parseInt(fromBlock, 10)}`
    }
    const response = await fetch(url)
    const parsedResponse = await response.json()

    return {
      ...parsedResponse,
      address,
      currentNetworkID,
    }
  }

  _processTxFetchResponse ({ status, result, address, currentNetworkID }) {
    if (status !== '0' && result.length > 0) {
      const remoteTxList = {}
      const remoteTxs = []
      result.forEach((tx) => {
        if (!remoteTxList[tx.hash]) {
          remoteTxs.push(this._normalizeTxFromEtherscan(tx, currentNetworkID))
          remoteTxList[tx.hash] = 1
        }
      })

      const incomingTxs = remoteTxs.filter(tx => tx.txParams.to && tx.txParams.to.toLowerCase() === address.toLowerCase())
      incomingTxs.sort((a, b) => (a.time < b.time ? -1 : 1))

      let latestIncomingTxBlockNumber = null
      incomingTxs.forEach((tx) => {
        if (
          tx.blockNumber &&
          (!latestIncomingTxBlockNumber ||
            parseInt(latestIncomingTxBlockNumber, 10) < parseInt(tx.blockNumber, 10))
        ) {
          latestIncomingTxBlockNumber = tx.blockNumber
        }
      })
      return {
        latestIncomingTxBlockNumber,
        txs: incomingTxs,
      }
    }
    return {
      latestIncomingTxBlockNumber: null,
      txs: [],
    }
  }

  _normalizeTxFromEtherscan (txMeta, currentNetworkID) {
    const time = parseInt(txMeta.timeStamp, 10) * 1000
    const status = txMeta.isError === '0' ? 'confirmed' : 'failed'
    return {
      blockNumber: txMeta.blockNumber,
      id: createId(),
      metamaskNetworkId: currentNetworkID,
      status,
      time,
      txParams: {
        from: txMeta.from,
        gas: bnToHex(new BN(txMeta.gas)),
        gasPrice: bnToHex(new BN(txMeta.gasPrice)),
        nonce: bnToHex(new BN(txMeta.nonce)),
        to: txMeta.to,
        value: bnToHex(new BN(txMeta.value)),
      },
      hash: txMeta.hash,
      transactionCategory: 'incoming',
    }
  }
}

module.exports = IncomingTransactionsController

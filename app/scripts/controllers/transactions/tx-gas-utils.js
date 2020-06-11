import EthQuery from 'ethjs-query'
import { hexToBn, BnMultiplyByFraction, bnToHex } from '../../lib/util'
import { addHexPrefix } from 'ethereumjs-util'
import { MIN_GAS_LIMIT_HEX } from '../../../../ui/app/components/send/send.constants'
import log from 'loglevel'

/**
tx-gas-utils are gas utility methods for Transaction manager
its passed ethquery
and used to do things like calculate gas of a tx.
@param {Object} provider - A network provider.
*/

export default class TxGasUtil {

  constructor (provider) {
    this.query = new EthQuery(provider)
  }

  /**
    @param {Object} txMeta - the txMeta object
    @returns {GasAnalysisResult} The result of the gas analysis
  */
  async analyzeGasUsage (txMeta) {
    const block = await this.query.getBlockByNumber('latest', false)

    // fallback to block gasLimit
    const blockGasLimitBN = hexToBn(block.gasLimit)
    const saferGasLimitBN = BnMultiplyByFraction(blockGasLimitBN, 19, 20)
    let estimatedGasHex = bnToHex(saferGasLimitBN)
    try {
      estimatedGasHex = await this.estimateTxGas(txMeta, block.gasLimit)
    } catch (error) {
      log.warn(error)
      txMeta.simulationFails = {
        reason: error.message,
        errorKey: error.errorKey,
        debug: { blockNumber: block.number, blockGasLimit: block.gasLimit },
      }
      return txMeta
    }
    this.setTxGas(txMeta, block.gasLimit, estimatedGasHex)
    return txMeta
  }

  /**
    Estimates the tx's gas usage
    @param txMeta {Object} - the txMeta object
    @param blockGasLimitHex {string} - hex string of the block's gas limit
    @returns {string} the estimated gas limit as a hex string
  */
  async estimateTxGas (txMeta, blockGasLimitHex) {
    const txParams = txMeta.txParams

    // check if gasLimit is already specified
    txMeta.gasLimitSpecified = Boolean(txParams.gas)

    // if it is, use that value
    if (txMeta.gasLimitSpecified) {
      return txParams.gas
    }

    // if recipient has no code, gas is 21k max:
    const recipient = txParams.to
    const hasRecipient = Boolean(recipient)
    let code
    if (recipient) code = await this.query.getCode(recipient)

    if (hasRecipient && (!code || code === '0x' || code === '0x0')) {
      txParams.gas = MIN_GAS_LIMIT_HEX
      txMeta.simpleSend = true // Prevents buffer addition
      return MIN_GAS_LIMIT_HEX
    }

    // if not, fall back to block gasLimit
    const blockGasLimitBN = hexToBn(blockGasLimitHex)
    const saferGasLimitBN = BnMultiplyByFraction(blockGasLimitBN, 19, 20)
    txParams.gas = bnToHex(saferGasLimitBN)

    // run tx
    return await this.query.estimateGas(txParams)
  }

  /**
    Writes the gas on the txParams in the txMeta
    @param txMeta {Object} - the txMeta object to write to
    @param blockGasLimitHex {string} - the block gas limit hex
    @param estimatedGasHex {string} - the estimated gas hex
  */
  setTxGas (txMeta, blockGasLimitHex, estimatedGasHex) {
    txMeta.estimatedGas = addHexPrefix(estimatedGasHex)
    const txParams = txMeta.txParams

    // if gasLimit was specified and doesnt OOG,
    // use original specified amount
    if (txMeta.gasLimitSpecified || txMeta.simpleSend) {
      txMeta.estimatedGas = txParams.gas
      return
    }
    // if gasLimit not originally specified,
    // try adding an additional gas buffer to our estimation for safety
    const recommendedGasHex = this.addGasBuffer(txMeta.estimatedGas, blockGasLimitHex)
    txParams.gas = recommendedGasHex
    return
  }

  /**
    Adds a gas buffer with out exceeding the block gas limit

    @param {string} initialGasLimitHex - the initial gas limit to add the buffer too
    @param {string} blockGasLimitHex - the block gas limit
    @returns {string} - the buffered gas limit as a hex string
  */
  addGasBuffer (initialGasLimitHex, blockGasLimitHex) {
    const initialGasLimitBn = hexToBn(initialGasLimitHex)
    const blockGasLimitBn = hexToBn(blockGasLimitHex)
    const upperGasLimitBn = blockGasLimitBn.muln(0.9)
    const bufferedGasLimitBn = initialGasLimitBn.muln(1.5)

    // if initialGasLimit is above blockGasLimit, dont modify it
    if (initialGasLimitBn.gt(upperGasLimitBn)) {
      return bnToHex(initialGasLimitBn)
    }
    // if bufferedGasLimit is below blockGasLimit, use bufferedGasLimit
    if (bufferedGasLimitBn.lt(upperGasLimitBn)) {
      return bnToHex(bufferedGasLimitBn)
    }
    // otherwise use blockGasLimit
    return bnToHex(upperGasLimitBn)
  }
}

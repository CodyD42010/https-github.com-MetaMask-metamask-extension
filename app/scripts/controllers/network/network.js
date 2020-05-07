import assert from 'assert'
import EventEmitter from 'events'
import ObservableStore from 'obs-store'
import ComposedStore from 'obs-store/lib/composed'
import EthQuery from 'eth-query'
import JsonRpcEngine from 'json-rpc-engine'
import providerFromEngine from 'eth-json-rpc-middleware/providerFromEngine'
import log from 'loglevel'
import createMetamaskMiddleware from './createMetamaskMiddleware'
import createInfuraClient from './createInfuraClient'
import createJsonRpcClient from './createJsonRpcClient'
import createLocalhostClient from './createLocalhostClient'
const createPocketClient = require('./createPocketClient')
const { createSwappableProxy, createEventEmitterProxy } = require('swappable-obj-proxy')
import ethNetProps from 'eth-net-props'
import parse from 'url-parse'
const networks = { networkList: {} }
const { isKnownProvider } = require('../../../../old-ui/app/util')

const {
  ROPSTEN,
  RINKEBY,
  KOVAN,
  MAINNET,
  LOCALHOST,
  POA_SOKOL,
  POA,
  DAI,
  GOERLI_TESTNET,
  CLASSIC,
  RSK,
  RSK_TESTNET,
  POA_CODE,
  DAI_CODE,
  POA_SOKOL_CODE,
  GOERLI_TESTNET_CODE,
  CLASSIC_CODE,
  RSK_CODE,
  RSK_TESTNET_CODE,
} = require('./enums')
const INFURA_PROVIDER_TYPES = [ROPSTEN, RINKEBY, KOVAN, MAINNET]
const POCKET_PROVIDER_TYPES = [ROPSTEN, RINKEBY, KOVAN, MAINNET, POA, DAI, GOERLI_TESTNET, POA_SOKOL]

const env = process.env.METAMASK_ENV
const METAMASK_DEBUG = process.env.METAMASK_DEBUG
const testMode = (METAMASK_DEBUG || env === 'test')

let defaultProviderConfigType
if (process.env.IN_TEST === 'true') {
  defaultProviderConfigType = LOCALHOST
} else if (testMode) {
  defaultProviderConfigType = POA_SOKOL
} else {
  defaultProviderConfigType = POA
}

const defaultProviderConfig = {
  type: defaultProviderConfigType,
}

const defaultNetworkConfig = {
  ticker: 'POA',
}

module.exports = class NetworkController extends EventEmitter {

  constructor (opts = {}) {
    super()

    // parse options
    const providerConfig = opts.provider || defaultProviderConfig
    // create stores
    this.providerStore = new ObservableStore(providerConfig)
    this.networkStore = new ObservableStore('loading')
    this.dProviderStore = new ObservableStore({dProvider: false})
    this.networkConfig = new ObservableStore(defaultNetworkConfig)
    this.store = new ComposedStore({ provider: this.providerStore, network: this.networkStore, settings: this.networkConfig, dProviderStore: this.dProviderStore })
    this.on('networkDidChange', this.lookupNetwork)
    // provider and block tracker
    this._provider = null
    this._blockTracker = null
    // provider and block tracker proxies - because the network changes
    this._providerProxy = null
    this._blockTrackerProxy = null
  }

  initializeProvider (providerParams) {
    this._baseProviderParams = providerParams
    const { type, rpcTarget, chainId, ticker, nickname } = this.providerStore.getState()
    this._configureProvider({ type, rpcTarget, chainId, ticker, nickname })
    this.lookupNetwork()
  }

  // return the proxies so the references will always be good
  getProviderAndBlockTracker () {
    const provider = this._providerProxy
    const blockTracker = this._blockTrackerProxy
    return { provider, blockTracker }
  }

  verifyNetwork () {
    // Check network when restoring connectivity:
    if (this.isNetworkLoading()) {
      this.lookupNetwork()
    }
  }

  getNetworkState () {
    return this.networkStore.getState()
  }

  getNetworkConfig () {
    return this.networkConfig.getState()
  }

  setNetworkState (network, type) {
    if (network === 'loading') {
      return this.networkStore.putState(network)
    }

    // type must be defined
    if (!type) {
      return
    }
    network = networks.networkList[type] && networks.networkList[type].chainId ? networks.networkList[type].chainId : network
    return this.networkStore.putState(network)
  }

  isNetworkLoading () {
    return this.getNetworkState() === 'loading'
  }

  lookupNetwork () {
    // Prevent firing when provider is not defined.
    if (!this._provider) {
      return log.warn('NetworkController - lookupNetwork aborted due to missing provider')
    }
    const { type, rpcTarget } = this.providerStore.getState()
    const ethQuery = new EthQuery(this._provider)
    const initialNetwork = this.getNetworkState()
    ethQuery.sendAsync({ method: 'net_version' }, (err, network) => {
      const targetHost = parse(rpcTarget, true).host
      const classicHost = parse(ethNetProps.RPCEndpoints(CLASSIC_CODE)[0], true).host
      if (type === CLASSIC || targetHost === classicHost) {
        network = CLASSIC_CODE.toString()
      } // workaround to avoid Mainnet and Classic are having the same network ID
      const currentNetwork = this.getNetworkState()
      if (initialNetwork === currentNetwork) {
        if (err) {
          return this.setNetworkState('loading')
        }
        log.info('web3.getNetwork returned ' + network)
        this.setNetworkState(network, type)
      }
    })
  }

  setRpcTarget (rpcTarget, chainId, ticker = 'ETH', nickname = '', rpcPrefs) {
    const providerConfig = {
      type: 'rpc',
      rpcTarget,
      chainId,
      ticker,
      nickname,
      rpcPrefs,
    }
    this.providerConfig = providerConfig
  }

  async setProviderType (type, rpcTarget = '', ticker = 'ETH', nickname = '') {
    assert.notEqual(type, 'rpc', `NetworkController - cannot call "setProviderType" with type 'rpc'. use "setRpcTarget"`)
    assert(isKnownProvider(type), `NetworkController - Unknown rpc type "${type}"`)
    const providerConfig = { type, rpcTarget, ticker, nickname }
    this.providerConfig = providerConfig
  }

  resetConnection () {
    this.providerConfig = this.getProviderConfig()
  }

  set providerConfig (providerConfig) {
    this.providerStore.updateState(providerConfig)
    this._switchNetwork(providerConfig)
  }

  getProviderConfig () {
    return this.providerStore.getState()
  }

  getDProvider () {
    return this.dProviderStore.getState().dProvider
  }

  setDProvider (key) {
    this.dProviderStore.updateState({
      dProvider: key,
    })
  }

  //
  // Private
  //

  _switchNetwork (opts) {
    const previousNetworkID = this.getNetworkState()
    this.setNetworkState('loading')
    this._configureProvider(opts)
    this.emit('networkDidChange', opts.type, previousNetworkID)
  }

  _configureProvider (opts) {
    const { type, rpcTarget, chainId, ticker, nickname } = opts
    // infura type-based endpoints
    const isInfura = INFURA_PROVIDER_TYPES.includes(type)
    // pocket type-based endpointes
    const isPocket = POCKET_PROVIDER_TYPES.includes(type)

    if (!isPocket && this.dProviderStore.getState().dProvider) {
      this.dProviderStore.updateState({
        dProvider: false,
      })
    }

    if (isPocket && this.dProviderStore.getState().dProvider) {
      this._configurePocketProvider(opts)
    } else if (isInfura) {
        this._configureInfuraProvider(opts)
    // other type-based rpc endpoints
    } else if (type === POA) {
      this._configureStandardProvider({ rpcUrl: ethNetProps.RPCEndpoints(POA_CODE)[0], chainId, ticker, nickname })
    } else if (type === DAI) {
      this._configureStandardProvider({ rpcUrl: ethNetProps.RPCEndpoints(DAI_CODE)[0], chainId, ticker, nickname })
    } else if (type === POA_SOKOL) {
      this._configureStandardProvider({ rpcUrl: ethNetProps.RPCEndpoints(POA_SOKOL_CODE)[0], chainId, ticker, nickname })
    } else if (type === GOERLI_TESTNET) {
      this._configureStandardProvider({ rpcUrl: ethNetProps.RPCEndpoints(GOERLI_TESTNET_CODE)[0], chainId, ticker, nickname })
    } else if (type === CLASSIC) {
      this._configureStandardProvider({ rpcUrl: ethNetProps.RPCEndpoints(CLASSIC_CODE)[0], chainId, ticker, nickname })
    } else if (type === RSK) {
      this._configureStandardProvider({ rpcUrl: ethNetProps.RPCEndpoints(RSK_CODE)[0], chainId, ticker, nickname })
    } else if (type === RSK_TESTNET) {
      this._configureStandardProvider({ rpcUrl: ethNetProps.RPCEndpoints(RSK_TESTNET_CODE)[0], chainId, ticker, nickname })
    } else if (type === LOCALHOST) {
      this._configureLocalhostProvider()
    // url-based rpc endpoints
    } else if (type === 'rpc') {
      this._configureStandardProvider({ rpcUrl: rpcTarget, chainId, ticker, nickname })
    } else {
      throw new Error(`NetworkController - _configureProvider - unknown type "${type}"`)
    }
  }

  _configureInfuraProvider ({ type }) {
    log.info('NetworkController - configureInfuraProvider', type)
    const networkClient = createInfuraClient({
      network: type,
    })
    this._setNetworkClient(networkClient)
    // setup networkConfig
    const settings = {
      ticker: 'ETH',
    }
    this.networkConfig.putState(settings)
  }

  _configurePocketProvider ({ type }) {
    log.info('NetworkController - configurePocketProvider', type)
    const networkClient = createPocketClient({ network: type })
    this._setNetworkClient(networkClient)
  }

  _configureLocalhostProvider () {
    log.info('NetworkController - configureLocalhostProvider')
    const networkClient = createLocalhostClient()
    this._setNetworkClient(networkClient)
  }

  _configureStandardProvider ({ rpcUrl, chainId, ticker, nickname }) {
    log.info('NetworkController - configureStandardProvider', rpcUrl)
    const networkClient = createJsonRpcClient({ rpcUrl })
    // hack to add a 'rpc' network with chainId
    networks.networkList['rpc'] = {
      chainId: chainId,
      rpcUrl,
      ticker: ticker || 'ETH',
      nickname,
    }
    // setup networkConfig
    let settings = {
      network: chainId,
    }
    settings = Object.assign(settings, networks.networkList['rpc'])
    this.networkConfig.putState(settings)
    this._setNetworkClient(networkClient)
  }

  _setNetworkClient ({ networkMiddleware, blockTracker }) {
    const metamaskMiddleware = createMetamaskMiddleware(this._baseProviderParams)
    const engine = new JsonRpcEngine()
    engine.push(metamaskMiddleware)
    engine.push(networkMiddleware)
    const provider = providerFromEngine(engine)
    this._setProviderAndBlockTracker({ provider, blockTracker })
  }

  _setProviderAndBlockTracker ({ provider, blockTracker }) {
    // update or intialize proxies
    if (this._providerProxy) {
      this._providerProxy.setTarget(provider)
    } else {
      this._providerProxy = createSwappableProxy(provider)
    }
    if (this._blockTrackerProxy) {
      this._blockTrackerProxy.setTarget(blockTracker)
    } else {
      this._blockTrackerProxy = createEventEmitterProxy(blockTracker, { eventFilter: 'skipInternal' })
    }
    // set new provider and blockTracker
    this._provider = provider
    this._blockTracker = blockTracker
  }
}

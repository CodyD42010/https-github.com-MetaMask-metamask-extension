const assert = require('assert')
const EventEmitter = require('events')
const ObservableStore = require('obs-store')
const ComposedStore = require('obs-store/lib/composed')
const EthQuery = require('eth-query')
const JsonRpcEngine = require('json-rpc-engine')
const providerFromEngine = require('eth-json-rpc-middleware/providerFromEngine')
const log = require('loglevel')
const createMetamaskMiddleware = require('./createMetamaskMiddleware')
const createInfuraClient = require('./createInfuraClient')
const createJsonRpcClient = require('./createJsonRpcClient')
const createLocalhostClient = require('./createLocalhostClient')
const { createSwappableProxy, createEventEmitterProxy } = require('swappable-obj-proxy')
const networks = require('./networks')
const extend = require('xtend')

const {
  ROPSTEN,
  RINKEBY,
  KOVAN,
  MAINNET,
  CLASSIC,
  LOCALHOST,
} = require('./enums')
const INFURA_PROVIDER_TYPES = [ROPSTEN, RINKEBY, KOVAN, MAINNET]
const ALL_PROVIDER_TYPES = [ROPSTEN, RINKEBY, KOVAN, MAINNET, CLASSIC]

const env = process.env.METAMASK_ENV
const METAMASK_DEBUG = process.env.METAMASK_DEBUG
const testMode = (METAMASK_DEBUG || env === 'test')

const defaultProviderConfig = {
  type: testMode ? RINKEBY : MAINNET,
}

const defaultNetworkConfig = {
  ticker: 'ETH',
}

module.exports = class NetworkController extends EventEmitter {

  constructor (opts = {}) {
    super()

    // parse options
    const providerConfig = opts.provider || defaultProviderConfig
    // create stores
    this.providerStore = new ObservableStore(providerConfig)
    this.networkStore = new ObservableStore('loading')
    this.networkConfig = new ObservableStore(defaultNetworkConfig)
    this.store = new ComposedStore({ provider: this.providerStore, network: this.networkStore, settings: this.networkConfig })
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
    const { type, rpcTarget, chainId } = this.providerStore.getState()
    this._configureProvider({ type, rpcTarget, chainId })
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
    if (this.isNetworkLoading()) this.lookupNetwork()
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
    var { type } = this.providerStore.getState()
    const ethQuery = new EthQuery(this._provider)
    ethQuery.sendAsync({ method: 'net_version' }, (err, network) => {
      if (err) return this.setNetworkState('loading')
      log.info('web3.getNetwork returned ' + network)
      this.setNetworkState(network, type)
    })
  }

  setRpcTarget (rpcTarget, chainId) {
    const providerConfig = {
      type: 'rpc',
      rpcTarget,
      chainId,
    }
    this.providerConfig = providerConfig
  }

  async setProviderType (type) {
    assert.notEqual(type, 'rpc', `NetworkController - cannot call "setProviderType" with type 'rpc'. use "setRpcTarget"`)
    assert(ALL_PROVIDER_TYPES.includes(type) || type === LOCALHOST, `NetworkController - Unknown rpc type "${type}"`)
    const providerConfig = { type }
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

  //
  // Private
  //

  _switchNetwork (opts) {
    this.setNetworkState('loading')
    this._configureProvider(opts)
    this.emit('networkDidChange')
  }

  _configureProvider (opts) {
    const { type, rpcTarget, chainId } = opts
    // infura type-based endpoints
    const isInfura = INFURA_PROVIDER_TYPES.includes(type)
    if (isInfura) {
      this._configureInfuraProvider(opts)
    // other predefined endpoints
    } else if (ALL_PROVIDER_TYPES.includes(type)){
      this._configurePredefinedProvider(opts)
    // other type-based rpc endpoints
    } else if (type === LOCALHOST) {
      this._configureLocalhostProvider()
    // url-based rpc endpoints
    } else if (type === 'rpc') {
      this._configureStandardProvider({ rpcUrl: rpcTarget, chainId })
    } else {
      throw new Error(`NetworkController - _configureProvider - unknown type "${type}"`)
    }
  }

  _configureInfuraProvider ({ type }) {
    log.info('NetworkController - configureInfuraProvider', type)
    const networkClient = createInfuraClient({ network: type })
    this._setNetworkClient(networkClient)
    // setup networkConfig
    var settings = {
      ticker: 'ETH',
    }
    this.networkConfig.putState(settings)
  }

  _configureLocalhostProvider () {
    log.info('NetworkController - configureLocalhostProvider')
    const networkClient = createLocalhostClient()
    this._setNetworkClient(networkClient)
  }

  _configurePredefinedProvider ({ type }) {
    log.info('NetworkController - configurePredefinedProvider', type)
    // setup networkConfig
    var settings = {
      network: networks.networkList[type].chainId,
    }
    settings = extend(settings, networks.networkList[type])
    const rpcUrl = networks.networkList[type].rpcUrl
    const networkClient = createJsonRpcClient({ rpcUrl })
    this.networkConfig.putState(settings)
    this._setNetworkClient(networkClient)
  }

  _configureStandardProvider ({ rpcUrl, chainId }) {
    log.info('NetworkController - configureStandardProvider', rpcUrl)
    const networkClient = createJsonRpcClient({ rpcUrl })
    // hack to add a 'rpc' network with chainId
    networks.networkList['rpc'] = {
      chainId: chainId,
      rpcUrl,
      ticker: 'ETH',
    }
    // setup networkConfig
    var settings = {
      network: chainId,
    }
    settings = extend(settings, networks.networkList['rpc'])
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
      this._blockTrackerProxy = createEventEmitterProxy(blockTracker)
    }
    // set new provider and blockTracker
    this._provider = provider
    this._blockTracker = blockTracker
  }

  _logBlock (block) {
    log.info(`BLOCK CHANGED: #${block.number.toString('hex')} 0x${block.hash.toString('hex')}`)
    this.verifyNetwork()
  }
}

/**
 * @file      The central metamask controller. Aggregates other controllers and exports an api.
 * @copyright Copyright (c) 2018 MetaMask
 * @license   MIT
 */

const EventEmitter = require('events')
const extend = require('xtend')
const pump = require('pump')
const Dnode = require('dnode')
const ObservableStore = require('obs-store')
const asStream = require('obs-store/lib/asStream')
const AccountTracker = require('./lib/account-tracker')
const RpcEngine = require('json-rpc-engine')
const debounce = require('debounce')
const createEngineStream = require('json-rpc-middleware-stream/engineStream')
const createFilterMiddleware = require('eth-json-rpc-filters')
const createOriginMiddleware = require('./lib/createOriginMiddleware')
const createLoggerMiddleware = require('./lib/createLoggerMiddleware')
const createProviderMiddleware = require('./lib/createProviderMiddleware')
const setupMultiplex = require('./lib/stream-utils.js').setupMultiplex
const KeyringController = require('eth-keyring-controller')
const NetworkController = require('./controllers/network')
const PreferencesController = require('./controllers/preferences')
const CurrencyController = require('./controllers/currency')
const NoticeController = require('./notice-controller')
const ShapeShiftController = require('./controllers/shapeshift')
const AddressBookController = require('./controllers/address-book')
const InfuraController = require('./controllers/infura')
const BlacklistController = require('./controllers/blacklist')
const RecentBlocksController = require('./controllers/recent-blocks')
const MessageManager = require('./lib/message-manager')
const PersonalMessageManager = require('./lib/personal-message-manager')
const TypedMessageManager = require('./lib/typed-message-manager')
const TransactionController = require('./controllers/transactions')
const BalancesController = require('./controllers/computed-balances')
const ConfigController = require('./controllers/config')
const nodeify = require('./lib/nodeify')
const accountImporter = require('./account-import-strategies')
const getBuyEthUrl = require('./lib/buy-eth-url')
const Mutex = require('await-semaphore').Mutex
const version = require('../manifest.json').version
const BN = require('ethereumjs-util').BN
const GWEI_BN = new BN('1000000000')
const percentile = require('percentile')
const seedPhraseVerifier = require('./lib/seed-phrase-verifier')

module.exports = class MetamaskController extends EventEmitter {

  /**
   * @constructor
   * @param {Object} opts
   */
   constructor (opts) {
    super()

    this.defaultMaxListeners = 20

    this.sendUpdate = debounce(this.privateSendUpdate.bind(this), 200)
    this.opts = opts
    const initState = opts.initState || {}
    this.recordFirstTimeInfo(initState)

    // platform-specific api
    this.platform = opts.platform

    // observable state store
    this.store = new ObservableStore(initState)

    // lock to ensure only one vault created at once
    this.createVaultMutex = new Mutex()

    // network store
    this.networkController = new NetworkController(initState.NetworkController)

    // assorted config
    this.configController = new ConfigController({
      initState: initState.Config,
    })

    // preferences controller
    this.preferencesController = new PreferencesController({
      initState: initState.PreferencesController,
      initLangCode: opts.initLangCode,
    })

    // currency controller
    this.currencyController = new CurrencyController({
      initState: initState.CurrencyController,
    })
    this.currencyController.updateConversionRate()
    this.currencyController.scheduleConversionInterval()

    // infura controller
    this.infuraController = new InfuraController({
      initState: initState.InfuraController,
    })
    this.infuraController.scheduleInfuraNetworkCheck()

    this.blacklistController = new BlacklistController()
    this.blacklistController.scheduleUpdates()

    // rpc provider
    this.provider = this.initializeProvider()
    this.blockTracker = this.provider._blockTracker

    this.recentBlocksController = new RecentBlocksController({
      blockTracker: this.blockTracker,
      provider: this.provider,
    })

    // account tracker watches balances, nonces, and any code at their address.
    this.accountTracker = new AccountTracker({
      provider: this.provider,
      blockTracker: this.blockTracker,
    })

    // key mgmt
    this.keyringController = new KeyringController({
      initState: initState.KeyringController,
      getNetwork: this.networkController.getNetworkState.bind(this.networkController),
      encryptor: opts.encryptor || undefined,
    })

    // If only one account exists, make sure it is selected.
    this.keyringController.memStore.subscribe((state) => {
      const addresses = state.keyrings.reduce((res, keyring) => {
        return res.concat(keyring.accounts)
      }, [])
      if (addresses.length === 1) {
        const address = addresses[0]
        this.preferencesController.setSelectedAddress(address)
      }
      this.accountTracker.syncWithAddresses(addresses)
    })

    // address book controller
    this.addressBookController = new AddressBookController({
      initState: initState.AddressBookController,
    }, this.keyringController)

    // tx mgmt
    this.txController = new TransactionController({
      initState: initState.TransactionController || initState.TransactionManager,
      networkStore: this.networkController.networkStore,
      preferencesStore: this.preferencesController.store,
      txHistoryLimit: 40,
      getNetwork: this.networkController.getNetworkState.bind(this),
      signTransaction: this.keyringController.signTransaction.bind(this.keyringController),
      provider: this.provider,
      blockTracker: this.blockTracker,
      getGasPrice: this.getGasPrice.bind(this),
    })
    this.txController.on('newUnapprovedTx', opts.showUnapprovedTx.bind(opts))

    // computed balances (accounting for pending transactions)
    this.balancesController = new BalancesController({
      accountTracker: this.accountTracker,
      txController: this.txController,
      blockTracker: this.blockTracker,
    })
    this.networkController.on('networkDidChange', () => {
      this.balancesController.updateAllBalances()
    })
    this.balancesController.updateAllBalances()

    // notices
    this.noticeController = new NoticeController({
      initState: initState.NoticeController,
      version,
      firstVersion: initState.firstTimeInfo.version,
    })
    this.noticeController.updateNoticesList()
    // to be uncommented when retrieving notices from a remote server.
    // this.noticeController.startPolling()

    this.shapeshiftController = new ShapeShiftController({
      initState: initState.ShapeShiftController,
    })

    this.networkController.lookupNetwork()
    this.messageManager = new MessageManager()
    this.personalMessageManager = new PersonalMessageManager()
    this.typedMessageManager = new TypedMessageManager()
    this.publicConfigStore = this.initPublicConfigStore()

    // manual disk state subscriptions
    this.txController.store.subscribe((state) => {
      this.store.updateState({ TransactionController: state })
    })
    this.configController.store.subscribe((state) => {
      this.store.updateState({ Config: state })
    })
    this.keyringController.store.subscribe((state) => {
      this.store.updateState({ KeyringController: state })
    })
    this.preferencesController.store.subscribe((state) => {
      this.store.updateState({ PreferencesController: state })
    })
    this.addressBookController.store.subscribe((state) => {
      this.store.updateState({ AddressBookController: state })
    })
    this.currencyController.store.subscribe((state) => {
      this.store.updateState({ CurrencyController: state })
    })
    this.noticeController.store.subscribe((state) => {
      this.store.updateState({ NoticeController: state })
    })
    this.shapeshiftController.store.subscribe((state) => {
      this.store.updateState({ ShapeShiftController: state })
    })
    this.networkController.store.subscribe((state) => {
      this.store.updateState({ NetworkController: state })
    })

    this.infuraController.store.subscribe((state) => {
      this.store.updateState({ InfuraController: state })
    })

    // manual mem state subscriptions
    const sendUpdate = this.sendUpdate.bind(this)
    this.networkController.store.subscribe(sendUpdate)
    this.accountTracker.store.subscribe(sendUpdate)
    this.txController.memStore.subscribe(sendUpdate)
    this.balancesController.store.subscribe(sendUpdate)
    this.messageManager.memStore.subscribe(sendUpdate)
    this.personalMessageManager.memStore.subscribe(sendUpdate)
    this.typedMessageManager.memStore.subscribe(sendUpdate)
    this.keyringController.memStore.subscribe(sendUpdate)
    this.preferencesController.store.subscribe(sendUpdate)
    this.recentBlocksController.store.subscribe(sendUpdate)
    this.addressBookController.store.subscribe(sendUpdate)
    this.currencyController.store.subscribe(sendUpdate)
    this.noticeController.memStore.subscribe(sendUpdate)
    this.shapeshiftController.store.subscribe(sendUpdate)
    this.infuraController.store.subscribe(sendUpdate)
  }

  /**
   * Constructor helper: initialize a provider.
   */
  initializeProvider () {
    const providerOpts = {
      static: {
        eth_syncing: false,
        web3_clientVersion: `MetaMask/v${version}`,
        eth_sendTransaction: (payload, next, end) => {
          const origin = payload.origin
          const txParams = payload.params[0]
          nodeify(this.txController.newUnapprovedTransaction, this.txController)(txParams, { origin }, end)
        },
      },
      // account mgmt
      getAccounts: (cb) => {
        const isUnlocked = this.keyringController.memStore.getState().isUnlocked
        const result = []
        const selectedAddress = this.preferencesController.getSelectedAddress()

        // only show address if account is unlocked
        if (isUnlocked && selectedAddress) {
          result.push(selectedAddress)
        }
        cb(null, result)
      },
      // tx signing
      // old style msg signing
      processMessage: this.newUnsignedMessage.bind(this),
      // personal_sign msg signing
      processPersonalMessage: this.newUnsignedPersonalMessage.bind(this),
      processTypedMessage: this.newUnsignedTypedMessage.bind(this),
    }
    const providerProxy = this.networkController.initializeProvider(providerOpts)
    return providerProxy
  }

  /**
   * Constructor helper: initialize a public config store.
   */
  initPublicConfigStore () {
    // get init state
    const publicConfigStore = new ObservableStore()

    // memStore -> transform -> publicConfigStore
    this.on('update', (memState) => {
      const publicState = selectPublicState(memState)
      publicConfigStore.putState(publicState)
    })

    function selectPublicState (memState) {
      const result = {
        selectedAddress: memState.isUnlocked ? memState.selectedAddress : undefined,
        networkVersion: memState.network,
      }
      return result
    }

    return publicConfigStore
  }

//=============================================================================
// EXPOSED TO THE UI SUBSYSTEM
//=============================================================================

  /**
   * The metamask-state of the various controllers, made available to the UI
   *
   * @returns {Object} status
   */
  getState () {
    const vault = this.keyringController.store.getState().vault
    const isInitialized = !!vault

    return extend(
      {
        isInitialized,
      },
      this.networkController.store.getState(),
      this.accountTracker.store.getState(),
      this.txController.memStore.getState(),
      this.messageManager.memStore.getState(),
      this.personalMessageManager.memStore.getState(),
      this.typedMessageManager.memStore.getState(),
      this.keyringController.memStore.getState(),
      this.balancesController.store.getState(),
      this.preferencesController.store.getState(),
      this.addressBookController.store.getState(),
      this.currencyController.store.getState(),
      this.noticeController.memStore.getState(),
      this.infuraController.store.getState(),
      this.recentBlocksController.store.getState(),
      // config manager
      this.configController.getConfig(),
      this.shapeshiftController.store.getState(),
    )
  }

  /**
   * Returns an api-object which is consumed by the UI
   *
   * @returns {Object}
   */
  getApi () {
    const keyringController = this.keyringController
    const preferencesController = this.preferencesController
    const txController = this.txController
    const noticeController = this.noticeController
    const addressBookController = this.addressBookController
    const networkController = this.networkController

    return {
      // etc
      getState: (cb) => cb(null, this.getState()),
      setCurrentCurrency: this.setCurrentCurrency.bind(this),
      setUseBlockie: this.setUseBlockie.bind(this),
      setCurrentLocale: this.setCurrentLocale.bind(this),
      markPasswordForgotten: this.markPasswordForgotten.bind(this),
      unMarkPasswordForgotten: this.unMarkPasswordForgotten.bind(this),

      // coinbase
      buyEth: this.buyEth.bind(this),
      // shapeshift
      createShapeShiftTx: this.createShapeShiftTx.bind(this),

      // primary HD keyring management
      addNewAccount: nodeify(this.addNewAccount, this),
      placeSeedWords: this.placeSeedWords.bind(this),
      verifySeedPhrase: nodeify(this.verifySeedPhrase, this),
      clearSeedWordCache: this.clearSeedWordCache.bind(this),
      resetAccount: nodeify(this.resetAccount, this),
      importAccountWithStrategy: this.importAccountWithStrategy.bind(this),

      // vault management
      submitPassword: nodeify(keyringController.submitPassword, keyringController),

      // network management
      setNetworkEndpoints: nodeify(networkController.setNetworkEndpoints, networkController),
      setProviderType: nodeify(networkController.setProviderType, networkController),
      setCustomRpc: nodeify(this.setCustomRpc, this),

      // PreferencesController
      setSelectedAddress: nodeify(preferencesController.setSelectedAddress, preferencesController),
      addToken: nodeify(preferencesController.addToken, preferencesController),
      removeToken: nodeify(preferencesController.removeToken, preferencesController),
      setCurrentAccountTab: nodeify(preferencesController.setCurrentAccountTab, preferencesController),
      setFeatureFlag: nodeify(preferencesController.setFeatureFlag, preferencesController),

      // AddressController
      setAddressBook: nodeify(addressBookController.setAddressBook, addressBookController),

      // KeyringController
      setLocked: nodeify(keyringController.setLocked, keyringController),
      createNewVaultAndKeychain: nodeify(this.createNewVaultAndKeychain, this),
      createNewVaultAndRestore: nodeify(this.createNewVaultAndRestore, this),
      addNewKeyring: nodeify(keyringController.addNewKeyring, keyringController),
      saveAccountLabel: nodeify(keyringController.saveAccountLabel, keyringController),
      exportAccount: nodeify(keyringController.exportAccount, keyringController),

      // txController
      cancelTransaction: nodeify(txController.cancelTransaction, txController),
      updateTransaction: nodeify(txController.updateTransaction, txController),
      updateAndApproveTransaction: nodeify(txController.updateAndApproveTransaction, txController),
      retryTransaction: nodeify(this.retryTransaction, this),

      // messageManager
      signMessage: nodeify(this.signMessage, this),
      cancelMessage: this.cancelMessage.bind(this),

      // personalMessageManager
      signPersonalMessage: nodeify(this.signPersonalMessage, this),
      cancelPersonalMessage: this.cancelPersonalMessage.bind(this),

      // personalMessageManager
      signTypedMessage: nodeify(this.signTypedMessage, this),
      cancelTypedMessage: this.cancelTypedMessage.bind(this),

      // notices
      checkNotices: noticeController.updateNoticesList.bind(noticeController),
      markNoticeRead: noticeController.markNoticeRead.bind(noticeController),
    }
  }



//=============================================================================
// VAULT / KEYRING RELATED METHODS
//=============================================================================

  /**
   * Creates a new Vault(?) and create a new keychain(?)
   *
   * A vault is ...
   *
   * A keychain is ...
   *
   *
   * @param  {} password
   *
   * @returns {} vault
   */
  async createNewVaultAndKeychain (password) {
    const release = await this.createVaultMutex.acquire()
    let vault

    try {
      const accounts = await this.keyringController.getAccounts()

      if (accounts.length > 0) {
        vault = await this.keyringController.fullUpdate()

      } else {
        vault = await this.keyringController.createNewVaultAndKeychain(password)
        this.selectFirstIdentity(vault)
      }
      release()
    } catch (err) {
      release()
      throw err
    }

    return vault
  }

  /**
   * Create a new Vault and restore an existent keychain
   * @param  {} password
   * @param  {} seed
   */
  async createNewVaultAndRestore (password, seed) {
    const release = await this.createVaultMutex.acquire()
    try {
      const vault = await this.keyringController.createNewVaultAndRestore(password, seed)
      this.selectFirstIdentity(vault)
      release()
      return vault
    } catch (err) {
      release()
      throw err
    }
  }

  /**
   * Retrieves the first Identiy from the passed Vault and selects the related address
   *
   * An Identity is ...
   *
   * @param  {} vault
   */
  selectFirstIdentity (vault) {
    const { identities } = vault
    const address = Object.keys(identities)[0]
    this.preferencesController.setSelectedAddress(address)
  }

  // ?
  // Opinionated Keyring Management
  //

  /**
   * Adds a new account to ...
   *
   * @returns {} keyState
   */
  async addNewAccount () {
    const primaryKeyring = this.keyringController.getKeyringsByType('HD Key Tree')[0]
    if (!primaryKeyring) {
      throw new Error('MetamaskController - No HD Key Tree found')
    }
    const keyringController = this.keyringController
    const oldAccounts = await keyringController.getAccounts()
    const keyState = await keyringController.addNewAccount(primaryKeyring)
    const newAccounts = await keyringController.getAccounts()

    await this.verifySeedPhrase()

    newAccounts.forEach((address) => {
      if (!oldAccounts.includes(address)) {
        this.preferencesController.setSelectedAddress(address)
      }
    })

    return keyState
  }

  /**
   * Adds the current vault's seed words to the UI's state tree.
   *
   * Used when creating a first vault, to allow confirmation.
   * Also used when revealing the seed words in the confirmation view.
   */
  placeSeedWords (cb) {

    this.verifySeedPhrase()
      .then((seedWords) => {
        this.configController.setSeedWords(seedWords)
        return cb(null, seedWords)
      })
      .catch((err) => {
        return cb(err)
      })
  }

  /**
   * Verifies the validity of the current vault's seed phrase.
   *
   * Validity: seed phrase restores the accounts belonging to the current vault.
   *
   * Called when the first account is created and on unlocking the vault.
   */
  async verifySeedPhrase () {

    const primaryKeyring = this.keyringController.getKeyringsByType('HD Key Tree')[0]
    if (!primaryKeyring) {
      throw new Error('MetamaskController - No HD Key Tree found')
    }

    const serialized = await primaryKeyring.serialize()
    const seedWords = serialized.mnemonic

    const accounts = await primaryKeyring.getAccounts()
    if (accounts.length < 1) {
      throw new Error('MetamaskController - No accounts found')
    }

    try {
      await seedPhraseVerifier.verifyAccounts(accounts, seedWords)
      return seedWords
    } catch (err) {
      log.error(err.message)
      throw err
    }
  }

  /**
   * Remove the primary account seed phrase from the UI's state tree.
   *
   * The seed phrase remains available in the background process.
   *
   */
  clearSeedWordCache (cb) {
    this.configController.setSeedWords(null)
    cb(null, this.preferencesController.getSelectedAddress())
  }

  /**
   * ?
   */
  async resetAccount (cb) {
    const selectedAddress = this.preferencesController.getSelectedAddress()
    this.txController.wipeTransactions(selectedAddress)

    const networkController = this.networkController
    const oldType = networkController.getProviderConfig().type
    await networkController.setProviderType(oldType, true)

    return selectedAddress
  }

  /**
   * Imports an account ... ?
   *
   * @param  {} strategy
   * @param  {} args
   * @param  {} cb
   */
  importAccountWithStrategy (strategy, args, cb) {
    accountImporter.importAccount(strategy, args)
    .then((privateKey) => {
      return this.keyringController.addNewKeyring('Simple Key Pair', [ privateKey ])
    })
    .then(keyring => keyring.getAccounts())
    .then((accounts) => this.preferencesController.setSelectedAddress(accounts[0]))
    .then(() => { cb(null, this.keyringController.fullUpdate()) })
    .catch((reason) => { cb(reason) })
  }

  // ---------------------------------------------------------------------------
  // Identity Management (sign)

  /**
   * @param  {} msgParams
   * @param  {} cb
   */
  signMessage (msgParams, cb) {
    log.info('MetaMaskController - signMessage')
    const msgId = msgParams.metamaskId

    // sets the status op the message to 'approved'
    // and removes the metamaskId for signing
    return this.messageManager.approveMessage(msgParams)
    .then((cleanMsgParams) => {
      // signs the message
      return this.keyringController.signMessage(cleanMsgParams)
    })
    .then((rawSig) => {
      // tells the listener that the message has been signed
      // and can be returned to the dapp
      this.messageManager.setMsgStatusSigned(msgId, rawSig)
      return this.getState()
    })
  }

  // Prefixed Style Message Signing Methods:

  /**
   *
   * @param  {} msgParams
   * @param  {} cb
   */
  approvePersonalMessage (msgParams, cb) {
    const msgId = this.personalMessageManager.addUnapprovedMessage(msgParams)
    this.sendUpdate()
    this.opts.showUnconfirmedMessage()
    this.personalMessageManager.once(`${msgId}:finished`, (data) => {
      switch (data.status) {
        case 'signed':
          return cb(null, data.rawSig)
        case 'rejected':
          return cb(new Error('MetaMask Message Signature: User denied transaction signature.'))
        default:
          return cb(new Error(`MetaMask Message Signature: Unknown problem: ${JSON.stringify(msgParams)}`))
      }
    })
  }

  /**
   * @param  {} msgParams
   */
  signPersonalMessage (msgParams) {
    log.info('MetaMaskController - signPersonalMessage')
    const msgId = msgParams.metamaskId
    // sets the status op the message to 'approved'
    // and removes the metamaskId for signing
    return this.personalMessageManager.approveMessage(msgParams)
    .then((cleanMsgParams) => {
      // signs the message
      return this.keyringController.signPersonalMessage(cleanMsgParams)
    })
    .then((rawSig) => {
      // tells the listener that the message has been signed
      // and can be returned to the dapp
      this.personalMessageManager.setMsgStatusSigned(msgId, rawSig)
      return this.getState()
    })
  }

  /**
   * @param  {} msgParams
   */
  signTypedMessage (msgParams) {
    log.info('MetaMaskController - signTypedMessage')
    const msgId = msgParams.metamaskId
    // sets the status op the message to 'approved'
    // and removes the metamaskId for signing
    return this.typedMessageManager.approveMessage(msgParams)
      .then((cleanMsgParams) => {
        // signs the message
        return this.keyringController.signTypedMessage(cleanMsgParams)
      })
      .then((rawSig) => {
        // tells the listener that the message has been signed
        // and can be returned to the dapp
        this.typedMessageManager.setMsgStatusSigned(msgId, rawSig)
        return this.getState()
      })
  }

  // ---------------------------------------------------------------------------
  // Account Restauration

  /**
   * ?
   *
   * @param  {} migratorOutput
   */
  restoreOldVaultAccounts (migratorOutput) {
    const { serialized } = migratorOutput
    return this.keyringController.restoreKeyring(serialized)
    .then(() => migratorOutput)
  }

//=============================================================================
// END (VAULT / KEYRING RELATED METHODS)
//=============================================================================

//

//=============================================================================
// MESSAGES
//=============================================================================

  async retryTransaction (txId, cb) {
    await this.txController.retryTransaction(txId)
    const state = await this.getState()
    return state
  }


  newUnsignedMessage (msgParams, cb) {
    const msgId = this.messageManager.addUnapprovedMessage(msgParams)
    this.sendUpdate()
    this.opts.showUnconfirmedMessage()
    this.messageManager.once(`${msgId}:finished`, (data) => {
      switch (data.status) {
        case 'signed':
          return cb(null, data.rawSig)
        case 'rejected':
          return cb(new Error('MetaMask Message Signature: User denied message signature.'))
        default:
          return cb(new Error(`MetaMask Message Signature: Unknown problem: ${JSON.stringify(msgParams)}`))
      }
    })
  }

  newUnsignedPersonalMessage (msgParams, cb) {
    if (!msgParams.from) {
      return cb(new Error('MetaMask Message Signature: from field is required.'))
    }

    const msgId = this.personalMessageManager.addUnapprovedMessage(msgParams)
    this.sendUpdate()
    this.opts.showUnconfirmedMessage()
    this.personalMessageManager.once(`${msgId}:finished`, (data) => {
      switch (data.status) {
        case 'signed':
          return cb(null, data.rawSig)
        case 'rejected':
          return cb(new Error('MetaMask Message Signature: User denied message signature.'))
        default:
          return cb(new Error(`MetaMask Message Signature: Unknown problem: ${JSON.stringify(msgParams)}`))
      }
    })
  }

  newUnsignedTypedMessage (msgParams, cb) {
    let msgId
    try {
      msgId = this.typedMessageManager.addUnapprovedMessage(msgParams)
      this.sendUpdate()
      this.opts.showUnconfirmedMessage()
    } catch (e) {
      return cb(e)
    }

    this.typedMessageManager.once(`${msgId}:finished`, (data) => {
      switch (data.status) {
        case 'signed':
          return cb(null, data.rawSig)
        case 'rejected':
          return cb(new Error('MetaMask Message Signature: User denied message signature.'))
        default:
          return cb(new Error(`MetaMask Message Signature: Unknown problem: ${JSON.stringify(msgParams)}`))
      }
    })
  }

  cancelMessage (msgId, cb) {
    const messageManager = this.messageManager
    messageManager.rejectMsg(msgId)
    if (cb && typeof cb === 'function') {
      cb(null, this.getState())
    }
  }

  cancelPersonalMessage (msgId, cb) {
    const messageManager = this.personalMessageManager
    messageManager.rejectMsg(msgId)
    if (cb && typeof cb === 'function') {
      cb(null, this.getState())
    }
  }

  cancelTypedMessage (msgId, cb) {
    const messageManager = this.typedMessageManager
    messageManager.rejectMsg(msgId)
    if (cb && typeof cb === 'function') {
      cb(null, this.getState())
    }
  }

  markPasswordForgotten(cb) {
    this.configController.setPasswordForgotten(true)
    this.sendUpdate()
    cb()
  }

  unMarkPasswordForgotten(cb) {
    this.configController.setPasswordForgotten(false)
    this.sendUpdate()
    cb()
  }

//=============================================================================
// SETUP
//=============================================================================

  setupUntrustedCommunication (connectionStream, originDomain) {
    // Check if new connection is blacklisted
    if (this.blacklistController.checkForPhishing(originDomain)) {
      log.debug('MetaMask - sending phishing warning for', originDomain)
      this.sendPhishingWarning(connectionStream, originDomain)
      return
    }

    // setup multiplexing
    const mux = setupMultiplex(connectionStream)
    // connect features
    this.setupProviderConnection(mux.createStream('provider'), originDomain)
    this.setupPublicConfig(mux.createStream('publicConfig'))
  }

  setupTrustedCommunication (connectionStream, originDomain) {
    // setup multiplexing
    const mux = setupMultiplex(connectionStream)
    // connect features
    this.setupControllerConnection(mux.createStream('controller'))
    this.setupProviderConnection(mux.createStream('provider'), originDomain)
  }

  sendPhishingWarning (connectionStream, hostname) {
    const mux = setupMultiplex(connectionStream)
    const phishingStream = mux.createStream('phishing')
    phishingStream.write({ hostname })
  }

  setupControllerConnection (outStream) {
    const api = this.getApi()
    const dnode = Dnode(api)
    pump(
      outStream,
      dnode,
      outStream,
      (err) => {
        if (err) log.error(err)
      }
    )
    dnode.on('remote', (remote) => {
      // push updates to popup
      const sendUpdate = remote.sendUpdate.bind(remote)
      this.on('update', sendUpdate)
    })
  }

  setupProviderConnection (outStream, origin) {
    // setup json rpc engine stack
    const engine = new RpcEngine()

    // create filter polyfill middleware
    const filterMiddleware = createFilterMiddleware({
      provider: this.provider,
      blockTracker: this.provider._blockTracker,
    })

    engine.push(createOriginMiddleware({ origin }))
    engine.push(createLoggerMiddleware({ origin }))
    engine.push(filterMiddleware)
    engine.push(createProviderMiddleware({ provider: this.provider }))

    // setup connection
    const providerStream = createEngineStream({ engine })
    pump(
      outStream,
      providerStream,
      outStream,
      (err) => {
        // cleanup filter polyfill middleware
        filterMiddleware.destroy()
        if (err) log.error(err)
      }
    )
  }

  setupPublicConfig (outStream) {
    pump(
      asStream(this.publicConfigStore),
      outStream,
      (err) => {
        if (err) log.error(err)
      }
    )
  }

  privateSendUpdate () {
    this.emit('update', this.getState())
  }

  getGasPrice () {
    const { recentBlocksController } = this
    const { recentBlocks } = recentBlocksController.store.getState()

    // Return 1 gwei if no blocks have been observed:
    if (recentBlocks.length === 0) {
      return '0x' + GWEI_BN.toString(16)
    }

    const lowestPrices = recentBlocks.map((block) => {
      if (!block.gasPrices || block.gasPrices.length < 1) {
        return GWEI_BN
      }
      return block.gasPrices
      .map(hexPrefix => hexPrefix.substr(2))
      .map(hex => new BN(hex, 16))
      .sort((a, b) => {
        return a.gt(b) ? 1 : -1
      })[0]
    })
    .map(number => number.div(GWEI_BN).toNumber())

    const percentileNum = percentile(50, lowestPrices)
    const percentileNumBn = new BN(percentileNum)
    return '0x' + percentileNumBn.mul(GWEI_BN).toString(16)
  }

//=============================================================================
// CONFIG
//=============================================================================

  // Log blocks

  setCurrentCurrency (currencyCode, cb) {
    try {
      this.currencyController.setCurrentCurrency(currencyCode)
      this.currencyController.updateConversionRate()
      const data = {
        conversionRate: this.currencyController.getConversionRate(),
        currentCurrency: this.currencyController.getCurrentCurrency(),
        conversionDate: this.currencyController.getConversionDate(),
      }
      cb(null, data)
    } catch (err) {
      cb(err)
    }
  }

  buyEth (address, amount) {
    if (!amount) amount = '5'
    const network = this.networkController.getNetworkState()
    const url = getBuyEthUrl({ network, address, amount })
    if (url) this.platform.openWindow({ url })
  }

  createShapeShiftTx (depositAddress, depositType) {
    this.shapeshiftController.createShapeShiftTx(depositAddress, depositType)
  }

  // network

  async setCustomRpc (rpcTarget, rpcList) {
    this.networkController.setRpcTarget(rpcTarget)
    await this.preferencesController.updateFrequentRpcList(rpcTarget)
    return rpcTarget
  }

  setUseBlockie (val, cb) {
    try {
      this.preferencesController.setUseBlockie(val)
      cb(null)
    } catch (err) {
      cb(err)
    }
  }

  setCurrentLocale (key, cb) {
    try {
      this.preferencesController.setCurrentLocale(key)
      cb(null)
    } catch (err) {
      cb(err)
    }
  }

  recordFirstTimeInfo (initState) {
    if (!('firstTimeInfo' in initState)) {
      initState.firstTimeInfo = {
        version,
        date: Date.now(),
      }
    }
  }

}

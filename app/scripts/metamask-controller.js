const EventEmitter = require('events')
const extend = require('xtend')
const EthStore = require('./lib/eth-store')
const MetaMaskProvider = require('web3-provider-engine/zero.js')
const KeyringController = require('./keyring-controller')
const NoticeController = require('./notice-controller')
const messageManager = require('./lib/message-manager')
const TxManager = require('./transaction-manager')
const HostStore = require('./lib/remote-store.js').HostStore
const Web3 = require('web3')
const ConfigManager = require('./lib/config-manager')
const extension = require('./lib/extension')
const autoFaucet = require('./lib/auto-faucet')
const nodeify = require('./lib/nodeify')
const IdStoreMigrator = require('./lib/idStore-migrator')
const accountImporter = require('./account-import-strategies')
const version = require('../manifest.json').version
const ObservableStore = require('./lib/observable-store')

module.exports = class MetamaskController extends EventEmitter {

  constructor (opts) {
    super()
    this.opts = opts
    this.state = { network: 'loading' }

    // Observable wrapper around persistence strategy,
    // also caches the current state, so reads
    // can be synchronous, allows us to  avoid
    // race conditions related to late reads.
    this.configStore = new ObservableStore(opts.initState)
    this.configStore.subscribe(opts.setData)

    const confManagerOpts = {
      loadData: this.configStore.get.bind(this.configStore),
      setData: opts.setData,
    }
    this.configManager = new ConfigManager(confManagerOpts)
    this.configManager.subscribe((state) => {
      this.configStore.put(state)
    })

    this.keyringController = new KeyringController({
      configManager: this.configManager,
      getNetwork: this.getStateNetwork.bind(this),
    })
    // notices
    this.noticeController = new NoticeController({
      configManager: this.configManager,
    })
    this.noticeController.updateNoticesList()
    // to be uncommented when retrieving notices from a remote server.
    // this.noticeController.startPolling()
    this.provider = this.initializeProvider(opts)
    this.ethStore = new EthStore(this.provider)
    this.keyringController.setStore(this.ethStore)
    this.getNetwork()
    this.messageManager = messageManager
    this.txManager = new TxManager({
      txList: this.configManager.getTxList(),
      txHistoryLimit: 40,
      setTxList: this.configManager.setTxList.bind(this.configManager),
      getSelectedAccount: this.configManager.getSelectedAccount.bind(this.configManager),
      getGasMultiplier: this.configManager.getGasMultiplier.bind(this.configManager),
      getNetwork: this.getStateNetwork.bind(this),
      signTransaction: this.keyringController.signTransaction.bind(this.keyringController),
      provider: this.provider,
      blockTracker: this.provider,
    })
    this.publicConfigStore = this.initPublicConfigStore()

    var currentFiat = this.configManager.getCurrentFiat() || 'USD'
    this.configManager.setCurrentFiat(currentFiat)
    this.configManager.updateConversionRate()

    this.checkTOSChange()

    this.scheduleConversionInterval()

    // TEMPORARY UNTIL FULL DEPRECATION:
    this.idStoreMigrator = new IdStoreMigrator({
      configManager: this.configManager,
    })

    this.ethStore.on('update', this.sendUpdate.bind(this))
    this.keyringController.on('update', this.sendUpdate.bind(this))
    this.txManager.on('update', this.sendUpdate.bind(this))
  }

  getState () {
    return this.keyringController.getState()
    .then((keyringControllerState) => {
      return extend(
        this.state,
        this.ethStore.getState(),
        this.configManager.getConfig(),
        this.txManager.getState(),
        keyringControllerState,
        this.noticeController.getState(), {
          lostAccounts: this.configManager.getLostAccounts(),
        }
      )
    })
  }

  getApi () {
    const keyringController = this.keyringController
    const txManager = this.txManager
    const noticeController = this.noticeController

    return {
      getState: nodeify(this.getState.bind(this)),
      setRpcTarget: this.setRpcTarget.bind(this),
      setProviderType: this.setProviderType.bind(this),
      useEtherscanProvider: this.useEtherscanProvider.bind(this),
      agreeToDisclaimer: this.agreeToDisclaimer.bind(this),
      resetDisclaimer: this.resetDisclaimer.bind(this),
      setCurrentFiat: this.setCurrentFiat.bind(this),
      setTOSHash: this.setTOSHash.bind(this),
      checkTOSChange: this.checkTOSChange.bind(this),
      setGasMultiplier: this.setGasMultiplier.bind(this),
      markAccountsFound: this.markAccountsFound.bind(this),

      // forward directly to keyringController
      createNewVaultAndKeychain: nodeify(keyringController.createNewVaultAndKeychain).bind(keyringController),
      createNewVaultAndRestore: nodeify(keyringController.createNewVaultAndRestore).bind(keyringController),
      placeSeedWords: nodeify(keyringController.placeSeedWords).bind(keyringController),
      clearSeedWordCache: nodeify(keyringController.clearSeedWordCache).bind(keyringController),
      setLocked: nodeify(keyringController.setLocked).bind(keyringController),
      submitPassword: (password, cb) => {
        this.migrateOldVaultIfAny(password)
        .then(keyringController.submitPassword.bind(keyringController, password))
        .then((newState) => { cb(null, newState) })
        .catch((reason) => { cb(reason) })
      },
      addNewKeyring: (type, opts, cb) => {
        keyringController.addNewKeyring(type, opts)
        .then(() => keyringController.fullUpdate())
        .then((newState) => { cb(null, newState) })
        .catch((reason) => { cb(reason) })
      },
      importAccountWithStrategy: (strategy, args, cb) => {
        accountImporter.importAccount(strategy, args)
        .then((privateKey) => {
          return keyringController.addNewKeyring('Simple Key Pair', [ privateKey ])
        })
        .then(keyring => keyring.getAccounts())
        .then((accounts) => keyringController.setSelectedAccount(accounts[0]))
        .then(() => { cb(null, keyringController.fullUpdate()) })
        .catch((reason) => { cb(reason) })
      },
      addNewAccount: nodeify(keyringController.addNewAccount).bind(keyringController),
      setSelectedAccount: nodeify(keyringController.setSelectedAccount).bind(keyringController),
      saveAccountLabel: nodeify(keyringController.saveAccountLabel).bind(keyringController),
      exportAccount: nodeify(keyringController.exportAccount).bind(keyringController),

      // signing methods
      approveTransaction: txManager.approveTransaction.bind(txManager),
      cancelTransaction: txManager.cancelTransaction.bind(txManager),
      signMessage: keyringController.signMessage.bind(keyringController),
      cancelMessage: keyringController.cancelMessage.bind(keyringController),

      // coinbase
      buyEth: this.buyEth.bind(this),
      // shapeshift
      createShapeShiftTx: this.createShapeShiftTx.bind(this),
      // notices
      checkNotices: noticeController.updateNoticesList.bind(noticeController),
      markNoticeRead: noticeController.markNoticeRead.bind(noticeController),
    }
  }

  setupProviderConnection (stream, originDomain) {
    stream.on('data', this.onRpcRequest.bind(this, stream, originDomain))
  }

  onRpcRequest (stream, originDomain, request) {
    // handle rpc request
    this.provider.sendAsync(request, function onPayloadHandled (err, response) {
      logger(err, request, response)
      if (response) {
        try {
          stream.write(response)
        } catch (err) {
          logger(err)
        }
      }
    })

    function logger (err, request, response) {
      if (err) return console.error(err)
      if (!request.isMetamaskInternal) {
        if (global.METAMASK_DEBUG) {
          console.log(`RPC (${originDomain}):`, request, '->', response)
        }
        if (response.error) {
          console.error('Error in RPC response:\n', response.error)
        }
      }
    }
  }

  sendUpdate () {
    this.getState()
    .then((state) => {
      this.emit('update', state)
    })
  }

  initializeProvider (opts) {
    const keyringController = this.keyringController

    var providerOpts = {
      static: {
        eth_syncing: false,
        web3_clientVersion: `MetaMask/v${version}`,
      },
      rpcUrl: this.configManager.getCurrentRpcAddress(),
      // account mgmt
      getAccounts: (cb) => {
        var selectedAccount = this.configManager.getSelectedAccount()
        var result = selectedAccount ? [selectedAccount] : []
        cb(null, result)
      },
      // tx signing
      processTransaction: (txParams, cb) => this.newUnapprovedTransaction(txParams, cb),
      // msg signing
      approveMessage: this.newUnsignedMessage.bind(this),
      signMessage: (...args) => {
        keyringController.signMessage(...args)
        this.sendUpdate()
      },
    }

    var provider = MetaMaskProvider(providerOpts)
    var web3 = new Web3(provider)
    this.web3 = web3
    keyringController.web3 = web3
    provider.on('block', this.processBlock.bind(this))
    provider.on('error', this.getNetwork.bind(this))

    return provider
  }

  initPublicConfigStore () {
    // get init state
    var initPublicState = configToPublic(this.configManager.getConfig())
    var publicConfigStore = new HostStore(initPublicState)

    // subscribe to changes
    this.configManager.subscribe(function (state) {
      storeSetFromObj(publicConfigStore, configToPublic(state))
    })

    this.keyringController.on('newAccount', (account) => {
      autoFaucet(account)
    })

    // config substate
    function configToPublic (state) {
      return {
        selectedAccount: state.selectedAccount,
      }
    }
    // dump obj into store
    function storeSetFromObj (store, obj) {
      Object.keys(obj).forEach(function (key) {
        store.set(key, obj[key])
      })
    }

    return publicConfigStore
  }

  newUnapprovedTransaction (txParams, cb) {
    const self = this
    self.txManager.addUnapprovedTransaction(txParams, (err, txMeta) => {
      if (err) return cb(err)
      self.sendUpdate()
      self.opts.showUnapprovedTx(txMeta)
      // listen for tx completion (success, fail)
      self.txManager.once(`${txMeta.id}:finished`, (status) => {
        switch (status) {
          case 'submitted':
            return cb(null, txMeta.hash)
          case 'rejected':
            return cb(new Error('MetaMask Tx Signature: User denied transaction signature.'))
          default:
            return cb(new Error(`MetaMask Tx Signature: Unknown problem: ${JSON.stringify(txMeta.txParams)}`))
        }
      })
    })
  }

  newUnsignedMessage (msgParams, cb) {
    var state = this.keyringController.getState()
    if (!state.isUnlocked) {
      this.keyringController.addUnconfirmedMessage(msgParams, cb)
      this.opts.unlockAccountMessage()
    } else {
      this.addUnconfirmedMessage(msgParams, cb)
      this.sendUpdate()
    }
  }

  addUnconfirmedMessage (msgParams, cb) {
    const keyringController = this.keyringController
    const msgId = keyringController.addUnconfirmedMessage(msgParams, cb)
    this.opts.showUnconfirmedMessage(msgParams, msgId)
  }

  setupPublicConfig (stream) {
    var storeStream = this.publicConfigStore.createStream()
    stream.pipe(storeStream).pipe(stream)
  }

  // Log blocks
  processBlock (block) {
    if (global.METAMASK_DEBUG) {
      console.log(`BLOCK CHANGED: #${block.number.toString('hex')} 0x${block.hash.toString('hex')}`)
    }
    this.verifyNetwork()
  }

  verifyNetwork () {
    // Check network when restoring connectivity:
    if (this.state.network === 'loading') {
      this.getNetwork()
    }
  }

  // config
  //

  setTOSHash (hash) {
    try {
      this.configManager.setTOSHash(hash)
    } catch (err) {
      console.error('Error in setting terms of service hash.')
    }
  }

  checkTOSChange () {
    try {
      const storedHash = this.configManager.getTOSHash() || 0
      if (storedHash !== global.TOS_HASH) {
        this.resetDisclaimer()
        this.setTOSHash(global.TOS_HASH)
      }
    } catch (err) {
      console.error('Error in checking TOS change.')
    }
  }

  // disclaimer

  agreeToDisclaimer (cb) {
    try {
      this.configManager.setConfirmedDisclaimer(true)
      cb()
    } catch (err) {
      cb(err)
    }
  }

  resetDisclaimer () {
    try {
      this.configManager.setConfirmedDisclaimer(false)
    } catch (e) {
      console.error(e)
    }
  }

  setCurrentFiat (fiat, cb) {
    try {
      this.configManager.setCurrentFiat(fiat)
      this.configManager.updateConversionRate()
      this.scheduleConversionInterval()
      const data = {
        conversionRate: this.configManager.getConversionRate(),
        currentFiat: this.configManager.getCurrentFiat(),
        conversionDate: this.configManager.getConversionDate(),
      }
      cb(data)
    } catch (err) {
      cb(null, err)
    }
  }

  scheduleConversionInterval () {
    if (this.conversionInterval) {
      clearInterval(this.conversionInterval)
    }
    this.conversionInterval = setInterval(() => {
      this.configManager.updateConversionRate()
    }, 300000)
  }

  // called from popup
  setRpcTarget (rpcTarget) {
    this.configManager.setRpcTarget(rpcTarget)
    extension.runtime.reload()
    this.getNetwork()
  }

  setProviderType (type) {
    this.configManager.setProviderType(type)
    extension.runtime.reload()
    this.getNetwork()
  }

  useEtherscanProvider () {
    this.configManager.useEtherscanProvider()
    extension.runtime.reload()
  }

  buyEth (address, amount) {
    if (!amount) amount = '5'

    var network = this.state.network
    var url = `https://buy.coinbase.com/?code=9ec56d01-7e81-5017-930c-513daa27bb6a&amount=${amount}&address=${address}&crypto_currency=ETH`

    if (network === '3') {
      url = 'https://faucet.metamask.io/'
    }

    extension.tabs.create({
      url,
    })
  }

  createShapeShiftTx (depositAddress, depositType) {
    this.configManager.createShapeShiftTx(depositAddress, depositType)
  }

  getNetwork (err) {
    if (err) {
      this.state.network = 'loading'
      this.sendUpdate()
    }

    this.web3.version.getNetwork((err, network) => {
      if (err) {
        this.state.network = 'loading'
        return this.sendUpdate()
      }
      if (global.METAMASK_DEBUG) {
        console.log('web3.getNetwork returned ' + network)
      }
      this.state.network = network
      this.sendUpdate()
    })
  }

  setGasMultiplier (gasMultiplier, cb) {
    try {
      this.configManager.setGasMultiplier(gasMultiplier)
      cb()
    } catch (err) {
      cb(err)
    }
  }

  getStateNetwork () {
    return this.state.network
  }

  markAccountsFound (cb) {
    this.configManager.setLostAccounts([])
    this.sendUpdate()
    cb(null, this.getState())
  }

  // Migrate Old Vault If Any
  // @string password
  //
  // returns Promise()
  //
  // Temporary step used when logging in.
  // Checks if old style (pre-3.0.0) Metamask Vault exists.
  // If so, persists that vault in the new vault format
  // with the provided password, so the other unlock steps
  // may be completed without interruption.
  migrateOldVaultIfAny (password) {

    if (!this.checkIfShouldMigrate()) {
      return Promise.resolve(password)
    }

    const keyringController = this.keyringController

    return this.idStoreMigrator.migratedVaultForPassword(password)
    .then(this.restoreOldVaultAccounts.bind(this))
    .then(this.restoreOldLostAccounts.bind(this))
    .then(keyringController.persistAllKeyrings.bind(keyringController, password))
    .then(() => password)
  }

  checkIfShouldMigrate() {
    return !!this.configManager.getWallet() && !this.configManager.getVault()
  }

  restoreOldVaultAccounts(migratorOutput) {
    const { serialized } = migratorOutput
    return this.keyringController.restoreKeyring(serialized)
    .then(() => migratorOutput)
  }

  restoreOldLostAccounts(migratorOutput) {
    const { lostAccounts } = migratorOutput
    if (lostAccounts) {
      this.configManager.setLostAccounts(lostAccounts.map(acct => acct.address))
      return this.importLostAccounts(migratorOutput)
    }
    return Promise.resolve(migratorOutput)
  }

  // IMPORT LOST ACCOUNTS
  // @Object with key lostAccounts: @Array accounts <{ address, privateKey }>
  // Uses the array's private keys to create a new Simple Key Pair keychain
  // and add it to the keyring controller.
  importLostAccounts ({ lostAccounts }) {
    const privKeys = lostAccounts.map(acct => acct.privateKey)
    return this.keyringController.restoreKeyring({
      type: 'Simple Key Pair',
      data: privKeys,
    })
  }
}

const ethUtil = require('ethereumjs-util')
const bip39 = require('bip39')
const EventEmitter = require('events').EventEmitter
const filter = require('promise-filter')
const encryptor = require('browser-passworder')

const normalize = require('./lib/sig-util').normalize
const messageManager = require('./lib/message-manager')
const BN = ethUtil.BN

// Keyrings:
const SimpleKeyring = require('./keyrings/simple')
const HdKeyring = require('./keyrings/hd')
const keyringTypes = [
  SimpleKeyring,
  HdKeyring,
]

const createId = require('./lib/random-id')

module.exports = class KeyringController extends EventEmitter {

  // PUBLIC METHODS
  //
  // THE FIRST SECTION OF METHODS ARE PUBLIC-FACING,
  // MEANING THEY ARE USED BY CONSUMERS OF THIS CLASS.
  //
  // THEIR SURFACE AREA SHOULD BE CHANGED WITH GREAT CARE.

  constructor (opts) {
    super()
    this.configManager = opts.configManager
    this.ethStore = opts.ethStore
    this.encryptor = encryptor
    this.keyringTypes = keyringTypes
    this.keyrings = []
    this.identities = {} // Essentially a name hash

    this._unconfMsgCbs = {}

    this.getNetwork = opts.getNetwork
  }

  // Set Store
  //
  // Allows setting the ethStore after the constructor.
  // This is currently required because of the initialization order
  // of the ethStore and this class.
  //
  // Eventually would be nice to be able to add this in the constructor.
  setStore (ethStore) {
    this.ethStore = ethStore
  }

  // Full Update
  // returns Promise( @object state )
  //
  // Emits the `update` event and
  // returns a Promise that resolves to the current state.
  //
  // Frequently used to end asynchronous chains in this class,
  // indicating consumers can often either listen for updates,
  // or accept a state-resolving promise to consume their results.
  //
  // Not all methods end with this, that might be a nice refactor.
  fullUpdate () {
    this.emit('update')
    return Promise.resolve(this.getState())
  }

  // Get State
  // returns @object state
  //
  // This method returns a hash representing the current state
  // that the keyringController manages.
  //
  // It is extended in the MetamaskController along with the EthStore
  // state, and its own state, to create the metamask state branch
  // that is passed to the UI.
  //
  // This is currently a rare example of a synchronously resolving method
  // in this class, but will need to be Promisified when we move our
  // persistence to an async model.
  getState () {
    const configManager = this.configManager
    const address = configManager.getSelectedAccount()
    const wallet = configManager.getWallet() // old style vault
    const vault = configManager.getVault() // new style vault
    const keyrings = this.keyrings

    return Promise.all(keyrings.map(this.displayForKeyring))
    .then((displayKeyrings) => {
      return {
        seedWords: this.configManager.getSeedWords(),
        isInitialized: (!!wallet || !!vault),
        isUnlocked: Boolean(this.password),
        isDisclaimerConfirmed: this.configManager.getConfirmedDisclaimer(),
        unconfMsgs: messageManager.unconfirmedMsgs(),
        messages: messageManager.getMsgList(),
        selectedAccount: address,
        shapeShiftTxList: this.configManager.getShapeShiftTxList(),
        currentFiat: this.configManager.getCurrentFiat(),
        conversionRate: this.configManager.getConversionRate(),
        conversionDate: this.configManager.getConversionDate(),
        keyringTypes: this.keyringTypes.map(krt => krt.type),
        identities: this.identities,
        keyrings: displayKeyrings,
      }
    })
  }

  // Create New Vault And Keychain
  // @string password - The password to encrypt the vault with
  //
  // returns Promise( @object state )
  //
  // Destroys any old encrypted storage,
  // creates a new encrypted store with the given password,
  // randomly creates a new HD wallet with 1 account,
  // faucets that account on the testnet.
  createNewVaultAndKeychain (password) {
    return this.persistAllKeyrings(password)
    .then(this.createFirstKeyTree.bind(this))
    .then(this.fullUpdate.bind(this))
  }

  // CreateNewVaultAndRestore
  // @string password - The password to encrypt the vault with
  // @string seed - The BIP44-compliant seed phrase.
  //
  // returns Promise( @object state )
  //
  // Destroys any old encrypted storage,
  // creates a new encrypted store with the given password,
  // creates a new HD wallet from the given seed with 1 account.
  createNewVaultAndRestore (password, seed) {
    if (typeof password !== 'string') {
      return Promise.reject('Password must be text.')
    }

    if (!bip39.validateMnemonic(seed)) {
      return Promise.reject('Seed phrase is invalid.')
    }

    this.clearKeyrings()

    return this.persistAllKeyrings(password)
    .then(() => {
      return this.addNewKeyring('HD Key Tree', {
        mnemonic: seed,
        numberOfAccounts: 1,
      })
    }).then(() => {
      const firstKeyring = this.keyrings[0]
      return firstKeyring.getAccounts()
    })
    .then((accounts) => {
      const firstAccount = accounts[0]
      const hexAccount = normalize(firstAccount)
      this.configManager.setSelectedAccount(hexAccount)
      return this.setupAccounts(accounts)
    })
    .then(this.persistAllKeyrings.bind(this, password))
    .then(this.fullUpdate.bind(this))
  }

  // PlaceSeedWords
  // returns Promise( @object state )
  //
  // Adds the current vault's seed words to the UI's state tree.
  //
  // Used when creating a first vault, to allow confirmation.
  // Also used when revealing the seed words in the confirmation view.
  placeSeedWords () {
    const hdKeyrings = this.keyrings.filter((keyring) => keyring.type === 'HD Key Tree')
    const firstKeyring = hdKeyrings[0]
    if (!firstKeyring) throw new Error('KeyringController - No HD Key Tree found')
    return firstKeyring.serialize()
    .then((serialized) => {
      const seedWords = serialized.mnemonic
      this.configManager.setSeedWords(seedWords)
      return this.fullUpdate()
    })
  }

  // ClearSeedWordCache
  //
  // returns Promise( @string currentSelectedAccount )
  //
  // Removes the current vault's seed words from the UI's state tree,
  // ensuring they are only ever available in the background process.
  clearSeedWordCache () {
    this.configManager.setSeedWords(null)
    return Promise.resolve(this.configManager.getSelectedAccount())
  }

  // Set Locked
  // returns Promise( @object state )
  //
  // This method deallocates all secrets, and effectively locks metamask.
  setLocked () {
    this.password = null
    this.keyrings = []
    return this.fullUpdate()
  }

  // Submit Password
  // @string password
  //
  // returns Promise( @object state )
  //
  // Attempts to decrypt the current vault and load its keyrings
  // into memory.
  //
  // Temporarily also migrates any old-style vaults first, as well.
  // (Pre MetaMask 3.0.0)
  submitPassword (password) {
    return this.unlockKeyrings(password)
    .then((keyrings) => {
      this.keyrings = keyrings
      return this.fullUpdate()
    })
  }

  // Add New Keyring
  // @string type
  // @object opts
  //
  // returns Promise( @Keyring keyring )
  //
  // Adds a new Keyring of the given `type` to the vault
  // and the current decrypted Keyrings array.
  //
  // All Keyring classes implement a unique `type` string,
  // and this is used to retrieve them from the keyringTypes array.
  addNewKeyring (type, opts) {
    const Keyring = this.getKeyringClassForType(type)
    const keyring = new Keyring(opts)
    return keyring.deserialize(opts)
    .then(() => {
      return keyring.getAccounts()
    })
    .then((accounts) => {
      this.keyrings.push(keyring)
      return this.setupAccounts(accounts)
    })
    .then(() => { return this.password })
    .then(this.persistAllKeyrings.bind(this))
    .then(() => {
      return keyring
    })
  }

  // Add New Account
  // @number keyRingNum
  //
  // returns Promise( @object state )
  //
  // Calls the `addAccounts` method on the Keyring
  // in the kryings array at index `keyringNum`,
  // and then saves those changes.
  addNewAccount (keyRingNum = 0) {
    const ring = this.keyrings[keyRingNum]
    return ring.addAccounts(1)
    .then(this.setupAccounts.bind(this))
    .then(this.persistAllKeyrings.bind(this))
    .then(this.fullUpdate.bind(this))
  }

  // Set Selected Account
  // @string address
  //
  // returns Promise( @string address )
  //
  // Sets the state's `selectedAccount` value
  // to the specified address.
  setSelectedAccount (address) {
    var addr = normalize(address)
    this.configManager.setSelectedAccount(addr)
    return this.fullUpdate()
  }

  // Save Account Label
  // @string account
  // @string label
  //
  // returns Promise( @string label )
  //
  // Persists a nickname equal to `label` for the specified account.
  saveAccountLabel (account, label) {
    const address = normalize(account)
    const configManager = this.configManager
    configManager.setNicknameForWallet(address, label)
    this.identities[address].name = label
    return Promise.resolve(label)
  }

  // Export Account
  // @string address
  //
  // returns Promise( @string privateKey )
  //
  // Requests the private key from the keyring controlling
  // the specified address.
  //
  // Returns a Promise that may resolve with the private key string.
  exportAccount (address) {
    try {
      return this.getKeyringForAccount(address)
      .then((keyring) => {
        return keyring.exportAccount(normalize(address))
      })
    } catch (e) {
      return Promise.reject(e)
    }
  }


  // SIGNING METHODS
  //
  // This method signs tx and returns a promise for
  // TX Manager to update the state after signing

  signTransaction (ethTx, _fromAddress) {
    const fromAddress = normalize(_fromAddress)
    return this.getKeyringForAccount(fromAddress)
    .then((keyring) => {
      return keyring.signTransaction(fromAddress, ethTx)
    })
  }
  // Add Unconfirmed Message
  // @object msgParams
  // @function cb
  //
  // Does not call back, only emits an `update` event.
  //
  // Adds the given `msgParams` and `cb` to a local cache,
  // for displaying to a user for approval before signing or canceling.
  addUnconfirmedMessage (msgParams, cb) {
    // create txData obj with parameters and meta data
    var time = (new Date()).getTime()
    var msgId = createId()
    var msgData = {
      id: msgId,
      msgParams: msgParams,
      time: time,
      status: 'unconfirmed',
    }
    messageManager.addMsg(msgData)
    console.log('addUnconfirmedMessage:', msgData)

    // keep the cb around for after approval (requires user interaction)
    // This cb fires completion to the Dapp's write operation.
    this._unconfMsgCbs[msgId] = cb

    // signal update
    this.emit('update')
    return msgId
  }

  // Cancel Message
  // @string msgId
  // @function cb (optional)
  //
  // Calls back to cached `unconfMsgCb`.
  // Calls back to `cb` if provided.
  //
  // Forgets any messages matching `msgId`.
  cancelMessage (msgId, cb) {
    var approvalCb = this._unconfMsgCbs[msgId] || noop

    // reject tx
    approvalCb(null, false)
    // clean up
    messageManager.rejectMsg(msgId)
    delete this._unconfTxCbs[msgId]

    if (cb && typeof cb === 'function') {
      cb()
    }
  }

  // Sign Message
  // @object msgParams
  // @function cb
  //
  // returns Promise(@buffer rawSig)
  // calls back @function cb with @buffer rawSig
  // calls back cached Dapp's @function unconfMsgCb.
  //
  // Attempts to sign the provided @object msgParams.
  signMessage (msgParams, cb) {
    try {
      const msgId = msgParams.metamaskId
      delete msgParams.metamaskId
      const approvalCb = this._unconfMsgCbs[msgId] || noop

      const address = normalize(msgParams.from)
      return this.getKeyringForAccount(address)
      .then((keyring) => {
        return keyring.signMessage(address, msgParams.data)
      }).then((rawSig) => {
        cb(null, rawSig)
        approvalCb(null, true)
        messageManager.confirmMsg(msgId)
        return rawSig
      })
    } catch (e) {
      cb(e)
    }
  }

  // PRIVATE METHODS
  //
  // THESE METHODS ARE ONLY USED INTERNALLY TO THE KEYRING-CONTROLLER
  // AND SO MAY BE CHANGED MORE LIBERALLY THAN THE ABOVE METHODS.

  // Create First Key Tree
  // returns @Promise
  //
  // Clears the vault,
  // creates a new one,
  // creates a random new HD Keyring with 1 account,
  // makes that account the selected account,
  // faucets that account on testnet,
  // puts the current seed words into the state tree.
  createFirstKeyTree () {
    this.clearKeyrings()
    return this.addNewKeyring('HD Key Tree', {numberOfAccounts: 1})
    .then(() => {
      return this.keyrings[0].getAccounts()
    })
    .then((accounts) => {
      const firstAccount = accounts[0]
      const hexAccount = normalize(firstAccount)
      this.configManager.setSelectedAccount(hexAccount)
      this.emit('newAccount', hexAccount)
      return this.setupAccounts(accounts)
    }).then(() => {
      return this.placeSeedWords()
    })
    .then(this.persistAllKeyrings.bind(this))
  }

  // Setup Accounts
  // @array accounts
  //
  // returns @Promise(@object account)
  //
  // Initializes the provided account array
  // Gives them numerically incremented nicknames,
  // and adds them to the ethStore for regular balance checking.
  setupAccounts (accounts) {
    return this.getAccounts()
    .then((loadedAccounts) => {
      const arr = accounts || loadedAccounts
      return Promise.all(arr.map((account) => {
        return this.getBalanceAndNickname(account)
      }))
    })
  }

  // Get Balance And Nickname
  // @string account
  //
  // returns Promise( @string label )
  //
  // Takes an account address and an iterator representing
  // the current number of named accounts.
  getBalanceAndNickname (account) {
    if (!account) {
      throw new Error('Problem loading account.')
    }
    const address = normalize(account)
    this.ethStore.addAccount(address)
    return this.createNickname(address)
  }

  // Create Nickname
  // @string address
  //
  // returns Promise( @string label )
  //
  // Takes an address, and assigns it an incremented nickname, persisting it.
  createNickname (address) {
    const hexAddress = normalize(address)
    var i = Object.keys(this.identities).length
    const oldNickname = this.configManager.nicknameForWallet(address)
    const name = oldNickname || `Account ${++i}`
    this.identities[hexAddress] = {
      address: hexAddress,
      name,
    }
    return this.saveAccountLabel(hexAddress, name)
  }

  // Persist All Keyrings
  // @password string
  //
  // returns Promise
  //
  // Iterates the current `keyrings` array,
  // serializes each one into a serialized array,
  // encrypts that array with the provided `password`,
  // and persists that encrypted string to storage.
  persistAllKeyrings (password = this.password) {
    if (typeof password === 'string') {
      this.password = password
    }
    return Promise.all(this.keyrings.map((keyring) => {
      return Promise.all([keyring.type, keyring.serialize()])
      .then((serializedKeyringArray) => {
        // Label the output values on each serialized Keyring:
        return {
          type: serializedKeyringArray[0],
          data: serializedKeyringArray[1],
        }
      })
    }))
    .then((serializedKeyrings) => {
      return this.encryptor.encrypt(this.password, serializedKeyrings)
    })
    .then((encryptedString) => {
      this.configManager.setVault(encryptedString)
      return true
    })
  }

  // Unlock Keyrings
  // @string password
  //
  // returns Promise( @array keyrings )
  //
  // Attempts to unlock the persisted encrypted storage,
  // initializing the persisted keyrings to RAM.
  unlockKeyrings (password) {
    const encryptedVault = this.configManager.getVault()
    if (!encryptedVault) {
      throw new Error('Cannot unlock without a previous vault.')
    }

    return this.encryptor.decrypt(password, encryptedVault)
    .then((vault) => {
      this.password = password
      vault.forEach(this.restoreKeyring.bind(this))
      return this.keyrings
    })
  }

  // Restore Keyring
  // @object serialized
  //
  // returns Promise( @Keyring deserialized )
  //
  // Attempts to initialize a new keyring from the provided
  // serialized payload.
  //
  // On success, returns the resulting @Keyring instance.
  restoreKeyring (serialized) {
    const { type, data } = serialized

    const Keyring = this.getKeyringClassForType(type)
    const keyring = new Keyring()
    return keyring.deserialize(data)
    .then(() => {
      return keyring.getAccounts()
    })
    .then((accounts) => {
      return this.setupAccounts(accounts)
    })
    .then(() => {
      this.keyrings.push(keyring)
      return keyring
    })
  }

  // Get Keyring Class For Type
  // @string type
  //
  // Returns @class Keyring
  //
  // Searches the current `keyringTypes` array
  // for a Keyring class whose unique `type` property
  // matches the provided `type`,
  // returning it if it exists.
  getKeyringClassForType (type) {
    return this.keyringTypes.find(kr => kr.type === type)
  }

  // Get Accounts
  // returns Promise( @Array[ @string accounts ] )
  //
  // Returns the public addresses of all current accounts
  // managed by all currently unlocked keyrings.
  getAccounts () {
    const keyrings = this.keyrings || []
    return Promise.all(keyrings.map(kr => kr.getAccounts()))
    .then((keyringArrays) => {
      return keyringArrays.reduce((res, arr) => {
        return res.concat(arr)
      }, [])
    })
  }

  // Get Keyring For Account
  // @string address
  //
  // returns Promise(@Keyring keyring)
  //
  // Returns the currently initialized keyring that manages
  // the specified `address` if one exists.
  getKeyringForAccount (address) {
    const hexed = normalize(address)

    return Promise.all(this.keyrings.map((keyring) => {
      return Promise.all([
        keyring,
        keyring.getAccounts(),
      ])
    }))
    .then(filter((candidate) => {
      const accounts = candidate[1].map(normalize)
      return accounts.includes(hexed)
    }))
    .then((winners) => {
      if (winners && winners.length > 0) {
        return winners[0][0]
      } else {
        throw new Error('No keyring found for the requested account.')
      }
    })
  }

  // Display For Keyring
  // @Keyring keyring
  //
  // returns Promise( @Object { type:String, accounts:Array } )
  //
  // Is used for adding the current keyrings to the state object.
  displayForKeyring (keyring) {
    return keyring.getAccounts()
    .then((accounts) => {
      return {
        type: keyring.type,
        accounts: accounts,
      }
    })
  }

  // Add Gas Buffer
  // @string gas (as hexadecimal value)
  //
  // returns @string bufferedGas (as hexadecimal value)
  //
  // Adds a healthy buffer of gas to an initial gas estimate.
  addGasBuffer (gas) {
    const gasBuffer = new BN('100000', 10)
    const bnGas = new BN(ethUtil.stripHexPrefix(gas), 16)
    const correct = bnGas.add(gasBuffer)
    return ethUtil.addHexPrefix(correct.toString(16))
  }

  // Clear Keyrings
  //
  // Deallocates all currently managed keyrings and accounts.
  // Used before initializing a new vault.
  clearKeyrings () {
    let accounts
    try {
      accounts = Object.keys(this.ethStore._currentState.accounts)
    } catch (e) {
      accounts = []
    }
    accounts.forEach((address) => {
      this.ethStore.removeAccount(address)
    })

    this.keyrings = []
    this.identities = {}
    this.configManager.setSelectedAccount()
  }

}


function noop () {}

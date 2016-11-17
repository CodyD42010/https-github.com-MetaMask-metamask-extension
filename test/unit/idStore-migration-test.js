const async = require('async')
const assert = require('assert')
const ethUtil = require('ethereumjs-util')
const BN = ethUtil.BN
const ConfigManager = require('../../app/scripts/lib/config-manager')
const delegateCallCode = require('../lib/example-code.json').delegateCallCode

// The old way:
const IdentityStore = require('../../app/scripts/lib/idStore')
const STORAGE_KEY = 'metamask-config'
const extend = require('xtend')

// The new ways:
var KeyringController = require('../../app/scripts/keyring-controller')
const mockEncryptor = require('../lib/mock-encryptor')
const MockSimpleKeychain = require('../lib/mock-simple-keychain')
const sinon = require('sinon')

const mockVault = {
  seed: 'picnic injury awful upper eagle junk alert toss flower renew silly vague',
  account: '0x5d8de92c205279c10e5669f797b853ccef4f739a',
}

describe('IdentityStore to KeyringController migration', function() {

  // The stars of the show:
  let idStore, keyringController, seedWords, configManager

  let password = 'password123'
  let entropy = 'entripppppyy duuude'
  let accounts = []
  let newAccounts = []
  let originalKeystore

  // This is a lot of setup, I know!
  // We have to create an old style vault, populate it,
  // and THEN create a new one, before we can run tests on it.
  beforeEach(function(done) {
    this.sinon = sinon.sandbox.create()
    window.localStorage = {} // Hacking localStorage support into JSDom
    configManager = new ConfigManager({
      loadData,
      setData: (d) => { window.localStorage = d }
    })


    idStore = new IdentityStore({
      configManager: configManager,
      ethStore: {
        addAccount(acct) { accounts.push(ethUtil.addHexPrefix(acct)) },
        del(acct) { delete accounts[acct] },
      },
    })

    idStore._createVault(password, mockVault.seed, null, (err) => {
      assert.ifError(err, 'createNewVault threw error')
      originalKeystore = idStore._idmgmt.keyStore

      idStore.setLocked((err) => {
        assert.ifError(err, 'createNewVault threw error')
        keyringController = new KeyringController({
          configManager,
          ethStore: {
            addAccount(acct) { newAccounts.push(ethUtil.addHexPrefix(acct)) },
            del(acct) { delete newAccounts[acct] },
          },
        })

        // Stub out the browser crypto for a mock encryptor.
        // Browser crypto is tested in the integration test suite.
        keyringController.encryptor = mockEncryptor
        done()
      })
    })
  })

  describe('entering a password', function() {
    it('should identify an old wallet as an initialized keyring', function() {
      keyringController.configManager.setWallet('something')
      const state = keyringController.getState()
      assert(state.isInitialized, 'old vault counted as initialized.')
    })

    /*
    it('should use the password to migrate the old vault', function(done) {
      this.timeout(5000)
      console.log('calling submitPassword')
      console.dir(keyringController)
      keyringController.submitPassword(password, function (err, state) {
        assert.ifError(err, 'submitPassword threw error')

        function log(str, dat) { console.log(str + ': ' + JSON.stringify(dat)) }

        let newAccounts = keyringController.getAccounts()
        log('new accounts: ', newAccounts)

        let newAccount = ethUtil.addHexPrefix(newAccounts[0])
        assert.equal(ethUtil.addHexPrefix(newAccount), mockVault.account, 'restored the correct account')
        const newSeed = keyringController.keyrings[0].mnemonic
        log('keyringController keyrings', keyringController.keyrings)
        assert.equal(newSeed, mockVault.seed, 'seed phrase transferred.')

        assert(configManager.getVault(), 'new type of vault is persisted')
        done()
      })
    })
    */

  })
})

function loadData () {
  var oldData = getOldStyleData()
  var newData
  try {
    newData = JSON.parse(window.localStorage[STORAGE_KEY])
  } catch (e) {}

  var data = extend({
    meta: {
      version: 0,
    },
    data: {
      config: {
        provider: {
          type: 'testnet',
        },
      },
    },
  }, oldData || null, newData || null)
  return data
}

function setData (data) {
  window.localStorage[STORAGE_KEY] = JSON.stringify(data)
}

function getOldStyleData () {
  var config, wallet, seedWords

  var result = {
    meta: { version: 0 },
    data: {},
  }

  try {
    config = JSON.parse(window.localStorage['config'])
    result.data.config = config
  } catch (e) {}
  try {
    wallet = JSON.parse(window.localStorage['lightwallet'])
    result.data.wallet = wallet
  } catch (e) {}
  try {
    seedWords = window.localStorage['seedWords']
    result.data.seedWords = seedWords
  } catch (e) {}

  return result
}

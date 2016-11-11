const EventEmitter = require('events').EventEmitter
const Wallet = require('ethereumjs-wallet')
const ethUtil = require('ethereumjs-util')
const type = 'Simple Key Pair'
const sigUtil = require('../lib/sig-util')

module.exports = class SimpleKeyring extends EventEmitter {

  static type () {
    return type
  }

  constructor (opts) {
    super()
    this.type = type
    this.opts = opts || {}
    this.wallets = []
  }

  serialize () {
    return this.wallets.map(w => w.getPrivateKey().toString('hex'))
  }

  deserialize (wallets = []) {
    this.wallets = wallets.map((w) => {
      var b = new Buffer(w, 'hex')
      const wallet = Wallet.fromPrivateKey(b)
      return wallet
    })
  }

  addAccounts (n = 1) {
    var newWallets = []
    for (var i = 0; i < n; i++) {
      newWallets.push(Wallet.generate())
    }
    this.wallets = this.wallets.concat(newWallets)
    return newWallets.map(w => w.getAddress().toString('hex'))
  }

  getAccounts () {
    return this.wallets.map(w => w.getAddress().toString('hex'))
  }

  // tx is an instance of the ethereumjs-transaction class.
  signTransaction (address, tx) {
    const wallet = this.getWalletForAccount(address)
    var privKey = wallet.getPrivateKey()
    tx.sign(privKey)
    return tx
  }

  // For eth_sign, we need to sign transactions:
  signMessage (withAccount, data) {
    const wallet = this.getWalletForAccount(withAccount)
    const message = ethUtil.removeHexPrefix(data)
    var privKey = wallet.getPrivateKey()
    var msgSig = ethUtil.ecsign(new Buffer(message, 'hex'), privKey)
    var rawMsgSig = ethUtil.bufferToHex(sigUtil.concatSig(msgSig.v, msgSig.r, msgSig.s))
    return rawMsgSig
  }

  getWalletForAccount (account) {
    return this.wallets.find(w => w.getAddress().toString('hex') === account)
  }

}

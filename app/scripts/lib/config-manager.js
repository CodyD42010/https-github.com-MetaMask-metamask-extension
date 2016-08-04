const Migrator = require('pojo-migrator')
const MetamaskConfig = require('../config.js')
const migrations = require('./migrations')

const TESTNET_RPC = MetamaskConfig.network.testnet
const MAINNET_RPC = MetamaskConfig.network.mainnet
const CLASSIC_RPC = MetamaskConfig.network.classic

/* The config-manager is a convenience object
 * wrapping a pojo-migrator.
 *
 * It exists mostly to allow the creation of
 * convenience methods to access and persist
 * particular portions of the state.
 */
module.exports = ConfigManager
function ConfigManager (opts) {
  // ConfigManager is observable and will emit updates
  this._subs = []

  /* The migrator exported on the config-manager
   * has two methods the user should be concerned with:
   *
   * getData(), which returns the app-consumable data object
   * saveData(), which persists the app-consumable data object.
   */
  this.migrator = new Migrator({

    // Migrations must start at version 1 or later.
    // They are objects with a `version` number
    // and a `migrate` function.
    //
    // The `migrate` function receives the previous
    // config data format, and returns the new one.
    migrations: migrations,

    // How to load initial config.
    // Includes step on migrating pre-pojo-migrator data.
    loadData: opts.loadData,

    // How to persist migrated config.
    setData: opts.setData,
  })
}

ConfigManager.prototype.setConfig = function (config) {
  var data = this.migrator.getData()
  data.config = config
  this.setData(data)
  this._emitUpdates(config)
}

ConfigManager.prototype.getConfig = function () {
  var data = this.migrator.getData()
  if ('config' in data) {
    return data.config
  } else {
    return {
      provider: {
        type: 'testnet',
      },
    }
  }
}

ConfigManager.prototype.setRpcTarget = function (rpcUrl) {
  var config = this.getConfig()
  config.provider = {
    type: 'rpc',
    rpcTarget: rpcUrl,
  }
  this.setConfig(config)
}

ConfigManager.prototype.setProviderType = function (type) {
  var config = this.getConfig()
  config.provider = {
    type: type,
  }
  this.setConfig(config)
}

ConfigManager.prototype.useEtherscanProvider = function () {
  var config = this.getConfig()
  config.provider = {
    type: 'etherscan',
  }
  this.setConfig(config)
}

ConfigManager.prototype.getProvider = function () {
  var config = this.getConfig()
  return config.provider
}

ConfigManager.prototype.setData = function (data) {
  this.migrator.saveData(data)
}

ConfigManager.prototype.getData = function () {
  return this.migrator.getData()
}

ConfigManager.prototype.setWallet = function (wallet) {
  var data = this.migrator.getData()
  data.wallet = wallet
  this.setData(data)
}

ConfigManager.prototype.getSelectedAccount = function () {
  var config = this.getConfig()
  return config.selectedAccount
}

ConfigManager.prototype.setSelectedAccount = function (address) {
  var config = this.getConfig()
  config.selectedAccount = address
  this.setConfig(config)
}

ConfigManager.prototype.getWallet = function () {
  return this.migrator.getData().wallet
}

// Takes a boolean
ConfigManager.prototype.setShowSeedWords = function (should) {
  var data = this.migrator.getData()
  data.showSeedWords = should
  this.setData(data)
}

ConfigManager.prototype.getShouldShowSeedWords = function () {
  var data = this.migrator.getData()
  return data.showSeedWords
}

ConfigManager.prototype.getCurrentRpcAddress = function () {
  var provider = this.getProvider()
  if (!provider) return null
  switch (provider.type) {

    case 'mainnet':
      return MAINNET_RPC

    case 'testnet':
      return TESTNET_RPC

    case 'classic':
      return CLASSIC_RPC

    default:
      return provider && provider.rpcTarget ? provider.rpcTarget : TESTNET_RPC
  }
}

ConfigManager.prototype.setData = function (data) {
  this.migrator.saveData(data)
}

//
// Tx
//

ConfigManager.prototype.getTxList = function () {
  var data = this.migrator.getData()
  if (data.transactions !== undefined) {
    return data.transactions
  } else {
    return []
  }
}

ConfigManager.prototype.unconfirmedTxs = function () {
  var transactions = this.getTxList()
  return transactions.filter(tx => tx.status === 'unconfirmed')
  .reduce((result, tx) => { result[tx.id] = tx; return result }, {})
}

ConfigManager.prototype._saveTxList = function (txList) {
  var data = this.migrator.getData()
  data.transactions = txList
  this.setData(data)
}

ConfigManager.prototype.addTx = function (tx) {
  var transactions = this.getTxList()
  transactions.push(tx)
  this._saveTxList(transactions)
}

ConfigManager.prototype.getTx = function (txId) {
  var transactions = this.getTxList()
  var matching = transactions.filter(tx => tx.id === txId)
  return matching.length > 0 ? matching[0] : null
}

ConfigManager.prototype.confirmTx = function (txId) {
  this._setTxStatus(txId, 'confirmed')
}

ConfigManager.prototype.rejectTx = function (txId) {
  this._setTxStatus(txId, 'rejected')
}

ConfigManager.prototype._setTxStatus = function (txId, status) {
  var tx = this.getTx(txId)
  tx.status = status
  this.updateTx(tx)
}

ConfigManager.prototype.updateTx = function (tx) {
  var transactions = this.getTxList()
  var found, index
  transactions.forEach((otherTx, i) => {
    if (otherTx.id === tx.id) {
      found = true
      index = i
    }
  })
  if (found) {
    transactions[index] = tx
  }
  this._saveTxList(transactions)
}

// wallet nickname methods

ConfigManager.prototype.getWalletNicknames = function () {
  var data = this.getData()
  const nicknames = ('walletNicknames' in data) ? data.walletNicknames : {}
  return nicknames
}

ConfigManager.prototype.nicknameForWallet = function (account) {
  const nicknames = this.getWalletNicknames()
  return nicknames[account]
}

ConfigManager.prototype.setNicknameForWallet = function (account, nickname) {
  const nicknames = this.getWalletNicknames()
  nicknames[account] = nickname
  var data = this.getData()
  data.walletNicknames = nicknames
  this.setData(data)
}

// observable

ConfigManager.prototype.subscribe = function (fn) {
  this._subs.push(fn)
  var unsubscribe = this.unsubscribe.bind(this, fn)
  return unsubscribe
}

ConfigManager.prototype.unsubscribe = function (fn) {
  var index = this._subs.indexOf(fn)
  if (index !== -1) this._subs.splice(index, 1)
}

ConfigManager.prototype._emitUpdates = function (state) {
  this._subs.forEach(function (handler) {
    handler(state)
  })
}

ConfigManager.prototype.setConfirmed = function (confirmed) {
  var data = this.getData()
  data.isConfirmed = confirmed
  this.setData(data)
}

ConfigManager.prototype.getConfirmed = function () {
  var data = this.getData()
  return ('isConfirmed' in data) && data.isConfirmed
}

ConfigManager.prototype.setShouldntShowWarning = function (confirmed) {
  var data = this.getData()
  data.isEthConfirmed = confirmed
  this.setData(data)
}

ConfigManager.prototype.getShouldntShowWarning = function () {
  var data = this.getData()
  return ('isEthConfirmed' in data) && data.isEthConfirmed
}

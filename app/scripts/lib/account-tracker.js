/* Account Tracker
 *
 * This module is responsible for tracking any number of accounts
 * and caching their current balances & transaction counts.
 *
 * It also tracks transaction hashes, and checks their inclusion status
 * on each new block.
 */

import EthQuery from '../eth-query'
import ObservableStore from 'obs-store'
import log from 'loglevel'
import pify from 'pify'
import Conflux from 'js-conflux-sdk/src/Conflux'
import SINGLE_CALL_BALANCES_ABI from '../controllers/cfx-single-call-balance-checker-abi.js'

import { bnToHex } from './util'
import { SINGLE_CALL_BALANCES_ADDRESS } from '../controllers/network/contract-addresses'

class AccountTracker {
  /**
   * This module is responsible for tracking any number of accounts and caching their current balances & transaction
   * counts.
   *
   * It also tracks transaction hashes, and checks their inclusion status on each new block.
   *
   * @typedef {Object} AccountTracker
   * @param {Object} opts - Initialize various properties of the class.
   * @property {Object} store The stored object containing all accounts to track, as well as the current block's gas limit.
   * @property {Object} store.accounts The accounts currently stored in this AccountTracker
   * @property {string} store.currentBlockGasLimit A hex string indicating the gas limit of the current block
   * @property {Object} _provider A provider needed to create the EthQuery instance used within this AccountTracker.
   * @property {EthQuery} _query An EthQuery instance used to access account information from the blockchain
   * @property {BlockTracker} _blockTracker A BlockTracker instance. Needed to ensure that accounts and their info updates
   * when a new block is created.
   * @property {Object} _currentBlockNumber Reference to a property on the _blockTracker: the number (i.e. an id) of the the current block
   *
   */
  constructor(opts = {}) {
    const initState = {
      accounts: {},
      currentBlockGasLimit: '',
    }
    this.store = new ObservableStore(initState)

    this._provider = opts.provider
    this._query = pify(new EthQuery(this._provider))
    this._blockTracker = opts.blockTracker
    // blockTracker.currentBlock may be null
    this._currentBlockNumber = this._blockTracker.getCurrentBlock()
    this._blockTracker.once('latest', blockNumber => {
      this._currentBlockNumber = blockNumber
    })
    // bind function for easier listener syntax
    this._updateForBlock = this._updateForBlock.bind(this)
    this.network = opts.network

    this.cfx = new Conflux({ url: this._provider._confluxWebProvider.url })
    this.cfx.networkId = parseInt(this.network.getNetworkConfig().network, 10)
  }

  start() {
    // remove first to avoid double add
    this._blockTracker.removeListener('latest', this._updateForBlock)
    // add listener
    this._blockTracker.addListener('latest', this._updateForBlock)
    // fetch account balances
    this._updateAccounts()
  }

  stop() {
    // remove listener
    this._blockTracker.removeListener('latest', this._updateForBlock)
  }

  /**
   * Ensures that the locally stored accounts are in sync with a set of accounts stored externally to this
   * AccountTracker.
   *
   * Once this AccountTracker's accounts are up to date with those referenced by the passed addresses, each
   * of these accounts are given an updated balance via EthQuery.
   *
   * @param {array} address - The array of hex addresses for accounts with which this AccountTracker's accounts should be
   * in sync
   *
   */
  syncWithAddresses(addresses) {
    const accounts = this.store.getState().accounts
    const locals = Object.keys(accounts)

    const accountsToAdd = []
    addresses.forEach(upstream => {
      if (!locals.includes(upstream)) {
        accountsToAdd.push(upstream)
      }
    })

    const accountsToRemove = []
    locals.forEach(local => {
      if (!addresses.includes(local)) {
        accountsToRemove.push(local)
      }
    })

    this.addAccounts(accountsToAdd)
    this.removeAccount(accountsToRemove)
  }

  /**
   * Adds new addresses to track the balances of
   * given a balance as long this._currentBlockNumber is defined.
   *
   * @param {array} addresses - An array of hex addresses of new accounts to track
   *
   */
  addAccounts(addresses) {
    const accounts = this.store.getState().accounts
    // add initial state for addresses
    addresses.forEach(address => {
      accounts[address] = {}
    })
    // save accounts state
    this.store.updateState({ accounts })
    // fetch balances for the accounts if there is block number ready
    if (!this._currentBlockNumber) {
      return
    }
    this._updateAccounts()
  }

  /**
   * Removes accounts from being tracked
   *
   * @param {array} an - array of hex addresses to stop tracking
   *
   */
  removeAccount(addresses) {
    const accounts = this.store.getState().accounts
    // remove each state object
    addresses.forEach(address => {
      delete accounts[address]
    })
    // save accounts state
    this.store.updateState({ accounts })
  }

  /**
   * Given a block, updates this AccountTracker's currentBlockGasLimit, and then updates each local account's balance
   * via EthQuery
   *
   * @private
   * @param {number} blockNumber - the block number to update to.
   * @fires 'block' The updated state, if all account updates are successful
   *
   */
  async _updateForBlock(blockNumber) {
    this._currentBlockNumber = blockNumber

    // block gasLimit polling shouldn't be in account-tracker shouldn't be here...
    const currentBlock = await this._query.getBlockByNumber(blockNumber, false)
    if (!currentBlock) {
      return
    }
    const currentBlockGasLimit = currentBlock.gasLimit
    this.store.updateState({ currentBlockGasLimit })

    try {
      await this._updateAccounts()
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * balanceChecker is deployed on main eth (test)nets and requires a single call
   * for all other networks, calls this._updateAccount for each account in this.store
   *
   * @returns {Promise} - after all account balances updated
   *
   */
  async _updateAccounts() {
    const accounts = this.store.getState().accounts
    const addresses = Object.keys(accounts)

    await this._updateAccountsViaBalanceChecker(
      addresses,
      SINGLE_CALL_BALANCES_ADDRESS
    )
  }

  /**
   * Updates the current balance of an account.
   *
   * @private
   * @param {string} address - A hex address of a the account to be updated
   * @returns {Promise} - after the account balance is updated
   *
   */
  async _updateAccount(address) {
    // query balance
    const balance = await this._query.getBalance(address, 'latest_state')
    const result = { address, balance }
    // update accounts state
    const { accounts } = this.store.getState()
    // only populate if the entry is still present
    if (!accounts[address]) {
      return
    }
    accounts[address] = result
    this.store.updateState({ accounts })
  }

  /**
   * Updates current address balances from balanceChecker deployed contract instance
   * @param {*} addresses
   * @param {*} deployedContractAddress
   */
  async _updateAccountsViaBalanceChecker(addresses, deployedContractAddress) {
    const accounts = this.store.getState().accounts
    this.cfx.provider.url = this._provider._confluxWebProvider.url
    this.cfx.networkId = parseInt(this.network.getNetworkConfig().network, 10)
    const ethContract = this.cfx.Contract({
      abi: SINGLE_CALL_BALANCES_ABI,
      address: deployedContractAddress,
    })
    const ethBalance = ['0x0000000000000000000000000000000000000000']
    let result
    try {
      result = await ethContract.balances(addresses, ethBalance)
    } catch (err) {}

    if (!result) {
      return Promise.all(addresses.map(this._updateAccount.bind(this)))
    }

    addresses.forEach((address, index) => {
      const rst = result[index]
      if (rst || typeof rst === 'bigint') {
        const balance = bnToHex(rst)
        accounts[address] = { address, balance }
      }
    })
    this.store.updateState({ accounts })
  }
}

export default AccountTracker

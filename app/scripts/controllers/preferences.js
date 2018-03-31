const ObservableStore = require('obs-store')
const normalizeAddress = require('eth-sig-util').normalize
const extend = require('xtend')

class PreferencesController {

  constructor (opts = {}) {
    const initState = extend({
      frequentRpcList: [],
      currentAccountTab: 'history',
      tokens: [],
      useBlockie: false,
      featureFlags: {},
      currentLocale: opts.initLangCode,
    }, opts.initState)
    this.store = new ObservableStore(initState)
  }
// PUBLIC METHODS

  setUseBlockie (val) {
    this.store.updateState({ useBlockie: val })
  }

  getUseBlockie () {
    return this.store.getState().useBlockie
  }

  setCurrentLocale (key) {
    this.store.updateState({ currentLocale: key })
  }

  setSelectedAddress (_address) {
    return new Promise((resolve, reject) => {
      const address = normalizeAddress(_address)
      this.store.updateState({ selectedAddress: address })
      resolve()
    })
  }

  getSelectedAddress () {
    return this.store.getState().selectedAddress
  }

  async addToken (rawAddress, symbol, decimals) {
    const address = normalizeAddress(rawAddress)
    const newEntry = { address, symbol, decimals }

    const tokens = this.store.getState().tokens
    const previousEntry = tokens.find((token, index) => {
      return token.address === address
    })
    const previousIndex = tokens.indexOf(previousEntry)

    if (previousEntry) {
      tokens[previousIndex] = newEntry
    } else {
      tokens.push(newEntry)
    }

    this.store.updateState({ tokens })

    return Promise.resolve(tokens)
  }

  removeToken (rawAddress) {
    const tokens = this.store.getState().tokens

    const updatedTokens = tokens.filter(token => token.address !== rawAddress)

    this.store.updateState({ tokens: updatedTokens })
    return Promise.resolve(updatedTokens)
  }

  getTokens () {
    return this.store.getState().tokens
  }

  updateFrequentRpcList (_url) {
    return this.addToFrequentRpcList(_url)
      .then((rpcList) => {
        this.store.updateState({ frequentRpcList: rpcList })
        return Promise.resolve()
      })
  }

  setCurrentAccountTab (currentAccountTab) {
    return new Promise((resolve, reject) => {
      this.store.updateState({ currentAccountTab })
      resolve()
    })
  }

  addToFrequentRpcList (_url) {
    const rpcList = this.getFrequentRpcList()
    const index = rpcList.findIndex((element) => { return element === _url })
    if (index !== -1) {
      rpcList.splice(index, 1)
    }
    if (_url !== 'http://localhost:8545') {
      rpcList.push(_url)
    }
    if (rpcList.length > 2) {
      rpcList.shift()
    }
    return Promise.resolve(rpcList)
  }

  getFrequentRpcList () {
    return this.store.getState().frequentRpcList
  }

  setFeatureFlag (feature, activated) {
    const currentFeatureFlags = this.store.getState().featureFlags
    const updatedFeatureFlags = {
      ...currentFeatureFlags,
      [feature]: activated,
    }

    this.store.updateState({ featureFlags: updatedFeatureFlags })

    return Promise.resolve(updatedFeatureFlags)
  }

  getFeatureFlags () {
    return this.store.getState().featureFlags
  }
  //
  // PRIVATE METHODS
  //
}

module.exports = PreferencesController

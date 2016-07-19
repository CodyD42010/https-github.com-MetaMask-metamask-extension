var actions = {
  GO_HOME: 'GO_HOME',
  goHome: goHome,
  // menu state
  getNetworkStatus: 'getNetworkStatus',

  // remote state
  UPDATE_METAMASK_STATE: 'UPDATE_METAMASK_STATE',
  updateMetamaskState: updateMetamaskState,
  // intialize screen
  AGREE_TO_DISCLAIMER: 'AGREE_TO_DISCLAIMER',
  agreeToDisclaimer: agreeToDisclaimer,
  CREATE_NEW_VAULT_IN_PROGRESS: 'CREATE_NEW_VAULT_IN_PROGRESS',
  SHOW_CREATE_VAULT: 'SHOW_CREATE_VAULT',
  SHOW_RESTORE_VAULT: 'SHOW_RESTORE_VAULT',
  SHOW_INIT_MENU: 'SHOW_INIT_MENU',
  SHOW_NEW_VAULT_SEED: 'SHOW_NEW_VAULT_SEED',
  SHOW_INFO_PAGE: 'SHOW_INFO_PAGE',
  RECOVER_FROM_SEED: 'RECOVER_FROM_SEED',
  CLEAR_SEED_WORD_CACHE: 'CLEAR_SEED_WORD_CACHE',
  clearSeedWordCache: clearSeedWordCache,
  recoverFromSeed: recoverFromSeed,
  unlockMetamask: unlockMetamask,
  unlockFailed: unlockFailed,
  showCreateVault: showCreateVault,
  showRestoreVault: showRestoreVault,
  showInitializeMenu: showInitializeMenu,
  createNewVault: createNewVault,
  createNewVaultInProgress: createNewVaultInProgress,
  showNewVaultSeed: showNewVaultSeed,
  showInfoPage: showInfoPage,
  // seed recovery actions
  REVEAL_SEED_CONFIRMATION: 'REVEAL_SEED_CONFIRMATION',
  revealSeedConfirmation: revealSeedConfirmation,
  requestRevealSeed: requestRevealSeed,
  // unlock screen
  UNLOCK_IN_PROGRESS: 'UNLOCK_IN_PROGRESS',
  UNLOCK_FAILED: 'UNLOCK_FAILED',
  UNLOCK_METAMASK: 'UNLOCK_METAMASK',
  LOCK_METAMASK: 'LOCK_METAMASK',
  tryUnlockMetamask: tryUnlockMetamask,
  lockMetamask: lockMetamask,
  unlockInProgress: unlockInProgress,
  // error handling
  displayWarning: displayWarning,
  showWarning: showWarning, // alias
  DISPLAY_WARNING: 'DISPLAY_WARNING',
  HIDE_WARNING: 'HIDE_WARNING',
  hideWarning: hideWarning,
  // accounts screen
  SET_SELECTED_ACCOUNT: 'SET_SELECTED_ACCOUNT',
  SHOW_ACCOUNT_DETAIL: 'SHOW_ACCOUNT_DETAIL',
  SHOW_ACCOUNTS_PAGE: 'SHOW_ACCOUNTS_PAGE',
  SHOW_CONF_TX_PAGE: 'SHOW_CONF_TX_PAGE',
  SHOW_CONF_MSG_PAGE: 'SHOW_CONF_MSG_PAGE',
  REVEAL_ACCOUNT: 'REVEAL_ACCOUNT',
  revealAccount: revealAccount,
  // account detail screen
  SHOW_SEND_PAGE: 'SHOW_SEND_PAGE',
  showSendPage: showSendPage,
  REQUEST_ACCOUNT_EXPORT: 'REQUEST_ACCOUNT_EXPORT',
  requestExportAccount: requestExportAccount,
  EXPORT_ACCOUNT: 'EXPORT_ACCOUNT',
  exportAccount: exportAccount,
  SHOW_PRIVATE_KEY: 'SHOW_PRIVATE_KEY',
  showPrivateKey: showPrivateKey,
  SAVE_ACCOUNT_LABEL: 'SAVE_ACCOUNT_LABEL',
  saveAccountLabel: saveAccountLabel,
  AGREE_TO_ETH_WARNING: 'AGREE_TO_ETH_WARNING',
  agreeToEthWarning: agreeToEthWarning,
  SHOW_ETH_WARNING: 'SHOW_ETH_WARNING',
  showEthWarning: showEthWarning,
  // tx conf screen
  COMPLETED_TX: 'COMPLETED_TX',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  NEXT_TX: 'NEXT_TX',
  PREVIOUS_TX: 'PREV_TX',
  setSelectedAddress: setSelectedAddress,
  signMsg: signMsg,
  cancelMsg: cancelMsg,
  sendTx: sendTx,
  signTx: signTx,
  cancelTx: cancelTx,
  completedTx: completedTx,
  txError: txError,
  nextTx: nextTx,
  previousTx: previousTx,
  viewPendingTx: viewPendingTx,
  VIEW_PENDING_TX: 'VIEW_PENDING_TX',
  // app messages
  showAccountDetail: showAccountDetail,
  BACK_TO_ACCOUNT_DETAIL: 'BACK_TO_ACCOUNT_DETAIL',
  backToAccountDetail: backToAccountDetail,
  showAccountsPage: showAccountsPage,
  showConfTxPage: showConfTxPage,
  confirmSeedWords: confirmSeedWords,
  // config screen
  SHOW_CONFIG_PAGE: 'SHOW_CONFIG_PAGE',
  SET_RPC_TARGET: 'SET_RPC_TARGET',
  SET_PROVIDER_TYPE: 'SET_PROVIDER_TYPE',
  USE_ETHERSCAN_PROVIDER: 'USE_ETHERSCAN_PROVIDER',
  useEtherscanProvider: useEtherscanProvider,
  showConfigPage: showConfigPage,
  setRpcTarget: setRpcTarget,
  setProviderType: setProviderType,
  // hacky - need a way to get a reference to account manager
  _setAccountManager: _setAccountManager,
  // loading overlay
  SHOW_LOADING: 'SHOW_LOADING_INDICATION',
  HIDE_LOADING: 'HIDE_LOADING_INDICATION',
  showLoadingIndication: showLoadingIndication,
  hideLoadingIndication: hideLoadingIndication,
  // buy Eth with coinbase
  BUY_ETH: 'BUY_ETH',
  buyEth: buyEth,
}

module.exports = actions

var _accountManager = null
function _setAccountManager (accountManager) {
  _accountManager = accountManager
}

function goHome () {
  return {
    type: actions.GO_HOME,
  }
}

// async actions

function tryUnlockMetamask (password) {
  return (dispatch) => {
    dispatch(actions.unlockInProgress())
    _accountManager.submitPassword(password, (err, selectedAccount) => {
      if (err) {
        dispatch(actions.unlockFailed())
      } else {
        dispatch(actions.unlockMetamask(selectedAccount))
      }
    })
  }
}

function createNewVault (password, entropy) {
  return (dispatch) => {
    dispatch(actions.createNewVaultInProgress())
    _accountManager.createNewVault(password, entropy, (err, result) => {
      if (err) {
        return dispatch(actions.showWarning(err.message))
      }
      dispatch(actions.showNewVaultSeed(result))
    })
  }
}

function revealSeedConfirmation () {
  return {
    type: this.REVEAL_SEED_CONFIRMATION,
  }
}

function requestRevealSeed (password) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    _accountManager.tryPassword(password, (err, seed) => {
      dispatch(actions.hideLoadingIndication())
      if (err) return dispatch(actions.displayWarning(err.message))
      _accountManager.recoverSeed((err, seed) => {
        if (err) return dispatch(actions.displayWarning(err.message))
        dispatch(actions.showNewVaultSeed(seed))
      })
    })
  }
}

function recoverFromSeed (password, seed) {
  return (dispatch) => {
    // dispatch(actions.createNewVaultInProgress())
    dispatch(actions.showLoadingIndication())
    _accountManager.recoverFromSeed(password, seed, (err, metamaskState) => {
      dispatch(actions.hideLoadingIndication())
      if (err) return dispatch(actions.displayWarning(err.message))

      var account = Object.keys(metamaskState.identities)[0]
      dispatch(actions.unlockMetamask(account))
    })
  }
}

function showInfoPage () {
  return {
    type: actions.SHOW_INFO_PAGE,
  }
}

function setSelectedAddress (address) {
  return (dispatch) => {
    _accountManager.setSelectedAddress(address)
  }
}

function revealAccount () {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    _accountManager.revealAccount((err) => {
      dispatch(actions.hideLoadingIndication())
      if (err) return dispatch(actions.displayWarning(err.message))
      dispatch({
        type: actions.REVEAL_ACCOUNT,
      })
    })
  }
}

function signMsg (msgData) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())

    _accountManager.signMessage(msgData, (err) => {
      dispatch(actions.hideLoadingIndication())

      if (err) return dispatch(actions.displayWarning(err.message))
      dispatch(actions.completedTx(msgData.metamaskId))
    })
  }
}

function signTx (txData) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())

    web3.eth.sendTransaction(txData, (err, data) => {
      dispatch(actions.hideLoadingIndication())

      if (err) return dispatch(actions.displayWarning(err.message))
      dispatch(actions.hideWarning())
      dispatch(actions.goHome())
    })
  }
}

function sendTx (txData) {
  return (dispatch) => {
    _accountManager.approveTransaction(txData.id, (err) => {
      if (err) {
        alert(err.message)
        dispatch(actions.txError(err))
        return console.error(err.message)
      }
      dispatch(actions.completedTx(txData.id))
    })
  }
}

function completedTx (id) {
  return {
    type: actions.COMPLETED_TX,
    id,
  }
}

function txError (err) {
  return {
    type: actions.TRANSACTION_ERROR,
    message: err.message,
  }
}

function cancelMsg (msgData) {
  _accountManager.cancelMessage(msgData.id)
  return actions.completedTx(msgData.id)
}

function cancelTx (txData) {
  _accountManager.cancelTransaction(txData.id)
  return actions.completedTx(txData.id)
}

//
// initialize screen
//

function showCreateVault () {
  return {
    type: actions.SHOW_CREATE_VAULT,
  }
}

function showRestoreVault () {
  return {
    type: actions.SHOW_RESTORE_VAULT,
  }
}

function showInitializeMenu () {
  return {
    type: actions.SHOW_INIT_MENU,
  }
}

function agreeToDisclaimer () {
  return (dispatch) => {
    dispatch(this.showLoadingIndication())
    _accountManager.agreeToDisclaimer((err) => {
      if (err) {
        return dispatch(actions.showWarning(err.message))
      }

      dispatch(this.hideLoadingIndication())
      dispatch({
        type: this.AGREE_TO_DISCLAIMER,
      })
    })
  }
}

function createNewVaultInProgress () {
  return {
    type: actions.CREATE_NEW_VAULT_IN_PROGRESS,
  }
}

function showNewVaultSeed (seed) {
  return {
    type: actions.SHOW_NEW_VAULT_SEED,
    value: seed,
  }
}

//
// unlock screen
//

function unlockInProgress () {
  return {
    type: actions.UNLOCK_IN_PROGRESS,
  }
}

function unlockFailed () {
  return {
    type: actions.UNLOCK_FAILED,
  }
}

function unlockMetamask (account) {
  return {
    type: actions.UNLOCK_METAMASK,
    value: account,
  }
}

function updateMetamaskState (newState) {
  return {
    type: actions.UPDATE_METAMASK_STATE,
    value: newState,
  }
}

function lockMetamask () {
  return (dispatch) => {
    _accountManager.setLocked((err) => {
      dispatch(actions.hideLoadingIndication())
      if (err) {
        return dispatch(actions.showWarning(err.message))
      }

      dispatch({
        type: actions.LOCK_METAMASK,
      })
    })
  }
}

function showAccountDetail (address) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    _accountManager.setSelectedAddress(address, (err, address) => {
      dispatch(actions.hideLoadingIndication())
      if (err) {
        return dispatch(actions.showWarning(err.message))
      }

      dispatch({
        type: actions.SHOW_ACCOUNT_DETAIL,
        value: address,
      })
    })
  }
}

function backToAccountDetail (address) {
  return {
    type: actions.BACK_TO_ACCOUNT_DETAIL,
    value: address,
  }
}
function clearSeedWordCache (account) {
  return {
    type: actions.CLEAR_SEED_WORD_CACHE,
    value: account,
  }
}

function confirmSeedWords () {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    _accountManager.clearSeedWordCache((err, account) => {
      dispatch(actions.hideLoadingIndication())
      if (err) {
        return dispatch(actions.showWarning(err.message))
      }

      console.log('Seed word cache cleared. ' + account)
      dispatch(actions.showAccountDetail(account))
    })
  }
}

function showAccountsPage () {
  return {
    type: actions.SHOW_ACCOUNTS_PAGE,
  }
}

function showConfTxPage () {
  return {
    type: actions.SHOW_CONF_TX_PAGE,
  }
}

function nextTx () {
  return {
    type: actions.NEXT_TX,
  }
}

function viewPendingTx (txId) {
  return {
    type: actions.VIEW_PENDING_TX,
    value: txId,
  }
}

function previousTx () {
  return {
    type: actions.PREVIOUS_TX,
  }
}

function showConfigPage (transitionForward = true) {
  return {
    type: actions.SHOW_CONFIG_PAGE,
    value: transitionForward,
  }
}

//
// config
//

function setRpcTarget (newRpc) {
  _accountManager.setRpcTarget(newRpc)
  return {
    type: actions.SET_RPC_TARGET,
    value: newRpc,
  }
}

function setProviderType (type) {
  _accountManager.setProviderType(type)
  return {
    type: actions.SET_PROVIDER_TYPE,
    value: type,
  }
}

function useEtherscanProvider () {
  _accountManager.useEtherscanProvider()
  return {
    type: actions.USE_ETHERSCAN_PROVIDER,
  }
}

function showLoadingIndication () {
  return {
    type: actions.SHOW_LOADING,
  }
}

function hideLoadingIndication () {
  return {
    type: actions.HIDE_LOADING,
  }
}

function showWarning (text) {
  return this.displayWarning(text)
}

function displayWarning (text) {
  return {
    type: actions.DISPLAY_WARNING,
    value: text,
  }
}

function hideWarning () {
  return {
    type: actions.HIDE_WARNING,
  }
}

function requestExportAccount () {
  return {
    type: actions.REQUEST_ACCOUNT_EXPORT,
  }
}

function exportAccount (address) {
  var self = this

  return function (dispatch) {
    dispatch(self.showLoadingIndication())

    _accountManager.exportAccount(address, function (err, result) {
      dispatch(self.hideLoadingIndication())

      if (err) {
        console.error(err)
        return dispatch(self.displayWarning('Had a problem exporting the account.'))
      }

      dispatch(self.showPrivateKey(result))
    })
  }
}

function showPrivateKey (key) {
  return {
    type: actions.SHOW_PRIVATE_KEY,
    value: key,
  }
}

function saveAccountLabel (account, label) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    _accountManager.saveAccountLabel(account, label, (err) => {
      dispatch(actions.hideLoadingIndication())
      if (err) {
        return dispatch(actions.showWarning(err.message))
      }
      dispatch({
        type: actions.SAVE_ACCOUNT_LABEL,
        value: { account, label },
      })
    })
  }
}

function showSendPage () {
  return {
    type: actions.SHOW_SEND_PAGE,
  }
}

function agreeToEthWarning () {
  return (dispatch) => {
    _accountManager.agreeToEthWarning((err) => {
      if (err) {
        return dispatch(actions.showEthWarning(err.message))
      }
      dispatch({
        type: actions.AGREE_TO_ETH_WARNING,
      })
    })
  }
}

function showEthWarning () {
  return {
    type: actions.SHOW_ETH_WARNING,
  }
}

function buyEth (address, amount) {
  return (dispatch) => {
    _accountManager.buyEth(address, amount)
    dispatch({
      type: actions.BUY_ETH,
    })
  }
}

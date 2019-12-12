const abi = require('human-standard-token-abi')
const pify = require('pify')
const getBuyEthUrl = require('../../../app/scripts/lib/buy-eth-url')
const { getTokenAddressFromTokenObject, checksumAddress } = require('../helpers/utils/util')
const {
  calcTokenBalance,
  estimateGas,
} = require('../pages/send/send.utils')
const ethUtil = require('ethereumjs-util')
const { fetchLocale } = require('../helpers/utils/i18n-helper')
const { getMethodDataAsync } = require('../helpers/utils/transactions.util')
const { fetchSymbolAndDecimals } = require('../helpers/utils/token-util')
import switchDirection from '../helpers/utils/switch-direction'
const log = require('loglevel')
const { ENVIRONMENT_TYPE_NOTIFICATION } = require('../../../app/scripts/lib/enums')
const { hasUnconfirmedTransactions } = require('../helpers/utils/confirm-tx.util')
const gasDuck = require('../ducks/gas/gas.duck')
const WebcamUtils = require('../../lib/webcam-utils')

const actions = {
  _setBackgroundConnection: _setBackgroundConnection,

  GO_HOME: 'GO_HOME',
  goHome: goHome,
  // modal state
  MODAL_OPEN: 'UI_MODAL_OPEN',
  MODAL_CLOSE: 'UI_MODAL_CLOSE',
  showModal: showModal,
  hideModal: hideModal,
  // notification state
  CLOSE_NOTIFICATION_WINDOW: 'CLOSE_NOTIFICATION_WINDOW',
  // sidebar state
  SIDEBAR_OPEN: 'UI_SIDEBAR_OPEN',
  SIDEBAR_CLOSE: 'UI_SIDEBAR_CLOSE',
  showSidebar: showSidebar,
  hideSidebar: hideSidebar,
  // sidebar state
  ALERT_OPEN: 'UI_ALERT_OPEN',
  ALERT_CLOSE: 'UI_ALERT_CLOSE',
  showAlert: showAlert,
  hideAlert: hideAlert,
  QR_CODE_DETECTED: 'UI_QR_CODE_DETECTED',
  qrCodeDetected,
  // network dropdown open
  NETWORK_DROPDOWN_OPEN: 'UI_NETWORK_DROPDOWN_OPEN',
  NETWORK_DROPDOWN_CLOSE: 'UI_NETWORK_DROPDOWN_CLOSE',
  showNetworkDropdown: showNetworkDropdown,
  hideNetworkDropdown: hideNetworkDropdown,
  // transition state
  TRANSITION_FORWARD: 'TRANSITION_FORWARD',
  transitionForward,
  // remote state
  UPDATE_METAMASK_STATE: 'UPDATE_METAMASK_STATE',
  updateMetamaskState: updateMetamaskState,
  fetchInfoToSync,
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
  forgotPassword: forgotPassword,
  markPasswordForgotten,
  unMarkPasswordForgotten,
  SHOW_INFO_PAGE: 'SHOW_INFO_PAGE',
  SET_NEW_ACCOUNT_FORM: 'SET_NEW_ACCOUNT_FORM',
  unlockMetamask: unlockMetamask,
  unlockFailed: unlockFailed,
  unlockSucceeded,
  setNewAccountForm,
  createNewVaultAndRestore: createNewVaultAndRestore,
  createNewVaultAndGetSeedPhrase,
  unlockAndGetSeedPhrase,
  addNewKeyring,
  importNewAccount,
  addNewAccount,
  connectHardware,
  checkHardwareStatus,
  forgetDevice,
  unlockHardwareWalletAccount,
  resetAccount,
  removeAccount,
  showInfoPage: showInfoPage,
  CLOSE_WELCOME_SCREEN: 'CLOSE_WELCOME_SCREEN',
  closeWelcomeScreen,
  // seed recovery actions
  requestRevealSeedWords,
  // unlock screen
  UNLOCK_IN_PROGRESS: 'UNLOCK_IN_PROGRESS',
  UNLOCK_FAILED: 'UNLOCK_FAILED',
  UNLOCK_SUCCEEDED: 'UNLOCK_SUCCEEDED',
  UNLOCK_METAMASK: 'UNLOCK_METAMASK',
  LOCK_METAMASK: 'LOCK_METAMASK',
  tryUnlockMetamask: tryUnlockMetamask,
  lockMetamask: lockMetamask,
  unlockInProgress: unlockInProgress,
  // error handling
  displayWarning: displayWarning,
  DISPLAY_WARNING: 'DISPLAY_WARNING',
  HIDE_WARNING: 'HIDE_WARNING',
  hideWarning: hideWarning,
  // accounts screen
  SET_SELECTED_TOKEN: 'SET_SELECTED_TOKEN',
  setSelectedToken,
  SHOW_ACCOUNT_DETAIL: 'SHOW_ACCOUNT_DETAIL',
  SHOW_ACCOUNTS_PAGE: 'SHOW_ACCOUNTS_PAGE',
  SHOW_CONF_TX_PAGE: 'SHOW_CONF_TX_PAGE',
  SET_CURRENT_FIAT: 'SET_CURRENT_FIAT',
  showQrScanner,
  setCurrentCurrency,
  setCurrentAccountTab,
  // account detail screen
  SHOW_SEND_PAGE: 'SHOW_SEND_PAGE',
  showSendPage: showSendPage,
  SHOW_SEND_TOKEN_PAGE: 'SHOW_SEND_TOKEN_PAGE',
  showSendTokenPage,
  addToAddressBook: addToAddressBook,
  removeFromAddressBook: removeFromAddressBook,
  exportAccount: exportAccount,
  SHOW_PRIVATE_KEY: 'SHOW_PRIVATE_KEY',
  showPrivateKey: showPrivateKey,
  SET_ACCOUNT_LABEL: 'SET_ACCOUNT_LABEL',
  setAccountLabel,
  updateNetworkNonce,
  SET_NETWORK_NONCE: 'SET_NETWORK_NONCE',
  // tx conf screen
  COMPLETED_TX: 'COMPLETED_TX',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  signMsg: signMsg,
  cancelMsg: cancelMsg,
  signPersonalMsg,
  cancelPersonalMsg,
  signTypedMsg,
  cancelTypedMsg,
  signTx: signTx,
  signTokenTx: signTokenTx,
  updateTransaction,
  updateAndApproveTx,
  cancelTx: cancelTx,
  cancelTxs,
  completedTx: completedTx,
  txError: txError,
  updateTransactionParams,
  UPDATE_TRANSACTION_PARAMS: 'UPDATE_TRANSACTION_PARAMS',
  SET_NEXT_NONCE: 'SET_NEXT_NONCE',
  getNextNonce,
  // send screen
  UPDATE_GAS_LIMIT: 'UPDATE_GAS_LIMIT',
  UPDATE_GAS_PRICE: 'UPDATE_GAS_PRICE',
  UPDATE_GAS_TOTAL: 'UPDATE_GAS_TOTAL',
  UPDATE_SEND_HEX_DATA: 'UPDATE_SEND_HEX_DATA',
  UPDATE_SEND_TOKEN_BALANCE: 'UPDATE_SEND_TOKEN_BALANCE',
  UPDATE_SEND_TO: 'UPDATE_SEND_TO',
  UPDATE_SEND_AMOUNT: 'UPDATE_SEND_AMOUNT',
  UPDATE_SEND_ERRORS: 'UPDATE_SEND_ERRORS',
  UPDATE_MAX_MODE: 'UPDATE_MAX_MODE',
  UPDATE_SEND: 'UPDATE_SEND',
  CLEAR_SEND: 'CLEAR_SEND',
  GAS_LOADING_STARTED: 'GAS_LOADING_STARTED',
  GAS_LOADING_FINISHED: 'GAS_LOADING_FINISHED',
  UPDATE_SEND_ENS_RESOLUTION: 'UPDATE_SEND_ENS_RESOLUTION',
  UPDATE_SEND_ENS_RESOLUTION_ERROR: 'UPDATE_SEND_ENS_RESOLUTION_ERROR',
  updateSendEnsResolution,
  updateSendEnsResolutionError,
  setGasLimit,
  setGasPrice,
  updateGasData,
  setGasTotal,
  updateSendTokenBalance,
  updateSendHexData,
  updateSendTo,
  updateSendAmount,
  setMaxModeTo,
  updateSend,
  updateSendErrors,
  clearSend,
  setSelectedAddress,
  gasLoadingStarted,
  gasLoadingFinished,
  // app messages
  showAccountDetail: showAccountDetail,
  showAccountsPage: showAccountsPage,
  showConfTxPage: showConfTxPage,
  // config screen
  SHOW_CONFIG_PAGE: 'SHOW_CONFIG_PAGE',
  SET_RPC_TARGET: 'SET_RPC_TARGET',
  SET_PROVIDER_TYPE: 'SET_PROVIDER_TYPE',
  SET_PREVIOUS_PROVIDER: 'SET_PREVIOUS_PROVIDER',
  showConfigPage,
  SHOW_ADD_TOKEN_PAGE: 'SHOW_ADD_TOKEN_PAGE',
  showAddTokenPage,
  addToken,
  addTokens,
  removeToken,
  updateTokens,
  removeSuggestedTokens,
  addKnownMethodData,
  UPDATE_TOKENS: 'UPDATE_TOKENS',
  updateAndSetCustomRpc: updateAndSetCustomRpc,
  setRpcTarget: setRpcTarget,
  delRpcTarget: delRpcTarget,
  editRpc: editRpc,
  setProviderType: setProviderType,
  SET_HARDWARE_WALLET_DEFAULT_HD_PATH: 'SET_HARDWARE_WALLET_DEFAULT_HD_PATH',
  setHardwareWalletDefaultHdPath,
  updateProviderType,
  // loading overlay
  SHOW_LOADING: 'SHOW_LOADING_INDICATION',
  HIDE_LOADING: 'HIDE_LOADING_INDICATION',
  showLoadingIndication: showLoadingIndication,
  hideLoadingIndication: hideLoadingIndication,
  // buy Eth with coinbase
  BUY_ETH: 'BUY_ETH',
  buyEth: buyEth,
  PAIR_UPDATE: 'PAIR_UPDATE',
  pairUpdate: pairUpdate,
  SHOW_SUB_LOADING_INDICATION: 'SHOW_SUB_LOADING_INDICATION',
  showSubLoadingIndication: showSubLoadingIndication,
  HIDE_SUB_LOADING_INDICATION: 'HIDE_SUB_LOADING_INDICATION',
  hideSubLoadingIndication: hideSubLoadingIndication,
  // QR STUFF:
  SHOW_QR: 'SHOW_QR',
  showQrView: showQrView,
  reshowQrCode: reshowQrCode,
  SHOW_QR_VIEW: 'SHOW_QR_VIEW',

  forceUpdateMetamaskState,

  TOGGLE_ACCOUNT_MENU: 'TOGGLE_ACCOUNT_MENU',
  toggleAccountMenu,

  useEtherscanProvider,

  SET_USE_BLOCKIE: 'SET_USE_BLOCKIE',
  setUseBlockie,
  SET_USE_NONCEFIELD: 'SET_USE_NONCEFIELD',
  setUseNonceField,
  UPDATE_CUSTOM_NONCE: 'UPDATE_CUSTOM_NONCE',
  updateCustomNonce,
  SET_IPFS_GATEWAY: 'SET_IPFS_GATEWAY',
  setIpfsGateway,

  SET_PARTICIPATE_IN_METAMETRICS: 'SET_PARTICIPATE_IN_METAMETRICS',
  SET_METAMETRICS_SEND_COUNT: 'SET_METAMETRICS_SEND_COUNT',
  setParticipateInMetaMetrics,
  setMetaMetricsSendCount,

  // locale
  SET_CURRENT_LOCALE: 'SET_CURRENT_LOCALE',
  setCurrentLocale,
  updateCurrentLocale,

  // Feature Flags
  setFeatureFlag,
  updateFeatureFlags,
  UPDATE_FEATURE_FLAGS: 'UPDATE_FEATURE_FLAGS',

  // Preferences
  setPreference,
  updatePreferences,
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  setUseNativeCurrencyAsPrimaryCurrencyPreference,
  setShowFiatConversionOnTestnetsPreference,
  setAutoLogoutTimeLimit,

  // Onboarding
  setCompletedOnboarding,
  completeOnboarding,
  COMPLETE_ONBOARDING: 'COMPLETE_ONBOARDING',

  setMouseUserState,
  SET_MOUSE_USER_STATE: 'SET_MOUSE_USER_STATE',

  // Network
  retryTransaction,
  SET_PENDING_TOKENS: 'SET_PENDING_TOKENS',
  CLEAR_PENDING_TOKENS: 'CLEAR_PENDING_TOKENS',
  setPendingTokens,
  clearPendingTokens,

  createCancelTransaction,
  createSpeedUpTransaction,
  createRetryTransaction,

  // Permissions
  approvePermissionsRequest,
  clearPermissions,
  rejectPermissionsRequest,
  removePermissionsFor,
  legacyExposeAccounts,

  setFirstTimeFlowType,
  SET_FIRST_TIME_FLOW_TYPE: 'SET_FIRST_TIME_FLOW_TYPE',

  SET_SELECTED_SETTINGS_RPC_URL: 'SET_SELECTED_SETTINGS_RPC_URL',
  setSelectedSettingsRpcUrl,
  SET_NETWORKS_TAB_ADD_MODE: 'SET_NETWORKS_TAB_ADD_MODE',
  setNetworksTabAddMode,

  // AppStateController-related actions
  setLastActiveTime,
  setMkrMigrationReminderTimestamp,

  getContractMethodData,
  loadingMethoDataStarted,
  loadingMethoDataFinished,
  LOADING_METHOD_DATA_STARTED: 'LOADING_METHOD_DATA_STARTED',
  LOADING_METHOD_DATA_FINISHED: 'LOADING_METHOD_DATA_FINISHED',

  getTokenParams,
  loadingTokenParamsStarted,
  LOADING_TOKEN_PARAMS_STARTED: 'LOADING_TOKEN_PARAMS_STARTED',
  loadingTokenParamsFinished,
  LOADING_TOKEN_PARAMS_FINISHED: 'LOADING_TOKEN_PARAMS_FINISHED',

  setSeedPhraseBackedUp,
  verifySeedPhrase,
  hideSeedPhraseBackupAfterOnboarding,

  initializeThreeBox,
  restoreFromThreeBox,
  getThreeBoxLastUpdated,
  setThreeBoxSyncingPermission,
  setShowRestorePromptToFalse,
  turnThreeBoxSyncingOn,
  turnThreeBoxSyncingOnAndInitialize,

  tryReverseResolveAddress,

  getRequestAccountTabIds,
  getCurrentWindowTab,
  SET_REQUEST_ACCOUNT_TABS: 'SET_REQUEST_ACCOUNT_TABS',
  SET_CURRENT_WINDOW_TAB: 'SET_CURRENT_WINDOW_TAB',
  getOpenMetamaskTabsIds,
  SET_OPEN_METAMASK_TAB_IDS: 'SET_OPEN_METAMASK_TAB_IDS',
}

module.exports = actions

let background = null
function _setBackgroundConnection (backgroundConnection) {
  background = backgroundConnection
}

function goHome () {
  return {
    type: actions.GO_HOME,
  }
}

// async actions

function tryUnlockMetamask (password) {
  return dispatch => {
    dispatch(actions.showLoadingIndication())
    dispatch(actions.unlockInProgress())
    log.debug(`background.submitPassword`)

    return new Promise((resolve, reject) => {
      background.submitPassword(password, error => {
        if (error) {
          return reject(error)
        }

        resolve()
      })
    })
      .then(() => {
        dispatch(actions.unlockSucceeded())
        return forceUpdateMetamaskState(dispatch)
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          background.verifySeedPhrase(err => {
            if (err) {
              dispatch(actions.displayWarning(err.message))
              return reject(err)
            }

            resolve()
          })
        })
      })
      .then(() => {
        dispatch(actions.transitionForward())
        dispatch(actions.hideLoadingIndication())
      })
      .catch(err => {
        dispatch(actions.unlockFailed(err.message))
        dispatch(actions.hideLoadingIndication())
        return Promise.reject(err)
      })
  }
}

function transitionForward () {
  return {
    type: this.TRANSITION_FORWARD,
  }
}

function createNewVaultAndRestore (password, seed) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    log.debug(`background.createNewVaultAndRestore`)
    let vault
    return new Promise((resolve, reject) => {
      background.createNewVaultAndRestore(password, seed, (err, _vault) => {
        if (err) {
          return reject(err)
        }
        vault = _vault
        resolve()
      })
    })
      .then(() => dispatch(actions.unMarkPasswordForgotten()))
      .then(() => {
        dispatch(actions.showAccountsPage())
        dispatch(actions.hideLoadingIndication())
        return vault
      })
      .catch(err => {
        dispatch(actions.displayWarning(err.message))
        dispatch(actions.hideLoadingIndication())
        return Promise.reject(err)
      })
  }
}

function createNewVaultAndGetSeedPhrase (password) {
  return async dispatch => {
    dispatch(actions.showLoadingIndication())

    try {
      await createNewVault(password)
      const seedWords = await verifySeedPhrase()
      dispatch(actions.hideLoadingIndication())
      return seedWords
    } catch (error) {
      dispatch(actions.hideLoadingIndication())
      dispatch(actions.displayWarning(error.message))
      throw new Error(error.message)
    }
  }
}

function unlockAndGetSeedPhrase (password) {
  return async dispatch => {
    dispatch(actions.showLoadingIndication())

    try {
      await submitPassword(password)
      const seedWords = await verifySeedPhrase()
      await forceUpdateMetamaskState(dispatch)
      dispatch(actions.hideLoadingIndication())
      return seedWords
    } catch (error) {
      dispatch(actions.hideLoadingIndication())
      dispatch(actions.displayWarning(error.message))
      throw new Error(error.message)
    }
  }
}

function submitPassword (password) {
  return new Promise((resolve, reject) => {
    background.submitPassword(password, error => {
      if (error) {
        return reject(error)
      }

      resolve()
    })
  })
}

function createNewVault (password) {
  return new Promise((resolve, reject) => {
    background.createNewVaultAndKeychain(password, error => {
      if (error) {
        return reject(error)
      }

      resolve(true)
    })
  })
}

function verifyPassword (password) {
  return new Promise((resolve, reject) => {
    background.submitPassword(password, error => {
      if (error) {
        return reject(error)
      }

      resolve(true)
    })
  })
}

function verifySeedPhrase () {
  return new Promise((resolve, reject) => {
    background.verifySeedPhrase((error, seedWords) => {
      if (error) {
        return reject(error)
      }

      resolve(seedWords)
    })
  })
}

function requestRevealSeedWords (password) {
  return async dispatch => {
    dispatch(actions.showLoadingIndication())
    log.debug(`background.submitPassword`)

    try {
      await verifyPassword(password)
      const seedWords = await verifySeedPhrase()
      dispatch(actions.hideLoadingIndication())
      return seedWords
    } catch (error) {
      dispatch(actions.hideLoadingIndication())
      dispatch(actions.displayWarning(error.message))
      throw new Error(error.message)
    }
  }
}

function tryReverseResolveAddress (address) {
  return () => {
    return new Promise((resolve) => {
      background.tryReverseResolveAddress(address, (err) => {
        if (err) {
          log.error(err)
        }
        resolve()
      })
    })
  }
}

function fetchInfoToSync () {
  return dispatch => {
    log.debug(`background.fetchInfoToSync`)
    return new Promise((resolve, reject) => {
      background.fetchInfoToSync((err, result) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        resolve(result)
      })
    })
  }
}

function resetAccount () {
  return dispatch => {
    dispatch(actions.showLoadingIndication())

    return new Promise((resolve, reject) => {
      background.resetAccount((err, account) => {
        dispatch(actions.hideLoadingIndication())
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        log.info('Transaction history reset for ' + account)
        dispatch(actions.showAccountsPage())
        resolve(account)
      })
    })
  }
}

function removeAccount (address) {
  return dispatch => {
    dispatch(actions.showLoadingIndication())

    return new Promise((resolve, reject) => {
      background.removeAccount(address, (err, account) => {
        dispatch(actions.hideLoadingIndication())
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        log.info('Account removed: ' + account)
        dispatch(actions.showAccountsPage())
        resolve()
      })
    })
  }
}

function addNewKeyring (type, opts) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    log.debug(`background.addNewKeyring`)
    background.addNewKeyring(type, opts, (err) => {
      dispatch(actions.hideLoadingIndication())
      if (err) {
        return dispatch(actions.displayWarning(err.message))
      }
      dispatch(actions.showAccountsPage())
    })
  }
}

function importNewAccount (strategy, args) {
  return async (dispatch) => {
    let newState
    dispatch(actions.showLoadingIndication('This may take a while, please be patient.'))
    try {
      log.debug(`background.importAccountWithStrategy`)
      await pify(background.importAccountWithStrategy).call(background, strategy, args)
      log.debug(`background.getState`)
      newState = await pify(background.getState).call(background)
    } catch (err) {
      dispatch(actions.hideLoadingIndication())
      dispatch(actions.displayWarning(err.message))
      throw err
    }
    dispatch(actions.hideLoadingIndication())
    dispatch(actions.updateMetamaskState(newState))
    if (newState.selectedAddress) {
      dispatch({
        type: actions.SHOW_ACCOUNT_DETAIL,
        value: newState.selectedAddress,
      })
    }
    return newState
  }
}

function addNewAccount () {
  log.debug(`background.addNewAccount`)
  return (dispatch, getState) => {
    const oldIdentities = getState().metamask.identities
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      background.addNewAccount((err, { identities: newIdentities }) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        const newAccountAddress = Object.keys(newIdentities).find(address => !oldIdentities[address])

        dispatch(actions.hideLoadingIndication())

        forceUpdateMetamaskState(dispatch)
        return resolve(newAccountAddress)
      })
    })
  }
}

function checkHardwareStatus (deviceName, hdPath) {
  log.debug(`background.checkHardwareStatus`, deviceName, hdPath)
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      background.checkHardwareStatus(deviceName, hdPath, (err, unlocked) => {
        if (err) {
          log.error(err)
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        dispatch(actions.hideLoadingIndication())

        forceUpdateMetamaskState(dispatch)
        return resolve(unlocked)
      })
    })
  }
}

function forgetDevice (deviceName) {
  log.debug(`background.forgetDevice`, deviceName)
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      background.forgetDevice(deviceName, (err) => {
        if (err) {
          log.error(err)
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        dispatch(actions.hideLoadingIndication())

        forceUpdateMetamaskState(dispatch)
        return resolve()
      })
    })
  }
}

function connectHardware (deviceName, page, hdPath) {
  log.debug(`background.connectHardware`, deviceName, page, hdPath)
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      background.connectHardware(deviceName, page, hdPath, (err, accounts) => {
        if (err) {
          log.error(err)
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        dispatch(actions.hideLoadingIndication())

        forceUpdateMetamaskState(dispatch)
        return resolve(accounts)
      })
    })
  }
}

function unlockHardwareWalletAccount (index, deviceName, hdPath) {
  log.debug(`background.unlockHardwareWalletAccount`, index, deviceName, hdPath)
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      background.unlockHardwareWalletAccount(index, deviceName, hdPath, (err) => {
        if (err) {
          log.error(err)
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        dispatch(actions.hideLoadingIndication())
        return resolve()
      })
    })
  }
}

function showInfoPage () {
  return {
    type: actions.SHOW_INFO_PAGE,
  }
}

function showQrScanner (ROUTE) {
  return (dispatch) => {
    return WebcamUtils.checkStatus()
      .then(status => {
        if (!status.environmentReady) {
          // We need to switch to fullscreen mode to ask for permission
          global.platform.openExtensionInBrowser(`${ROUTE}`, `scan=true`)
        } else {
          dispatch(actions.showModal({
            name: 'QR_SCANNER',
          }))
        }
      }).catch(e => {
        dispatch(actions.showModal({
          name: 'QR_SCANNER',
          error: true,
          errorType: e.type,
        }))
      })
  }
}

function setCurrentCurrency (currencyCode) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    log.debug(`background.setCurrentCurrency`)
    background.setCurrentCurrency(currencyCode, (err, data) => {
      dispatch(actions.hideLoadingIndication())
      if (err) {
        log.error(err.stack)
        return dispatch(actions.displayWarning(err.message))
      }
      dispatch({
        type: actions.SET_CURRENT_FIAT,
        value: {
          currentCurrency: data.currentCurrency,
          conversionRate: data.conversionRate,
          conversionDate: data.conversionDate,
        },
      })
    })
  }
}

function signMsg (msgData) {
  log.debug('action - signMsg')
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      log.debug(`actions calling background.signMessage`)
      background.signMessage(msgData, (err, newState) => {
        log.debug('signMessage called back')
        dispatch(actions.updateMetamaskState(newState))
        dispatch(actions.hideLoadingIndication())

        if (err) {
          log.error(err)
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        dispatch(actions.completedTx(msgData.metamaskId))
        dispatch(closeCurrentNotificationWindow())

        return resolve(msgData)
      })
    })
  }
}

function signPersonalMsg (msgData) {
  log.debug('action - signPersonalMsg')
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      log.debug(`actions calling background.signPersonalMessage`)
      background.signPersonalMessage(msgData, (err, newState) => {
        log.debug('signPersonalMessage called back')
        dispatch(actions.updateMetamaskState(newState))
        dispatch(actions.hideLoadingIndication())

        if (err) {
          log.error(err)
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        dispatch(actions.completedTx(msgData.metamaskId))
        dispatch(closeCurrentNotificationWindow())

        return resolve(msgData)
      })
    })
  }
}

function signTypedMsg (msgData) {
  log.debug('action - signTypedMsg')
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      log.debug(`actions calling background.signTypedMessage`)
      background.signTypedMessage(msgData, (err, newState) => {
        log.debug('signTypedMessage called back')
        dispatch(actions.updateMetamaskState(newState))
        dispatch(actions.hideLoadingIndication())

        if (err) {
          log.error(err)
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        dispatch(actions.completedTx(msgData.metamaskId))
        dispatch(closeCurrentNotificationWindow())

        return resolve(msgData)
      })
    })
  }
}

function signTx (txData) {
  return (dispatch) => {
    global.ethQuery.sendTransaction(txData, (err) => {
      if (err) {
        return dispatch(actions.displayWarning(err.message))
      }
    })
    dispatch(actions.showConfTxPage({}))
  }
}

function setGasLimit (gasLimit) {
  return {
    type: actions.UPDATE_GAS_LIMIT,
    value: gasLimit,
  }
}

function setGasPrice (gasPrice) {
  return {
    type: actions.UPDATE_GAS_PRICE,
    value: gasPrice,
  }
}

function setGasTotal (gasTotal) {
  return {
    type: actions.UPDATE_GAS_TOTAL,
    value: gasTotal,
  }
}

function updateGasData ({
  gasPrice,
  blockGasLimit,
  selectedAddress,
  selectedToken,
  to,
  value,
  data,
}) {
  return (dispatch) => {
    dispatch(actions.gasLoadingStarted())
    return estimateGas({
      estimateGasMethod: background.estimateGas,
      blockGasLimit,
      selectedAddress,
      selectedToken,
      to,
      value,
      estimateGasPrice: gasPrice,
      data,
    })
      .then(gas => {
        dispatch(actions.setGasLimit(gas))
        dispatch(gasDuck.setCustomGasLimit(gas))
        dispatch(updateSendErrors({ gasLoadingError: null }))
        dispatch(actions.gasLoadingFinished())
      })
      .catch(err => {
        log.error(err)
        dispatch(updateSendErrors({ gasLoadingError: 'gasLoadingError' }))
        dispatch(actions.gasLoadingFinished())
      })
  }
}

function gasLoadingStarted () {
  return {
    type: actions.GAS_LOADING_STARTED,
  }
}

function gasLoadingFinished () {
  return {
    type: actions.GAS_LOADING_FINISHED,
  }
}

function updateSendTokenBalance ({
  selectedToken,
  tokenContract,
  address,
}) {
  return (dispatch) => {
    const tokenBalancePromise = tokenContract
      ? tokenContract.balanceOf(address)
      : Promise.resolve()
    return tokenBalancePromise
      .then(usersToken => {
        if (usersToken) {
          const newTokenBalance = calcTokenBalance({ selectedToken, usersToken })
          dispatch(setSendTokenBalance(newTokenBalance))
        }
      })
      .catch(err => {
        log.error(err)
        updateSendErrors({ tokenBalance: 'tokenBalanceError' })
      })
  }
}

function updateSendErrors (errorObject) {
  return {
    type: actions.UPDATE_SEND_ERRORS,
    value: errorObject,
  }
}

function setSendTokenBalance (tokenBalance) {
  return {
    type: actions.UPDATE_SEND_TOKEN_BALANCE,
    value: tokenBalance,
  }
}

function updateSendHexData (value) {
  return {
    type: actions.UPDATE_SEND_HEX_DATA,
    value,
  }
}

function updateSendTo (to, nickname = '') {
  return {
    type: actions.UPDATE_SEND_TO,
    value: { to, nickname },
  }
}

function updateSendAmount (amount) {
  return {
    type: actions.UPDATE_SEND_AMOUNT,
    value: amount,
  }
}

function updateCustomNonce (value) {
  return {
    type: actions.UPDATE_CUSTOM_NONCE,
    value: value,
  }
}

function setMaxModeTo (bool) {
  return {
    type: actions.UPDATE_MAX_MODE,
    value: bool,
  }
}

function updateSend (newSend) {
  return {
    type: actions.UPDATE_SEND,
    value: newSend,
  }
}

function clearSend () {
  return {
    type: actions.CLEAR_SEND,
  }
}

function updateSendEnsResolution (ensResolution) {
  return {
    type: actions.UPDATE_SEND_ENS_RESOLUTION,
    payload: ensResolution,
  }
}

function updateSendEnsResolutionError (errorMessage) {
  return {
    type: actions.UPDATE_SEND_ENS_RESOLUTION_ERROR,
    payload: errorMessage,
  }
}

function signTokenTx (tokenAddress, toAddress, amount, txData) {
  return dispatch => {
    dispatch(actions.showLoadingIndication())
    const token = global.eth.contract(abi).at(tokenAddress)
    token.transfer(toAddress, ethUtil.addHexPrefix(amount), txData)
      .catch(err => {
        dispatch(actions.hideLoadingIndication())
        dispatch(actions.displayWarning(err.message))
      })
    dispatch(actions.showConfTxPage({}))
  }
}

const updateMetamaskStateFromBackground = () => {
  log.debug(`background.getState`)

  return new Promise((resolve, reject) => {
    background.getState((error, newState) => {
      if (error) {
        return reject(error)
      }

      resolve(newState)
    })
  })
}

function updateTransaction (txData) {
  log.info('actions: updateTx: ' + JSON.stringify(txData))
  return dispatch => {
    log.debug(`actions calling background.updateTx`)
    dispatch(actions.showLoadingIndication())

    return new Promise((resolve, reject) => {
      background.updateTransaction(txData, (err) => {
        dispatch(actions.updateTransactionParams(txData.id, txData.txParams))
        if (err) {
          dispatch(actions.txError(err))
          dispatch(actions.goHome())
          log.error(err.message)
          return reject(err)
        }

        resolve(txData)
      })
    })
      .then(() => updateMetamaskStateFromBackground())
      .then(newState => dispatch(actions.updateMetamaskState(newState)))
      .then(() => {
        dispatch(actions.showConfTxPage({ id: txData.id }))
        dispatch(actions.hideLoadingIndication())
        return txData
      })
  }
}

function updateAndApproveTx (txData) {
  log.info('actions: updateAndApproveTx: ' + JSON.stringify(txData))
  return (dispatch) => {
    log.debug(`actions calling background.updateAndApproveTx`)
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      background.updateAndApproveTransaction(txData, err => {
        dispatch(actions.updateTransactionParams(txData.id, txData.txParams))
        dispatch(actions.clearSend())

        if (err) {
          dispatch(actions.txError(err))
          dispatch(actions.goHome())
          log.error(err.message)
          return reject(err)
        }

        resolve(txData)
      })
    })
      .then(() => updateMetamaskStateFromBackground())
      .then(newState => dispatch(actions.updateMetamaskState(newState)))
      .then(() => {
        dispatch(actions.clearSend())
        dispatch(actions.completedTx(txData.id))
        dispatch(actions.hideLoadingIndication())
        dispatch(actions.updateCustomNonce(''))
        dispatch(closeCurrentNotificationWindow())

        return txData
      })
      .catch((err) => {
        dispatch(actions.hideLoadingIndication())
        return Promise.reject(err)
      })
  }
}

function completedTx (id) {
  return {
    type: actions.COMPLETED_TX,
    value: id,
  }
}

function updateTransactionParams (id, txParams) {
  return {
    type: actions.UPDATE_TRANSACTION_PARAMS,
    id,
    value: txParams,
  }
}

function txError (err) {
  return {
    type: actions.TRANSACTION_ERROR,
    message: err.message,
  }
}

function cancelMsg (msgData) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      log.debug(`background.cancelMessage`)
      background.cancelMessage(msgData.id, (err, newState) => {
        dispatch(actions.updateMetamaskState(newState))
        dispatch(actions.hideLoadingIndication())

        if (err) {
          return reject(err)
        }

        dispatch(actions.completedTx(msgData.id))
        dispatch(closeCurrentNotificationWindow())

        return resolve(msgData)
      })
    })
  }
}

function cancelPersonalMsg (msgData) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      const id = msgData.id
      background.cancelPersonalMessage(id, (err, newState) => {
        dispatch(actions.updateMetamaskState(newState))
        dispatch(actions.hideLoadingIndication())

        if (err) {
          return reject(err)
        }

        dispatch(actions.completedTx(id))
        dispatch(closeCurrentNotificationWindow())

        return resolve(msgData)
      })
    })
  }
}

function cancelTypedMsg (msgData) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      const id = msgData.id
      background.cancelTypedMessage(id, (err, newState) => {
        dispatch(actions.updateMetamaskState(newState))
        dispatch(actions.hideLoadingIndication())

        if (err) {
          return reject(err)
        }

        dispatch(actions.completedTx(id))
        dispatch(closeCurrentNotificationWindow())

        return resolve(msgData)
      })
    })
  }
}

function cancelTx (txData) {
  return (dispatch) => {
    log.debug(`background.cancelTransaction`)
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      background.cancelTransaction(txData.id, err => {
        if (err) {
          return reject(err)
        }

        resolve()
      })
    })
      .then(() => updateMetamaskStateFromBackground())
      .then(newState => dispatch(actions.updateMetamaskState(newState)))
      .then(() => {
        dispatch(actions.clearSend())
        dispatch(actions.completedTx(txData.id))
        dispatch(actions.hideLoadingIndication())
        dispatch(closeCurrentNotificationWindow())

        return txData
      })
  }
}

/**
 * Cancels all of the given transactions
 * @param {Array<object>} txDataList a list of tx data objects
 * @return {function(*): Promise<void>}
 */
function cancelTxs (txDataList) {
  return async (dispatch) => {
    dispatch(actions.showLoadingIndication())
    const txIds = txDataList.map(({ id }) => id)
    const cancellations = txIds.map((id) => new Promise((resolve, reject) => {
      background.cancelTransaction(id, (err) => {
        if (err) {
          return reject(err)
        }

        resolve()
      })
    }))

    await Promise.all(cancellations)
    const newState = await updateMetamaskStateFromBackground()
    dispatch(actions.updateMetamaskState(newState))
    dispatch(actions.clearSend())

    txIds.forEach((id) => {
      dispatch(actions.completedTx(id))
    })

    dispatch(actions.hideLoadingIndication())

    if (global.METAMASK_UI_TYPE === ENVIRONMENT_TYPE_NOTIFICATION) {
      return global.platform.closeCurrentWindow()
    }
  }
}

function markPasswordForgotten () {
  return (dispatch) => {
    return background.markPasswordForgotten(() => {
      dispatch(actions.hideLoadingIndication())
      dispatch(actions.forgotPassword())
      forceUpdateMetamaskState(dispatch)
    })
  }
}

function unMarkPasswordForgotten () {
  return dispatch => {
    return new Promise(resolve => {
      background.unMarkPasswordForgotten(() => {
        dispatch(actions.forgotPassword(false))
        resolve()
      })
    })
      .then(() => forceUpdateMetamaskState(dispatch))
  }
}

function forgotPassword (forgotPasswordState = true) {
  return {
    type: actions.FORGOT_PASSWORD,
    value: forgotPasswordState,
  }
}


function setNewAccountForm (formToSelect) {
  return {
    type: actions.SET_NEW_ACCOUNT_FORM,
    formToSelect,
  }
}

function closeWelcomeScreen () {
  return {
    type: actions.CLOSE_WELCOME_SCREEN,
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

function unlockFailed (message) {
  return {
    type: actions.UNLOCK_FAILED,
    value: message,
  }
}

function unlockSucceeded (message) {
  return {
    type: actions.UNLOCK_SUCCEEDED,
    value: message,
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

const backgroundSetLocked = () => {
  return new Promise((resolve, reject) => {
    background.setLocked(error => {
      if (error) {
        return reject(error)
      }
      resolve()
    })
  })
}

function lockMetamask () {
  log.debug(`background.setLocked`)

  return dispatch => {
    dispatch(actions.showLoadingIndication())

    return backgroundSetLocked()
      .then(() => updateMetamaskStateFromBackground())
      .catch(error => {
        dispatch(actions.displayWarning(error.message))
        return Promise.reject(error)
      })
      .then(newState => {
        dispatch(actions.updateMetamaskState(newState))
        dispatch(actions.hideLoadingIndication())
        dispatch({ type: actions.LOCK_METAMASK })
      })
      .catch(() => {
        dispatch(actions.hideLoadingIndication())
        dispatch({ type: actions.LOCK_METAMASK })
      })
  }
}

function setCurrentAccountTab (newTabName) {
  log.debug(`background.setCurrentAccountTab: ${newTabName}`)
  return callBackgroundThenUpdateNoSpinner(background.setCurrentAccountTab, newTabName)
}

function setSelectedToken (tokenAddress) {
  return {
    type: actions.SET_SELECTED_TOKEN,
    value: tokenAddress || null,
  }
}

function setSelectedAddress (address) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    log.debug(`background.setSelectedAddress`)
    background.setSelectedAddress(address, (err) => {
      dispatch(actions.hideLoadingIndication())
      if (err) {
        return dispatch(actions.displayWarning(err.message))
      }
    })
  }
}

function showAccountDetail (address) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    log.debug(`background.setSelectedAddress`)
    background.setSelectedAddress(address, (err, tokens) => {
      dispatch(actions.hideLoadingIndication())
      if (err) {
        return dispatch(actions.displayWarning(err.message))
      }
      dispatch(updateTokens(tokens))
      dispatch({
        type: actions.SHOW_ACCOUNT_DETAIL,
        value: address,
      })
      dispatch(actions.setSelectedToken())
    })
  }
}

function showAccountsPage () {
  return {
    type: actions.SHOW_ACCOUNTS_PAGE,
  }
}

function showConfTxPage ({ transForward = true, id }) {
  return {
    type: actions.SHOW_CONF_TX_PAGE,
    transForward,
    id,
  }
}

function showConfigPage (transitionForward = true) {
  return {
    type: actions.SHOW_CONFIG_PAGE,
    value: transitionForward,
  }
}

function showAddTokenPage (transitionForward = true) {
  return {
    type: actions.SHOW_ADD_TOKEN_PAGE,
    value: transitionForward,
  }
}

function addToken (address, symbol, decimals, image) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      background.addToken(address, symbol, decimals, image, (err, tokens) => {
        dispatch(actions.hideLoadingIndication())
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        dispatch(actions.updateTokens(tokens))
        resolve(tokens)
      })
    })
  }
}

function removeToken (address) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      background.removeToken(address, (err, tokens) => {
        dispatch(actions.hideLoadingIndication())
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        dispatch(actions.updateTokens(tokens))
        resolve(tokens)
      })
    })
  }
}

function addTokens (tokens) {
  return dispatch => {
    if (Array.isArray(tokens)) {
      dispatch(actions.setSelectedToken(getTokenAddressFromTokenObject(tokens[0])))
      return Promise.all(tokens.map(({ address, symbol, decimals }) => (
        dispatch(addToken(address, symbol, decimals))
      )))
    } else {
      dispatch(actions.setSelectedToken(getTokenAddressFromTokenObject(tokens)))
      return Promise.all(
        Object
          .entries(tokens)
          .map(([_, { address, symbol, decimals }]) => (
            dispatch(addToken(address, symbol, decimals))
          ))
      )
    }
  }
}

function removeSuggestedTokens () {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve) => {
      background.removeSuggestedTokens((err, suggestedTokens) => {
        dispatch(actions.hideLoadingIndication())
        if (err) {
          dispatch(actions.displayWarning(err.message))
        }
        dispatch(actions.clearPendingTokens())
        if (global.METAMASK_UI_TYPE === ENVIRONMENT_TYPE_NOTIFICATION) {
          return global.platform.closeCurrentWindow()
        }
        resolve(suggestedTokens)
      })
    })
      .then(() => updateMetamaskStateFromBackground())
      .then(suggestedTokens => dispatch(actions.updateMetamaskState({ ...suggestedTokens })))
  }
}

function addKnownMethodData (fourBytePrefix, methodData) {
  return () => {
    background.addKnownMethodData(fourBytePrefix, methodData)
  }
}

function updateTokens (newTokens) {
  return {
    type: actions.UPDATE_TOKENS,
    newTokens,
  }
}

function clearPendingTokens () {
  return {
    type: actions.CLEAR_PENDING_TOKENS,
  }
}

function retryTransaction (txId, gasPrice) {
  log.debug(`background.retryTransaction`)
  let newTxId

  return dispatch => {
    return new Promise((resolve, reject) => {
      background.retryTransaction(txId, gasPrice, (err, newState) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        const { selectedAddressTxList } = newState
        const { id } = selectedAddressTxList[selectedAddressTxList.length - 1]
        newTxId = id
        resolve(newState)
      })
    })
      .then(newState => dispatch(actions.updateMetamaskState(newState)))
      .then(() => newTxId)
  }
}

function createCancelTransaction (txId, customGasPrice) {
  log.debug('background.cancelTransaction')
  let newTxId

  return dispatch => {
    return new Promise((resolve, reject) => {
      background.createCancelTransaction(txId, customGasPrice, (err, newState) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        const { selectedAddressTxList } = newState
        const { id } = selectedAddressTxList[selectedAddressTxList.length - 1]
        newTxId = id
        resolve(newState)
      })
    })
      .then(newState => dispatch(actions.updateMetamaskState(newState)))
      .then(() => newTxId)
  }
}

function createSpeedUpTransaction (txId, customGasPrice) {
  log.debug('background.createSpeedUpTransaction')
  let newTx

  return dispatch => {
    return new Promise((resolve, reject) => {
      background.createSpeedUpTransaction(txId, customGasPrice, (err, newState) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        const { selectedAddressTxList } = newState
        newTx = selectedAddressTxList[selectedAddressTxList.length - 1]
        resolve(newState)
      })
    })
      .then(newState => dispatch(actions.updateMetamaskState(newState)))
      .then(() => newTx)
  }
}

function createRetryTransaction (txId, customGasPrice) {
  log.debug('background.createRetryTransaction')
  let newTx

  return dispatch => {
    return new Promise((resolve, reject) => {
      background.createSpeedUpTransaction(txId, customGasPrice, (err, newState) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        const { selectedAddressTxList } = newState
        newTx = selectedAddressTxList[selectedAddressTxList.length - 1]
        resolve(newState)
      })
    })
      .then(newState => dispatch(actions.updateMetamaskState(newState)))
      .then(() => newTx)
  }
}

//
// config
//

function setProviderType (type) {
  return (dispatch, getState) => {
    const { type: currentProviderType } = getState().metamask.provider
    log.debug(`background.setProviderType`, type)
    background.setProviderType(type, (err) => {
      if (err) {
        log.error(err)
        return dispatch(actions.displayWarning('Had a problem changing networks!'))
      }
      dispatch(setPreviousProvider(currentProviderType))
      dispatch(actions.updateProviderType(type))
      dispatch(actions.setSelectedToken())
    })

  }
}

function updateProviderType (type) {
  return {
    type: actions.SET_PROVIDER_TYPE,
    value: type,
  }
}

function setPreviousProvider (type) {
  return {
    type: actions.SET_PREVIOUS_PROVIDER,
    value: type,
  }
}

function updateAndSetCustomRpc (newRpc, chainId, ticker = 'ETH', nickname, rpcPrefs) {
  return (dispatch) => {
    log.debug(`background.updateAndSetCustomRpc: ${newRpc} ${chainId} ${ticker} ${nickname}`)
    background.updateAndSetCustomRpc(newRpc, chainId, ticker, nickname || newRpc, rpcPrefs, (err) => {
      if (err) {
        log.error(err)
        return dispatch(actions.displayWarning('Had a problem changing networks!'))
      }
      dispatch({
        type: actions.SET_RPC_TARGET,
        value: newRpc,
      })
    })
  }
}

function editRpc (oldRpc, newRpc, chainId, ticker = 'ETH', nickname, rpcPrefs) {
  return (dispatch) => {
    log.debug(`background.delRpcTarget: ${oldRpc}`)
    background.delCustomRpc(oldRpc, (err) => {
      if (err) {
        log.error(err)
        return dispatch(actions.displayWarning('Had a problem removing network!'))
      }
      dispatch(actions.setSelectedToken())
      background.updateAndSetCustomRpc(newRpc, chainId, ticker, nickname || newRpc, rpcPrefs, (err) => {
        if (err) {
          log.error(err)
          return dispatch(actions.displayWarning('Had a problem changing networks!'))
        }
        dispatch({
          type: actions.SET_RPC_TARGET,
          value: newRpc,
        })
      })
    })
  }
}

function setRpcTarget (newRpc, chainId, ticker = 'ETH', nickname) {
  return (dispatch) => {
    log.debug(`background.setRpcTarget: ${newRpc} ${chainId} ${ticker} ${nickname}`)
    background.setCustomRpc(newRpc, chainId, ticker, nickname || newRpc, (err) => {
      if (err) {
        log.error(err)
        return dispatch(actions.displayWarning('Had a problem changing networks!'))
      }
      dispatch(actions.setSelectedToken())
    })
  }
}

function delRpcTarget (oldRpc) {
  return (dispatch) => {
    log.debug(`background.delRpcTarget: ${oldRpc}`)
    return new Promise((resolve, reject) => {
      background.delCustomRpc(oldRpc, (err) => {
        if (err) {
          log.error(err)
          dispatch(actions.displayWarning('Had a problem removing network!'))
          return reject(err)
        }
        dispatch(actions.setSelectedToken())
        resolve()
      })
    })
  }
}

// Calls the addressBookController to add a new address.
function addToAddressBook (recipient, nickname = '', memo = '') {
  log.debug(`background.addToAddressBook`)

  return (dispatch, getState) => {
    const chainId = getState().metamask.network
    background.setAddressBook(checksumAddress(recipient), nickname, chainId, memo, (err, set) => {
      if (err) {
        log.error(err)
        dispatch(displayWarning('Address book failed to update'))
        throw err
      }
      if (!set) {
        return dispatch(displayWarning('Address book failed to update'))
      }
    })

  }
}

/**
 * @description Calls the addressBookController to remove an existing address.
 * @param {String} addressToRemove - Address of the entry to remove from the address book
 */
function removeFromAddressBook (chainId, addressToRemove) {
  log.debug(`background.removeFromAddressBook`)

  return () => {
    background.removeFromAddressBook(chainId, checksumAddress(addressToRemove))
  }
}

function useEtherscanProvider () {
  log.debug(`background.useEtherscanProvider`)
  background.useEtherscanProvider()
  return {
    type: actions.USE_ETHERSCAN_PROVIDER,
  }
}

function showNetworkDropdown () {
  return {
    type: actions.NETWORK_DROPDOWN_OPEN,
  }
}

function hideNetworkDropdown () {
  return {
    type: actions.NETWORK_DROPDOWN_CLOSE,
  }
}


function showModal (payload) {
  return {
    type: actions.MODAL_OPEN,
    payload,
  }
}

function hideModal (payload) {
  return {
    type: actions.MODAL_CLOSE,
    payload,
  }
}

function closeCurrentNotificationWindow () {
  return (dispatch, getState) => {
    if (global.METAMASK_UI_TYPE === ENVIRONMENT_TYPE_NOTIFICATION &&
      !hasUnconfirmedTransactions(getState())) {
      global.platform.closeCurrentWindow()

      dispatch(closeNotifacationWindow())
    }
  }
}

function closeNotifacationWindow () {
  return {
    type: actions.CLOSE_NOTIFICATION_WINDOW,
  }
}

function showSidebar ({ transitionName, type, props }) {
  return {
    type: actions.SIDEBAR_OPEN,
    value: {
      transitionName,
      type,
      props,
    },
  }
}

function hideSidebar () {
  return {
    type: actions.SIDEBAR_CLOSE,
  }
}

function showAlert (msg) {
  return {
    type: actions.ALERT_OPEN,
    value: msg,
  }
}

function hideAlert () {
  return {
    type: actions.ALERT_CLOSE,
  }
}

/**
 * This action will receive two types of values via qrCodeData
 * an object with the following structure {type, values}
 * or null (used to clear the previous value)
 */
function qrCodeDetected (qrCodeData) {
  return {
    type: actions.QR_CODE_DETECTED,
    value: qrCodeData,
  }
}

function showLoadingIndication (message) {
  return {
    type: actions.SHOW_LOADING,
    value: message,
  }
}

function setHardwareWalletDefaultHdPath ({ device, path }) {
  return {
    type: actions.SET_HARDWARE_WALLET_DEFAULT_HD_PATH,
    value: { device, path },
  }
}

function hideLoadingIndication () {
  return {
    type: actions.HIDE_LOADING,
  }
}

function showSubLoadingIndication () {
  return {
    type: actions.SHOW_SUB_LOADING_INDICATION,
  }
}

function hideSubLoadingIndication () {
  return {
    type: actions.HIDE_SUB_LOADING_INDICATION,
  }
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

function exportAccount (password, address) {
  return function (dispatch) {
    dispatch(actions.showLoadingIndication())

    log.debug(`background.submitPassword`)
    return new Promise((resolve, reject) => {
      background.submitPassword(password, function (err) {
        if (err) {
          log.error('Error in submiting password.')
          dispatch(actions.hideLoadingIndication())
          dispatch(actions.displayWarning('Incorrect Password.'))
          return reject(err)
        }
        log.debug(`background.exportAccount`)
        return background.exportAccount(address, function (err, result) {
          dispatch(actions.hideLoadingIndication())

          if (err) {
            log.error(err)
            dispatch(actions.displayWarning('Had a problem exporting the account.'))
            return reject(err)
          }

          dispatch(actions.showPrivateKey(result))

          return resolve(result)
        })
      })
    })
  }
}

function showPrivateKey (key) {
  return {
    type: actions.SHOW_PRIVATE_KEY,
    value: key,
  }
}

function setAccountLabel (account, label) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    log.debug(`background.setAccountLabel`)

    return new Promise((resolve, reject) => {
      background.setAccountLabel(account, label, (err) => {
        dispatch(actions.hideLoadingIndication())

        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        dispatch({
          type: actions.SET_ACCOUNT_LABEL,
          value: { account, label },
        })

        resolve(account)
      })
    })
  }
}

function showSendPage () {
  return {
    type: actions.SHOW_SEND_PAGE,
  }
}

function showSendTokenPage () {
  return {
    type: actions.SHOW_SEND_TOKEN_PAGE,
  }
}

function buyEth (opts) {
  return (dispatch) => {
    const url = getBuyEthUrl(opts)
    global.platform.openWindow({ url })
    dispatch({
      type: actions.BUY_ETH,
    })
  }
}

function pairUpdate (coin) {
  return (dispatch) => {
    dispatch(actions.showSubLoadingIndication())
    dispatch(actions.hideWarning())
    shapeShiftRequest('marketinfo', { pair: `${coin.toLowerCase()}_eth` }, (mktResponse) => {
      dispatch(actions.hideSubLoadingIndication())
      if (mktResponse.error) {
        return dispatch(actions.displayWarning(mktResponse.error))
      }
      dispatch({
        type: actions.PAIR_UPDATE,
        value: {
          marketinfo: mktResponse,
        },
      })
    })
  }
}

function showQrView (data, message) {
  return {
    type: actions.SHOW_QR_VIEW,
    value: {
      message: message,
      data: data,
    },
  }
}
function reshowQrCode (data, coin) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    shapeShiftRequest('marketinfo', { pair: `${coin.toLowerCase()}_eth` }, (mktResponse) => {
      if (mktResponse.error) {
        return dispatch(actions.displayWarning(mktResponse.error))
      }

      const message = [
        `Deposit your ${coin} to the address below:`,
        `Deposit Limit: ${mktResponse.limit}`,
        `Deposit Minimum:${mktResponse.minimum}`,
      ]

      dispatch(actions.hideLoadingIndication())
      return dispatch(actions.showQrView(data, message))
    })
  }
}

function shapeShiftRequest (query, options = {}, cb) {
  let queryResponse, method
  options.method ? method = options.method : method = 'GET'

  const requestListner = function () {
    try {
      queryResponse = JSON.parse(this.responseText)
      if (cb) {
        cb(queryResponse)
      }
      return queryResponse
    } catch (e) {
      if (cb) {
        cb({ error: e })
      }
      return e
    }
  }

  const shapShiftReq = new XMLHttpRequest()
  shapShiftReq.addEventListener('load', requestListner)
  shapShiftReq.open(method, `https://shapeshift.io/${query}/${options.pair ? options.pair : ''}`, true)

  if (options.method === 'POST') {
    const jsonObj = JSON.stringify(options.data)
    shapShiftReq.setRequestHeader('Content-Type', 'application/json')
    return shapShiftReq.send(jsonObj)
  } else {
    return shapShiftReq.send()
  }
}

function setFeatureFlag (feature, activated, notificationType) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      background.setFeatureFlag(feature, activated, (err, updatedFeatureFlags) => {
        dispatch(actions.hideLoadingIndication())
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        dispatch(actions.updateFeatureFlags(updatedFeatureFlags))
        notificationType && dispatch(actions.showModal({ name: notificationType }))
        resolve(updatedFeatureFlags)
      })
    })
  }
}

function updateFeatureFlags (updatedFeatureFlags) {
  return {
    type: actions.UPDATE_FEATURE_FLAGS,
    value: updatedFeatureFlags,
  }
}

function setPreference (preference, value) {
  return dispatch => {
    dispatch(actions.showLoadingIndication())
    return new Promise((resolve, reject) => {
      background.setPreference(preference, value, (err, updatedPreferences) => {
        dispatch(actions.hideLoadingIndication())

        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        dispatch(actions.updatePreferences(updatedPreferences))
        resolve(updatedPreferences)
      })
    })
  }
}

function updatePreferences (value) {
  return {
    type: actions.UPDATE_PREFERENCES,
    value,
  }
}

function setUseNativeCurrencyAsPrimaryCurrencyPreference (value) {
  return setPreference('useNativeCurrencyAsPrimaryCurrency', value)
}

function setShowFiatConversionOnTestnetsPreference (value) {
  return setPreference('showFiatInTestnets', value)
}

function setAutoLogoutTimeLimit (value) {
  return setPreference('autoLogoutTimeLimit', value)
}

function setCompletedOnboarding () {
  return async dispatch => {
    dispatch(actions.showLoadingIndication())

    try {
      await pify(background.completeOnboarding).call(background)
    } catch (err) {
      dispatch(actions.displayWarning(err.message))
      throw err
    }

    dispatch(actions.completeOnboarding())
    dispatch(actions.hideLoadingIndication())
  }
}

function completeOnboarding () {
  return {
    type: actions.COMPLETE_ONBOARDING,
  }
}

function setNetworkNonce (networkNonce) {
  return {
    type: actions.SET_NETWORK_NONCE,
    value: networkNonce,
  }
}

function updateNetworkNonce (address) {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      global.ethQuery.getTransactionCount(address, (err, data) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        dispatch(setNetworkNonce(data))
        resolve(data)
      })
    })
  }
}

function setMouseUserState (isMouseUser) {
  return {
    type: actions.SET_MOUSE_USER_STATE,
    value: isMouseUser,
  }
}

// Call Background Then Update
//
// A function generator for a common pattern wherein:
// We show loading indication.
// We call a background method.
// We hide loading indication.
// If it errored, we show a warning.
// If it didn't, we update the state.
function callBackgroundThenUpdateNoSpinner (method, ...args) {
  return (dispatch) => {
    method.call(background, ...args, (err) => {
      if (err) {
        return dispatch(actions.displayWarning(err.message))
      }
      forceUpdateMetamaskState(dispatch)
    })
  }
}

function forceUpdateMetamaskState (dispatch) {
  log.debug(`background.getState`)
  return new Promise((resolve, reject) => {
    background.getState((err, newState) => {
      if (err) {
        dispatch(actions.displayWarning(err.message))
        return reject(err)
      }

      dispatch(actions.updateMetamaskState(newState))
      resolve(newState)
    })
  })
}

function toggleAccountMenu () {
  return {
    type: actions.TOGGLE_ACCOUNT_MENU,
  }
}

function setParticipateInMetaMetrics (val) {
  return (dispatch) => {
    log.debug(`background.setParticipateInMetaMetrics`)
    return new Promise((resolve, reject) => {
      background.setParticipateInMetaMetrics(val, (err, metaMetricsId) => {
        log.debug(err)
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        dispatch({
          type: actions.SET_PARTICIPATE_IN_METAMETRICS,
          value: val,
        })

        resolve([val, metaMetricsId])
      })
    })
  }
}

function setMetaMetricsSendCount (val) {
  return (dispatch) => {
    log.debug(`background.setMetaMetricsSendCount`)
    return new Promise((resolve, reject) => {
      background.setMetaMetricsSendCount(val, (err) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }

        dispatch({
          type: actions.SET_METAMETRICS_SEND_COUNT,
          value: val,
        })

        resolve(val)
      })
    })
  }
}

function setUseBlockie (val) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    log.debug(`background.setUseBlockie`)
    background.setUseBlockie(val, (err) => {
      dispatch(actions.hideLoadingIndication())
      if (err) {
        return dispatch(actions.displayWarning(err.message))
      }
    })
    dispatch({
      type: actions.SET_USE_BLOCKIE,
      value: val,
    })
  }
}

function setUseNonceField (val) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    log.debug(`background.setUseNonceField`)
    background.setUseNonceField(val, (err) => {
      dispatch(actions.hideLoadingIndication())
      if (err) {
        return dispatch(actions.displayWarning(err.message))
      }
    })
    dispatch({
      type: actions.SET_USE_NONCEFIELD,
      value: val,
    })
  }
}

function setIpfsGateway (val) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    log.debug(`background.setIpfsGateway`)
    background.setIpfsGateway(val, (err) => {
      dispatch(actions.hideLoadingIndication())
      if (err) {
        return dispatch(actions.displayWarning(err.message))
      } else {
        dispatch({
          type: actions.SET_IPFS_GATEWAY,
          value: val,
        })
      }
    })
  }
}

function updateCurrentLocale (key) {
  return (dispatch) => {
    dispatch(actions.showLoadingIndication())
    return fetchLocale(key)
      .then((localeMessages) => {
        log.debug(`background.setCurrentLocale`)
        background.setCurrentLocale(key, (err, textDirection) => {
          if (err) {
            dispatch(actions.hideLoadingIndication())
            return dispatch(actions.displayWarning(err.message))
          }
          switchDirection(textDirection)
          dispatch(actions.setCurrentLocale(key, localeMessages))
          dispatch(actions.hideLoadingIndication())
        })
      })
  }
}

function setCurrentLocale (locale, messages) {
  return {
    type: actions.SET_CURRENT_LOCALE,
    value: {
      locale,
      messages,
    },
  }
}

function setPendingTokens (pendingTokens) {
  const { customToken = {}, selectedTokens = {} } = pendingTokens
  const { address, symbol, decimals } = customToken
  const tokens = address && symbol && decimals
    ? { ...selectedTokens, [address]: { ...customToken, isCustom: true } }
    : selectedTokens

  return {
    type: actions.SET_PENDING_TOKENS,
    payload: tokens,
  }
}

// Permissions

/**
 * Approves the permissions request.
 * @param {Object} request - The permissions request to approve
 * @param {string[]} accounts - The accounts to expose, if any.
 */
function approvePermissionsRequest (request, accounts) {
  return () => {
    background.approvePermissionsRequest(request, accounts)
  }
}

/**
 * Rejects the permissions request with the given ID.
 * @param {string} requestId - The id of the request to be rejected
 */
function rejectPermissionsRequest (requestId) {
  return () => {
    background.rejectPermissionsRequest(requestId)
  }
}

/**
 * Exposes the given account(s) to the given origin.
 * Call ONLY as a result of direct user action.
 */
function legacyExposeAccounts (origin, accounts) {
  return () => {
    return background.legacyExposeAccounts(origin, accounts)
  }
}

/**
 * Clears the given permissions for the given origin.
 */
function removePermissionsFor (domains) {
  return () => {
    background.removePermissionsFor(domains)
  }
}

/**
 * Clears all permissions for all domains.
 */
function clearPermissions () {
  return () => {
    background.clearPermissions()
  }
}

function setFirstTimeFlowType (type) {
  return (dispatch) => {
    log.debug(`background.setFirstTimeFlowType`)
    background.setFirstTimeFlowType(type, (err) => {
      if (err) {
        return dispatch(actions.displayWarning(err.message))
      }
    })
    dispatch({
      type: actions.SET_FIRST_TIME_FLOW_TYPE,
      value: type,
    })
  }
}

function setSelectedSettingsRpcUrl (newRpcUrl) {
  return {
    type: actions.SET_SELECTED_SETTINGS_RPC_URL,
    value: newRpcUrl,
  }
}

function setNetworksTabAddMode (isInAddMode) {
  return {
    type: actions.SET_NETWORKS_TAB_ADD_MODE,
    value: isInAddMode,
  }
}

function setLastActiveTime () {
  return (dispatch) => {
    background.setLastActiveTime((err) => {
      if (err) {
        return dispatch(actions.displayWarning(err.message))
      }
    })
  }
}

function setMkrMigrationReminderTimestamp (timestamp) {
  return (dispatch) => {
    background.setMkrMigrationReminderTimestamp(timestamp, (err) => {
      if (err) {
        return dispatch(actions.displayWarning(err.message))
      }
    })
  }
}

function loadingMethoDataStarted () {
  return {
    type: actions.LOADING_METHOD_DATA_STARTED,
  }
}

function loadingMethoDataFinished () {
  return {
    type: actions.LOADING_METHOD_DATA_FINISHED,
  }
}

function getContractMethodData (data = '') {
  return (dispatch, getState) => {
    const prefixedData = ethUtil.addHexPrefix(data)
    const fourBytePrefix = prefixedData.slice(0, 10)
    const { knownMethodData } = getState().metamask
    if (knownMethodData && knownMethodData[fourBytePrefix]) {
      return Promise.resolve(knownMethodData[fourBytePrefix])
    }

    dispatch(actions.loadingMethoDataStarted())
    log.debug(`loadingMethodData`)

    return getMethodDataAsync(fourBytePrefix)
      .then(({ name, params }) => {
        dispatch(actions.loadingMethoDataFinished())

        background.addKnownMethodData(fourBytePrefix, { name, params })

        return { name, params }
      })
  }
}

function loadingTokenParamsStarted () {
  return {
    type: actions.LOADING_TOKEN_PARAMS_STARTED,
  }
}

function loadingTokenParamsFinished () {
  return {
    type: actions.LOADING_TOKEN_PARAMS_FINISHED,
  }
}

function getTokenParams (tokenAddress) {
  return (dispatch, getState) => {
    const existingTokens = getState().metamask.tokens
    const existingToken = existingTokens.find(({ address }) => tokenAddress === address)

    if (existingToken) {
      return Promise.resolve({
        symbol: existingToken.symbol,
        decimals: existingToken.decimals,
      })
    }

    dispatch(actions.loadingTokenParamsStarted())
    log.debug(`loadingTokenParams`)


    return fetchSymbolAndDecimals(tokenAddress, existingTokens)
      .then(({ symbol, decimals }) => {
        dispatch(actions.addToken(tokenAddress, symbol, decimals))
        dispatch(actions.loadingTokenParamsFinished())
      })
  }
}

function setSeedPhraseBackedUp (seedPhraseBackupState) {
  return (dispatch) => {
    log.debug(`background.setSeedPhraseBackedUp`)
    return new Promise((resolve, reject) => {
      background.setSeedPhraseBackedUp(seedPhraseBackupState, (err) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        return forceUpdateMetamaskState(dispatch)
          .then(resolve)
          .catch(reject)
      })
    })
  }
}

function hideSeedPhraseBackupAfterOnboarding () {
  return {
    type: actions.HIDE_SEED_PHRASE_BACKUP_AFTER_ONBOARDING,
  }
}

function initializeThreeBox () {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      background.initializeThreeBox((err) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        resolve()
      })
    })
  }
}

function setShowRestorePromptToFalse () {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      background.setShowRestorePromptToFalse((err) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        resolve()
      })
    })
  }
}

function turnThreeBoxSyncingOn () {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      background.turnThreeBoxSyncingOn((err) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        resolve()
      })
    })
  }
}

function restoreFromThreeBox (accountAddress) {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      background.restoreFromThreeBox(accountAddress, (err) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        resolve()
      })
    })
  }
}

function getThreeBoxLastUpdated () {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      background.getThreeBoxLastUpdated((err, lastUpdated) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        resolve(lastUpdated)
      })
    })
  }
}

function setThreeBoxSyncingPermission (threeBoxSyncingAllowed) {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      background.setThreeBoxSyncingPermission(threeBoxSyncingAllowed, (err) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        resolve()
      })
    })
  }
}

function turnThreeBoxSyncingOnAndInitialize () {
  return async (dispatch) => {
    await dispatch(setThreeBoxSyncingPermission(true))
    await dispatch(turnThreeBoxSyncingOn())
    await dispatch(initializeThreeBox(true))
  }
}

function setNextNonce (nextNonce) {
  return {
    type: actions.SET_NEXT_NONCE,
    value: nextNonce,
  }
}

function getNextNonce () {
  return (dispatch, getState) => {
    const address = getState().metamask.selectedAddress
    return new Promise((resolve, reject) => {
      background.getNextNonce(address, (err, nextNonce) => {
        if (err) {
          dispatch(actions.displayWarning(err.message))
          return reject(err)
        }
        dispatch(setNextNonce(nextNonce))
        resolve(nextNonce)
      })
    })
  }
}

function setRequestAccountTabIds (requestAccountTabIds) {
  return {
    type: actions.SET_REQUEST_ACCOUNT_TABS,
    value: requestAccountTabIds,
  }
}

function getRequestAccountTabIds () {
  return async (dispatch) => {
    const requestAccountTabIds = await pify(background.getRequestAccountTabIds).call(background)
    dispatch(setRequestAccountTabIds(requestAccountTabIds))
  }
}

function setOpenMetamaskTabsIDs (openMetaMaskTabIDs) {
  return {
    type: actions.SET_OPEN_METAMASK_TAB_IDS,
    value: openMetaMaskTabIDs,
  }
}

function getOpenMetamaskTabsIds () {
  return async (dispatch) => {
    const openMetaMaskTabIDs = await pify(background.getOpenMetamaskTabsIds).call(background)
    dispatch(setOpenMetamaskTabsIDs(openMetaMaskTabIDs))
  }
}

function setCurrentWindowTab (currentWindowTab) {
  return {
    type: actions.SET_CURRENT_WINDOW_TAB,
    value: currentWindowTab,
  }
}


function getCurrentWindowTab () {
  return async (dispatch) => {
    const currentWindowTab = await global.platform.currentTab()
    dispatch(setCurrentWindowTab(currentWindowTab))
  }
}

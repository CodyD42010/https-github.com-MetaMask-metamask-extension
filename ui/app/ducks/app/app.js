import txHelper from '../../../lib/tx-helper'
import log from 'loglevel'
import { actionConstants } from '../../store/actions'

const actions = actionConstants

// Actions
const SET_THREEBOX_LAST_UPDATED = 'metamask/app/SET_THREEBOX_LAST_UPDATED'

export default function reduceApp (state, action) {
  log.debug('App Reducer got ' + action.type)
  // clone and defaults
  const selectedAddress = state.metamask.selectedAddress
  const hasUnconfActions = checkUnconfActions(state)
  let name = 'accounts'
  if (selectedAddress) {
    name = 'accountDetail'
  }

  if (hasUnconfActions) {
    log.debug('pending txs detected, defaulting to conf-tx view.')
    name = 'confTx'
  }

  const defaultView = {
    name,
    detailView: null,
    context: selectedAddress,
  }

  // default state
  const appState = Object.assign(
    {
      shouldClose: false,
      menuOpen: false,
      modal: {
        open: false,
        modalState: {
          name: null,
          props: {},
        },
        previousModalState: {
          name: null,
        },
      },
      sidebar: {
        isOpen: false,
        transitionName: '',
        type: '',
        props: {},
      },
      alertOpen: false,
      alertMessage: null,
      qrCodeData: null,
      networkDropdownOpen: false,
      currentView: defaultView,
      accountDetail: {
        subview: 'transactions',
      },
      // Used to render transition direction
      transForward: true,
      // Used to display loading indicator
      isLoading: false,
      // Used to display error text
      warning: null,
      buyView: {},
      isMouseUser: false,
      gasIsLoading: false,
      networkNonce: null,
      defaultHdPaths: {
        trezor: `m/44'/60'/0'/0`,
        ledger: `m/44'/60'/0'/0/0`,
      },
      lastSelectedProvider: null,
      networksTabSelectedRpcUrl: '',
      networksTabIsInAddMode: false,
      loadingMethodData: false,
      show3BoxModalAfterImport: false,
      threeBoxLastUpdated: null,
      requestAccountTabs: {},
      openMetaMaskTabs: {},
      currentWindowTab: {},
    },
    state.appState
  )

  switch (action.type) {
    // dropdown methods
    case actions.NETWORK_DROPDOWN_OPEN:
      return {
        ...appState,
        networkDropdownOpen: true,
      }

    case actions.NETWORK_DROPDOWN_CLOSE:
      return {
        ...appState,
        networkDropdownOpen: false,
      }

    // sidebar methods
    case actions.SIDEBAR_OPEN:
      return {
        ...appState,
        sidebar: {
          ...action.value,
          isOpen: true,
        },
      }

    case actions.SIDEBAR_CLOSE:
      return {
        ...appState,
        sidebar: {
          ...appState.sidebar,
          isOpen: false,
        },
      }

    // alert methods
    case actions.ALERT_OPEN:
      return {
        ...appState,
        alertOpen: true,
        alertMessage: action.value,
      }

    case actions.ALERT_CLOSE:
      return {
        ...appState,
        alertOpen: false,
        alertMessage: null,
      }

    // qr scanner methods
    case actions.QR_CODE_DETECTED:
      return {
        ...appState,
        qrCodeData: action.value,
      }

    // modal methods:
    case actions.MODAL_OPEN:
      const { name, ...modalProps } = action.payload

      return {
        ...appState,
        modal: {
          open: true,
          modalState: {
            name: name,
            props: { ...modalProps },
          },
          previousModalState: { ...appState.modal.modalState },
        },
      }

    case actions.MODAL_CLOSE:
      return {
        ...appState,
        modal: Object.assign(
          state.appState.modal,
          { open: false },
          { modalState: { name: null, props: {} } },
          { previousModalState: appState.modal.modalState }
        ),
      }

    // transition methods
    case actions.TRANSITION_FORWARD:
      return {
        ...appState,
        transForward: true,
      }

    case actions.FORGOT_PASSWORD:
      const newState = {
        ...appState,
        forgottenPassword: action.value,
      }

      if (action.value) {
        newState.currentView = {
          name: 'restoreVault',
        }
      }

      return newState

    case actions.SHOW_SEND_TOKEN_PAGE:
      return {
        ...appState,
        currentView: {
          name: 'sendToken',
          context: appState.currentView.context,
        },
        transForward: true,
        warning: null,
      }

      // unlock

    case actions.UNLOCK_METAMASK:
      return {
        ...appState,
        forgottenPassword: appState.forgottenPassword
          ? !appState.forgottenPassword
          : null,
        detailView: {},
        transForward: true,
        isLoading: false,
        warning: null,
      }

    case actions.LOCK_METAMASK:
      return {
        ...appState,
        currentView: defaultView,
        transForward: false,
        warning: null,
      }

      // accounts

    case actions.GO_HOME:
      return {
        ...appState,
        currentView: {
          ...appState.currentView,
          name: 'accountDetail',
        },
        accountDetail: {
          subview: 'transactions',
          accountExport: 'none',
          privateKey: '',
        },
        transForward: false,
        warning: null,
      }

    case actions.SHOW_ACCOUNT_DETAIL:
      return {
        ...appState,
        forgottenPassword: appState.forgottenPassword
          ? !appState.forgottenPassword
          : null,
        currentView: {
          name: 'accountDetail',
          context: action.value,
        },
        accountDetail: {
          subview: 'transactions',
          accountExport: 'none',
          privateKey: '',
        },
        transForward: false,
      }

    case actions.SHOW_ACCOUNTS_PAGE:
      return {
        ...appState,
        currentView: {
          name: 'accounts',
        },
        transForward: true,
        isLoading: false,
        warning: null,
        scrollToBottom: false,
        forgottenPassword: false,
      }

    case actions.SHOW_CONF_TX_PAGE:
      return {
        ...appState,
        currentView: {
          name: 'confTx',
          context: action.id ? indexForPending(state, action.id) : 0,
        },
        transForward: action.transForward,
        warning: null,
        isLoading: false,
      }

    case actions.COMPLETED_TX:
      log.debug('reducing COMPLETED_TX for tx ' + action.value)
      const otherUnconfActions = getUnconfActionList(state).filter(
        tx => tx.id !== action.value
      )
      const hasOtherUnconfActions = otherUnconfActions.length > 0

      if (hasOtherUnconfActions) {
        log.debug('reducer detected txs - rendering confTx view')
        return {
          ...appState,
          transForward: false,
          currentView: {
            name: 'confTx',
            context: 0,
          },
          warning: null,
        }
      } else {
        log.debug('attempting to close popup')
        return {
          ...appState,
          // indicate notification should close
          shouldClose: true,
          transForward: false,
          warning: null,
          currentView: {
            name: 'accountDetail',
            context: state.metamask.selectedAddress,
          },
          accountDetail: {
            subview: 'transactions',
          },
        }
      }

    case actions.TRANSACTION_ERROR:
      return {
        ...appState,
        currentView: {
          name: 'confTx',
          errorMessage: 'There was a problem submitting this transaction.',
        },
      }

    case actions.UNLOCK_FAILED:
      return {
        ...appState,
        warning: action.value || 'Incorrect password. Try again.',
      }

    case actions.UNLOCK_SUCCEEDED:
      return {
        ...appState,
        warning: '',
      }

    case actions.SET_HARDWARE_WALLET_DEFAULT_HD_PATH:
      const { device, path } = action.value
      const newDefaults = { ...appState.defaultHdPaths }
      newDefaults[device] = path

      return {
        ...appState,
        defaultHdPaths: newDefaults,
      }

    case actions.SHOW_LOADING:
      return {
        ...appState,
        isLoading: true,
        loadingMessage: action.value,
      }

    case actions.HIDE_LOADING:
      return {
        ...appState,
        isLoading: false,
      }

    case actions.SHOW_SUB_LOADING_INDICATION:
      return {
        ...appState,
        isSubLoading: true,
      }

    case actions.HIDE_SUB_LOADING_INDICATION:
      return {
        ...appState,
        isSubLoading: false,
      }

    case actions.DISPLAY_WARNING:
      return {
        ...appState,
        warning: action.value,
        isLoading: false,
      }

    case actions.HIDE_WARNING:
      return {
        ...appState,
        warning: undefined,
      }

    case actions.SHOW_PRIVATE_KEY:
      return {
        ...appState,
        accountDetail: {
          subview: 'export',
          accountExport: 'completed',
          privateKey: action.value,
        },
      }

    case actions.PAIR_UPDATE:
      return {
        ...appState,
        buyView: {
          subview: 'ShapeShift',
          formView: {
            coinbase: false,
            shapeshift: true,
            marketinfo: action.value.marketinfo,
            coinOptions: appState.buyView.formView.coinOptions,
          },
          buyAddress: appState.buyView.buyAddress,
          amount: appState.buyView.amount,
          warning: null,
        },
      }

    case actions.SHOW_QR:
      return {
        ...appState,
        qrRequested: true,
        transForward: true,

        Qr: {
          message: action.value.message,
          data: action.value.data,
        },
      }

    case actions.SHOW_QR_VIEW:
      return {
        ...appState,
        currentView: {
          name: 'qr',
          context: appState.currentView.context,
        },
        transForward: true,
        Qr: {
          message: action.value.message,
          data: action.value.data,
        },
      }

    case actions.SET_MOUSE_USER_STATE:
      return {
        ...appState,
        isMouseUser: action.value,
      }

    case actions.GAS_LOADING_STARTED:
      return {
        ...appState,
        gasIsLoading: true,
      }

    case actions.GAS_LOADING_FINISHED:
      return {
        ...appState,
        gasIsLoading: false,
      }

    case actions.SET_NETWORK_NONCE:
      return {
        ...appState,
        networkNonce: action.value,
      }

    case actions.SET_PREVIOUS_PROVIDER:
      if (action.value === 'loading') {
        return appState
      }
      return {
        ...appState,
        lastSelectedProvider: action.value,
      }

    case actions.SET_SELECTED_SETTINGS_RPC_URL:
      return {
        ...appState,
        networksTabSelectedRpcUrl: action.value,
      }

    case actions.SET_NETWORKS_TAB_ADD_MODE:
      return {
        ...appState,
        networksTabIsInAddMode: action.value,
      }

    case actions.LOADING_METHOD_DATA_STARTED:
      return {
        ...appState,
        loadingMethodData: true,
      }

    case actions.LOADING_METHOD_DATA_FINISHED:
      return {
        ...appState,
        loadingMethodData: false,
      }

    case SET_THREEBOX_LAST_UPDATED:
      return {
        ...appState,
        threeBoxLastUpdated: action.value,
      }

    case actions.SET_REQUEST_ACCOUNT_TABS:
      return {
        ...appState,
        requestAccountTabs: action.value,
      }

    case actions.SET_OPEN_METAMASK_TAB_IDS:
      return {
        ...appState,
        openMetaMaskTabs: action.value,
      }

    case actions.SET_CURRENT_WINDOW_TAB:
      return {
        ...appState,
        currentWindowTab: action.value,
      }

    default:
      return appState
  }
}

// Action Creators
export function setThreeBoxLastUpdated (lastUpdated) {
  return {
    type: SET_THREEBOX_LAST_UPDATED,
    value: lastUpdated,
  }
}

// Helpers
function checkUnconfActions (state) {
  const unconfActionList = getUnconfActionList(state)
  const hasUnconfActions = unconfActionList.length > 0
  return hasUnconfActions
}

function getUnconfActionList (state) {
  const {
    unapprovedTxs,
    unapprovedMsgs,
    unapprovedPersonalMsgs,
    unapprovedTypedMessages,
    network,
  } = state.metamask

  const unconfActionList = txHelper(
    unapprovedTxs,
    unapprovedMsgs,
    unapprovedPersonalMsgs,
    unapprovedTypedMessages,
    network
  )
  return unconfActionList
}

function indexForPending (state, txId) {
  const unconfTxList = getUnconfActionList(state)
  const match = unconfTxList.find(tx => tx.id === txId)
  const index = unconfTxList.indexOf(match)
  return index
}

const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const FadeModal = require('boron').FadeModal
const actions = require('../../actions')
const isMobileView = require('../../../lib/is-mobile-view')
const isPopupOrNotification = require('../../../../app/scripts/lib/is-popup-or-notification')

// Modal Components
const BuyOptions = require('./buy-options-modal')
const DepositEtherModal = require('./deposit-ether-modal')
const AccountDetailsModal = require('./account-details-modal')
const EditAccountNameModal = require('./edit-account-name-modal')
const ExportPrivateKeyModal = require('./export-private-key-modal')
const NewAccountModal = require('./new-account-modal')
const ShapeshiftDepositTxModal = require('./shapeshift-deposit-tx-modal.js')
const HideTokenConfirmationModal = require('./hide-token-confirmation-modal')
const CustomizeGasModal = require('../customize-gas-modal')
const NotifcationModal = require('./notification-modal')

const accountModalStyle = {
  mobileModalStyle: {
    width: '95%',
    // top: isPopupOrNotification() === 'popup' ? '52vh' : '36.5vh',
    boxShadow: 'rgba(0, 0, 0, 0.15) 0px 2px 2px 2px',
    borderRadius: '4px',
    top: '10%',
    transform: 'none',
    left: '0',
    right: '0',
    margin: '0 auto',
  },
  laptopModalStyle: {
    width: '360px',
    // top: 'calc(33% + 45px)',
    boxShadow: 'rgba(0, 0, 0, 0.15) 0px 2px 2px 2px',
    borderRadius: '4px',
    top: '10%',
    transform: 'none',
    left: '0',
    right: '0',
    margin: '0 auto',
  },
  contentStyle: {
    borderRadius: '4px',
  },
}

const MODALS = {
  BUY: {
    contents: [
      h(BuyOptions, {}, []),
    ],
    mobileModalStyle: {
      width: '95%',
      // top: isPopupOrNotification() === 'popup' ? '48vh' : '36.5vh',
      transform: 'none',
      left: '0',
      right: '0',
      margin: '0 auto',
      boxShadow: '0 0 7px 0 rgba(0,0,0,0.08)',
      top: '10%',
    },
    laptopModalStyle: {
      width: '66%',
      maxWidth: '550px',
      top: 'calc(10% + 10px)',
      left: '0',
      right: '0',
      margin: '0 auto',
      boxShadow: '0 0 7px 0 rgba(0,0,0,0.08)',
      transform: 'none',
    },
  },

  DEPOSIT_ETHER: {
    contents: [
      h(DepositEtherModal, {}, []),
    ],
    mobileModalStyle: {
      width: '100%',
      height: '100%',
      transform: 'none',
      left: '0',
      right: '0',
      margin: '0 auto',
      boxShadow: '0 0 7px 0 rgba(0,0,0,0.08)',
      top: '0',
      display: 'flex',
    },
    laptopModalStyle: {
      width: '900px',
      maxWidth: '900px',
      top: 'calc(10% + 10px)',
      left: '0',
      right: '0',
      margin: '0 auto',
      boxShadow: '0 0 6px 0 rgba(0,0,0,0.3)',
      borderRadius: '8px',
      transform: 'none',
    },
    contentStyle: {
      borderRadius: '8px',
    },
  },

  EDIT_ACCOUNT_NAME: {
    contents: [
      h(EditAccountNameModal, {}, []),
    ],
    mobileModalStyle: {
      width: '95%',
      // top: isPopupOrNotification() === 'popup' ? '48vh' : '36.5vh',
      top: '10%',
      boxShadow: 'rgba(0, 0, 0, 0.15) 0px 2px 2px 2px',
      transform: 'none',
      left: '0',
      right: '0',
      margin: '0 auto',
    },
    laptopModalStyle: {
      width: '375px',
      // top: 'calc(30% + 10px)',
      top: '10%',
      boxShadow: 'rgba(0, 0, 0, 0.15) 0px 2px 2px 2px',
      transform: 'none',
      left: '0',
      right: '0',
      margin: '0 auto',
    },
  },

  ACCOUNT_DETAILS: {
    contents: [
      h(AccountDetailsModal, {}, []),
    ],
    ...accountModalStyle,
  },

  EXPORT_PRIVATE_KEY: {
    contents: [
      h(ExportPrivateKeyModal, {}, []),
    ],
    ...accountModalStyle,
  },

  SHAPESHIFT_DEPOSIT_TX: {
    contents: [
      h(ShapeshiftDepositTxModal),
    ],
    ...accountModalStyle,
  },

  HIDE_TOKEN_CONFIRMATION: {
    contents: [
      h(HideTokenConfirmationModal, {}, []),
    ],
    mobileModalStyle: {
      width: '95%',
      top: isPopupOrNotification() === 'popup' ? '52vh' : '36.5vh',
    },
    laptopModalStyle: {
      width: '449px',
      top: 'calc(33% + 45px)',
    },
  },

  BETA_UI_NOTIFICATION_MODAL: {
    contents: [
      h(NotifcationModal, {
        header: 'Welcome to the New UI (Beta)',
        message: `You are now using the new Metamask UI. Take a look around, try out new features like sending tokens,
        and let us know if you have any issues.`,
      }),
    ],
    mobileModalStyle: {
      width: '95%',
      top: isPopupOrNotification() === 'popup' ? '52vh' : '36.5vh',
    },
    laptopModalStyle: {
      width: '449px',
      top: 'calc(33% + 45px)',
    },
  },

  OLD_UI_NOTIFICATION_MODAL: {
    contents: [
      h(NotifcationModal, {
        header: 'Old UI',
        message: `You have returned to the old UI. You can switch back to the New UI through the option in the top
        right dropdown menu.`,
      }),
    ],
    mobileModalStyle: {
      width: '95%',
      top: isPopupOrNotification() === 'popup' ? '52vh' : '36.5vh',
    },
    laptopModalStyle: {
      width: '449px',
      top: 'calc(33% + 45px)',
    },
  },

  NEW_ACCOUNT: {
    contents: [
      h(NewAccountModal, {}, []),
    ],
    mobileModalStyle: {
      width: '95%',
      // top: isPopupOrNotification() === 'popup' ? '52vh' : '36.5vh',
      top: '10%',
      transform: 'none',
      left: '0',
      right: '0',
      margin: '0 auto',
    },
    laptopModalStyle: {
      width: '449px',
      // top: 'calc(33% + 45px)',
      top: '10%',
      transform: 'none',
      left: '0',
      right: '0',
      margin: '0 auto',
    },
  },

  CUSTOMIZE_GAS: {
    contents: [
      h(CustomizeGasModal, {}, []),
    ],
    mobileModalStyle: {
      width: '100vw',
      height: '100vh',
      top: '0',
      transform: 'none',
      left: '0',
      right: '0',
      margin: '0 auto',
    },
    laptopModalStyle: {
      width: '720px',
      height: '377px',
      top: '80px',
      transform: 'none',
      left: '0',
      right: '0',
      margin: '0 auto',
    },
  },

  DEFAULT: {
    contents: [],
    mobileModalStyle: {},
    laptopModalStyle: {},
  },
}

const BACKDROPSTYLE = {
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
}

function mapStateToProps (state) {
  return {
    active: state.appState.modal.open,
    modalState: state.appState.modal.modalState,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    hideModal: () => {
      dispatch(actions.hideModal())
    },
  }
}

// Global Modal Component
inherits(Modal, Component)
function Modal () {
  Component.call(this)
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(Modal)

Modal.prototype.render = function () {
  const modal = MODALS[this.props.modalState.name || 'DEFAULT']

  const children = modal.contents
  const modalStyle = modal[isMobileView() ? 'mobileModalStyle' : 'laptopModalStyle']
  const contentStyle = modal.contentStyle || {}

  return h(FadeModal,
    {
      className: 'modal',
      keyboard: false,
      onHide: () => { this.onHide() },
      ref: (ref) => {
        this.modalRef = ref
      },
      modalStyle,
      contentStyle,
      backdropStyle: BACKDROPSTYLE,
    },
    children,
  )
}

Modal.prototype.componentWillReceiveProps = function (nextProps) {
  if (nextProps.active) {
    this.show()
  } else if (this.props.active) {
    this.hide()
  }
}

Modal.prototype.onHide = function () {
  if (this.props.onHideCallback) {
    this.props.onHideCallback()
  }
  this.props.hideModal()
}

Modal.prototype.hide = function () {
  this.modalRef.hide()
}

Modal.prototype.show = function () {
  this.modalRef.show()
}

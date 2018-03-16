const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const actions = require('../../actions')
const networkNames = require('../../../../app/scripts/config.js').networkNames
const ShapeshiftForm = require('../shapeshift-form')
const t = require('../../../i18n')

const DIRECT_DEPOSIT_ROW_TITLE = t('directDepositEther')
const DIRECT_DEPOSIT_ROW_TEXT = t('directDepositEtherExplainer')
const COINBASE_ROW_TITLE = t('buyCoinbase')
const COINBASE_ROW_TEXT = t('buyCoinbaseExplainer')
const SHAPESHIFT_ROW_TITLE = t('depositShapeShift')
const SHAPESHIFT_ROW_TEXT = t('depositShapeShiftExplainer')
const FAUCET_ROW_TITLE = t('testFaucet')
const facuetRowText = (networkName) => {
  return t('getEtherFromFaucet', [networkName])
}

function mapStateToProps (state) {
  return {
    network: state.metamask.network,
    address: state.metamask.selectedAddress,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    toCoinbase: (address) => {
      dispatch(actions.buyEth({ network: '1', address, amount: 0 }))
    },
    hideModal: () => {
      dispatch(actions.hideModal())
    },
    hideWarning: () => {
      dispatch(actions.hideWarning())
    },
    showAccountDetailModal: () => {
      dispatch(actions.showModal({ name: 'ACCOUNT_DETAILS' }))
    },
    toFaucet: network => dispatch(actions.buyEth({ network })),
  }
}

inherits(DepositEtherModal, Component)
function DepositEtherModal () {
  Component.call(this)

  this.state = {
    buyingWithShapeshift: false,
  }
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(DepositEtherModal)

DepositEtherModal.prototype.renderRow = function ({
  logo,
  title,
  text,
  buttonLabel,
  onButtonClick,
  hide,
  className,
  hideButton,
  hideTitle,
  onBackClick,
  showBackButton,
}) {
  if (hide) {
    return null
  }

  return h('div', {
      className: className || 'deposit-ether-modal__buy-row',
    }, [

    onBackClick && showBackButton && h('div.deposit-ether-modal__buy-row__back', {
      onClick: onBackClick,
    }, [

      h('i.fa.fa-arrow-left.cursor-pointer'),

    ]),

    h('div.deposit-ether-modal__buy-row__logo-container', [logo]),

      h('div.deposit-ether-modal__buy-row__description', [

        !hideTitle && h('div.deposit-ether-modal__buy-row__description__title', [title]),

        h('div.deposit-ether-modal__buy-row__description__text', [text]),

      ]),

      !hideButton && h('div.deposit-ether-modal__buy-row__button', [
        h('button.deposit-ether-modal__deposit-button', {
          onClick: onButtonClick,
        }, [buttonLabel]),
      ]),

  ])
}

DepositEtherModal.prototype.render = function () {
  const { network, toCoinbase, address, toFaucet } = this.props
  const { buyingWithShapeshift } = this.state

  const isTestNetwork = ['3', '4', '42'].find(n => n === network)
  const networkName = networkNames[network]

  return h('div.page-container.page-container--full-width', {}, [

    h('div.page-container__header', [

      h('div.page-container__title', [t('depositEther')]),

      h('div.page-container__subtitle', [
        t('needEtherInWallet'),
      ]),

      h('div.page-container__header-close', {
        onClick: () => {
          this.setState({ buyingWithShapeshift: false })
          this.props.hideWarning()
          this.props.hideModal()
        },
      }),

    ]),

    h('.page-container__content', {}, [

      h('div.deposit-ether-modal__buy-rows', [

        this.renderRow({
          logo: h('img.deposit-ether-modal__logo', {
            src: '../../../images/deposit-eth.svg',
          }),
          title: DIRECT_DEPOSIT_ROW_TITLE,
          text: DIRECT_DEPOSIT_ROW_TEXT,
          buttonLabel: t('viewAccount'),
          onButtonClick: () => this.goToAccountDetailsModal(),
          hide: buyingWithShapeshift,
        }),

        this.renderRow({
          logo: h('i.fa.fa-tint.fa-2x'),
          title: FAUCET_ROW_TITLE,
          text: facuetRowText(networkName),
          buttonLabel: t('getEther'),
          onButtonClick: () => toFaucet(network),
          hide: !isTestNetwork || buyingWithShapeshift,
        }),

        this.renderRow({
          logo: h('div.deposit-ether-modal__logo', {
            style: {
              backgroundImage: 'url(\'../../../images/coinbase logo.png\')',
              height: '40px',
            },
          }),
          title: COINBASE_ROW_TITLE,
          text: COINBASE_ROW_TEXT,
          buttonLabel: t('continueToCoinbase'),
          onButtonClick: () => toCoinbase(address),
          hide: isTestNetwork || buyingWithShapeshift,
        }),

        this.renderRow({
          logo: h('div.deposit-ether-modal__logo', {
            style: {
              backgroundImage: 'url(\'../../../images/shapeshift logo.png\')',
            },
          }),
          title: SHAPESHIFT_ROW_TITLE,
          text: SHAPESHIFT_ROW_TEXT,
          buttonLabel: t('shapeshiftBuy'),
          onButtonClick: () => this.setState({ buyingWithShapeshift: true }),
          hide: isTestNetwork,
          hideButton: buyingWithShapeshift,
          hideTitle: buyingWithShapeshift,
          onBackClick: () => this.setState({ buyingWithShapeshift: false }),
          showBackButton: this.state.buyingWithShapeshift,
          className: buyingWithShapeshift && 'deposit-ether-modal__buy-row__shapeshift-buy',
        }),

        buyingWithShapeshift && h(ShapeshiftForm),

      ]),

    ]),
  ])
}

DepositEtherModal.prototype.goToAccountDetailsModal = function () {
  this.props.hideWarning()
  this.props.hideModal()
  this.props.showAccountDetailModal()
}

const Component = require('react').Component
const PropTypes = require('prop-types')
const connect = require('react-redux').connect
const h = require('react-hyperscript')
const inherits = require('util').inherits
const { withRouter } = require('react-router-dom')
const { compose } = require('recompose')
const actions = require('../actions')
const selectors = require('../selectors')
const { SEND_ROUTE } = require('../routes')
const copyToClipboard = require('copy-to-clipboard')
const { checksumAddress: toChecksumAddress } = require('../util')
const Tooltip = require('./tooltip-v2.js')

const BalanceComponent = require('./balance-component')
const TxList = require('./tx-list')
const Identicon = require('./identicon')

module.exports = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(TxView)

TxView.contextTypes = {
  t: PropTypes.func,
}

function mapStateToProps (state) {
  const sidebarOpen = state.appState.sidebarOpen
  const isMascara = state.appState.isMascara

  const identities = state.metamask.identities
  const accounts = state.metamask.accounts
  const network = state.metamask.network
  const selectedTokenAddress = state.metamask.selectedTokenAddress
  const selectedAddress = state.metamask.selectedAddress || Object.keys(accounts)[0]
  const checksumAddress = toChecksumAddress(selectedAddress)
  const identity = identities[selectedAddress]

  return {
    sidebarOpen,
    selectedAddress,
    checksumAddress,
    selectedTokenAddress,
    selectedToken: selectors.getSelectedToken(state),
    identity,
    network,
    isMascara,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    showSidebar: () => { dispatch(actions.showSidebar()) },
    hideSidebar: () => { dispatch(actions.hideSidebar()) },
    showModal: (payload) => { dispatch(actions.showModal(payload)) },
    showSendPage: () => { dispatch(actions.showSendPage()) },
    showSendTokenPage: () => { dispatch(actions.showSendTokenPage()) },
  }
}

inherits(TxView, Component)
function TxView () {
  Component.call(this)

  this.state = {
    hasCopied: false,
  }
}

TxView.prototype.renderHeroBalance = function () {
  const { selectedToken } = this.props

  return h('div.hero-balance', {}, [

    h(BalanceComponent, { token: selectedToken }),

    this.renderButtons(),
  ])
}

TxView.prototype.renderButtons = function () {
  const {selectedToken, showModal, history } = this.props

  return !selectedToken
    ? (
      h('div.flex-row.flex-center.hero-balance-buttons', [
        h('button.btn-primary.hero-balance-button', {
          onClick: () => showModal({
            name: 'DEPOSIT_ETHER',
          }),
        }, this.context.t('deposit')),

        h('button.btn-primary.hero-balance-button', {
          style: {
            marginLeft: '0.8em',
          },
          onClick: () => history.push(SEND_ROUTE),
        }, this.context.t('send')),
      ])
    )
    : (
      h('div.flex-row.flex-center.hero-balance-buttons', [
        h('button.btn-primary.hero-balance-button', {
          onClick: () => history.push(SEND_ROUTE),
        }, this.context.t('send')),
      ])
    )
}

TxView.prototype.render = function () {
  const { selectedAddress, identity, network, isMascara, checksumAddress } = this.props

  return h('div.tx-view.flex-column', {
    style: {},
  }, [

    h('div.phone-visible__wrapper', [
      h('div.flex-row.phone-visible__content', {
        style: {
          justifyContent: 'space-between',
          alignItems: 'center',
          flex: '1',
        },
      }, [

        h('div.fa.fa-bars', {
          style: {
            fontSize: '1.3em',
            cursor: 'pointer',
            padding: '10px',
            'padding-top': '4px',
          },
          onClick: () => this.props.sidebarOpen ? this.props.hideSidebar() : this.props.showSidebar(),
        }),

        h('.identicon-wrapper.select-none', {
          style: {
            marginLeft: '0.9em',
          },
        }, [
          h(Identicon, {
            diameter: 24,
            address: selectedAddress,
            network,
          }),
        ]),

        h(Tooltip, {
          position: 'bottom',
          title: this.state.hasCopied ? this.context.t('copiedExclamation') : this.context.t('copyToClipboard'),
          style: {
            display: 'flex',
            cursor: 'pointer',
          },
        }, [
          h('span.account-name', {
            // className: classnames({
            //   'wallet-view__address__pressed': this.state.copyToClipboardPressed,
            // }),
            onClick: () => {
              copyToClipboard(checksumAddress)
              this.setState({ hasCopied: true })
              setTimeout(() => this.setState({ hasCopied: false }), 3000)
            },
            onMouseDown: () => {
              this.setState({ copyToClipboardPressed: true })
            },
            onMouseUp: () => {
              this.setState({ copyToClipboardPressed: false })
            },
          }, [
            h('div.account-name__name', identity.name),
            h('div.account-name__address', `${selectedAddress.slice(0, 4)}...${selectedAddress.slice(selectedAddress.length - 4)}`),
          ]),
        ]),

        !isMascara && h('div.open-in-browser', {
          onClick: () => global.platform.openExtensionInBrowser(),
        }, [h('img', { src: 'images/popout.svg' })]),

      ]),
    ]),

    this.renderHeroBalance(),

    h(TxList),

  ])
}

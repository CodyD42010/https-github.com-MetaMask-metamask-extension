const { Component } = require('react')
const h = require('react-hyperscript')
const PropTypes = require('prop-types')
const actions = require('../../actions')
const { SETTINGS_ROUTE } = require('../../routes')

class ErrorLoadingScreen extends Component {
  static propTypes = {
    errorLoadingMessage: PropTypes.string,
    networkDropdownOpen: PropTypes.bool,
    showNetworkDropdown: PropTypes.func,
    hideNetworkDropdown: PropTypes.func
  }

  static contextTypes = {
    t: PropTypes.func,
  }

  renderMessage () {
    const { loadingMessage } = this.props
    return ('span', loadingMessage)
  }
  renderButtons () {
    return h('div.hero-balance', {}, [
      h('div.flex-row.flex-center.hero-balance-buttons', [
        h('button.btn-primary.hero-balance-button', {
          onClick: event => this.handleNetworkIndicatorClick(event)
        }, 'Try again', []),
        h('button.btn-primary.hero-balance-button', {
          onClick: event => this.handleNetworkResetConnectionClick(event)
        }, 'Switch network', [])
      ])
    ])
  }

  handleNetworkResetConnectionClick (event) {
    event.preventDefault()
    event.stopPropagation()

    const props = this.props
    const { provider: { type: providerType, rpcTarget: activeNetwork } } = props
    activeNetwork === 'rpc' ? this.props.history.push(SETTINGS_ROUTE) : props.setProviderType(providerType)
      
  }
  handleNetworkIndicatorClick (event) {
    event.preventDefault()
    event.stopPropagation()

    const { networkDropdownOpen, showNetworkDropdown, hideNetworkDropdown } = this.props

    return networkDropdownOpen === false
      ? showNetworkDropdown()
      : hideNetworkDropdown()
  }

  render () {
    return (
      h('.loading-overlay', [
        h('.loading-overlay__container', [
          this.renderMessage(),
          this.renderButtons()
        ]),
      ])
    )
  }
}


module.exports = ErrorLoadingScreen

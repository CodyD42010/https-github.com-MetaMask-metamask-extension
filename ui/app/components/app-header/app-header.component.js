import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import Identicon from '../identicon'
import { DEFAULT_ROUTE } from '../../routes'
const NetworkIndicator = require('../network')

export default class AppHeader extends PureComponent {
  static propTypes = {
    history: PropTypes.object,
    network: PropTypes.string,
    provider: PropTypes.object,
    networkDropdownOpen: PropTypes.bool,
    showNetworkDropdown: PropTypes.func,
    hideNetworkDropdown: PropTypes.func,
    toggleAccountMenu: PropTypes.func,
    selectedAddress: PropTypes.string,
    isUnlocked: PropTypes.bool,
    hideNetworkIndicator: PropTypes.bool,
    disabled: PropTypes.bool,
  }

  static contextTypes = {
    t: PropTypes.func,
  }

  handleNetworkIndicatorClick (event) {
    event.preventDefault()
    event.stopPropagation()

    const { networkDropdownOpen, showNetworkDropdown, hideNetworkDropdown } = this.props

    return networkDropdownOpen === false
      ? showNetworkDropdown()
      : hideNetworkDropdown()
  }

  renderAccountMenu () {
    const { isUnlocked, toggleAccountMenu, selectedAddress, disabled } = this.props

    return isUnlocked && (
      <div
        className={classnames('account-menu__icon', {
          'account-menu__icon--disabled': disabled,
        })}
        onClick={() => disabled || toggleAccountMenu()}
      >
        <Identicon
          address={selectedAddress}
          diameter={32}
        />
      </div>
    )
  }

  render () {
    const {
      history,
      network,
      provider,
      isUnlocked,
      hideNetworkIndicator,
      disabled,
    } = this.props

    return (
      <div
        className={classnames('app-header', { 'app-header--back-drop': isUnlocked })}>
        <div className="app-header__contents">
          <div
            className="app-header__logo-container"
            onClick={() => history.push(DEFAULT_ROUTE)}
          >
            <img
              className="app-header__metafox-logo app-header__metafox-logo--horizontal"
              src="/images/logo/metamask-logo-horizontal.svg"
              height={30}
            />
            <img
              className="app-header__metafox-logo app-header__metafox-logo--icon"
              src="/images/logo/metamask-fox.svg"
              height={42}
              width={42}
            />
          </div>
          <div className="app-header__account-menu-container">
            {
              !hideNetworkIndicator && (
                <div className="app-header__network-component-wrapper">
                  <NetworkIndicator
                    network={network}
                    provider={provider}
                    onClick={event => this.handleNetworkIndicatorClick(event)}
                    disabled={disabled}
                  />
                </div>
              )
            }
            { this.renderAccountMenu() }
          </div>
        </div>
      </div>
    )
  }
}

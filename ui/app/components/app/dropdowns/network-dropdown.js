import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { compose } from 'redux'
import * as actions from '../../../store/actions'
import { openAlert as displayInvalidCustomNetworkAlert } from '../../../ducks/alerts/invalid-custom-network'
import {
  NETWORKS_ROUTE,
  NETWORKS_FORM_ROUTE,
} from '../../../helpers/constants/routes'
import { ENVIRONMENT_TYPE_FULLSCREEN } from '../../../../../app/scripts/lib/enums'
import {
  getEnvironmentType,
  isPrefixedFormattedHexString,
} from '../../../../../app/scripts/lib/util'

import { Dropdown, DropdownMenuItem } from './components/dropdown'
import NetworkDropdownIcon from './components/network-dropdown-icon'

// classes from nodes of the toggle element.
const notToggleElementClassnames = [
  'menu-icon',
  'network-name',
  'network-indicator',
  'network-caret',
  'network-component',
]

function mapStateToProps(state) {
  return {
    provider: state.metamask.provider,
    frequentRpcListDetail: state.metamask.frequentRpcListDetail || [],
    networkDropdownOpen: state.appState.networkDropdownOpen,
  }
}

function mapDispatchToProps(dispatch) {
  return {
    setProviderType: (type) => {
      dispatch(actions.setProviderType(type))
    },
    setRpcTarget: (target, chainId, ticker, nickname) => {
      dispatch(actions.setRpcTarget(target, chainId, ticker, nickname))
    },
    hideNetworkDropdown: () => dispatch(actions.hideNetworkDropdown()),
    setNetworksTabAddMode: (isInAddMode) => {
      dispatch(actions.setNetworksTabAddMode(isInAddMode))
    },
    setSelectedSettingsRpcUrl: (url) => {
      dispatch(actions.setSelectedSettingsRpcUrl(url))
    },
    displayInvalidCustomNetworkAlert: (networkName) => {
      dispatch(displayInvalidCustomNetworkAlert(networkName))
    },
    showConfirmDeleteNetworkModal: ({ target, onConfirm }) => {
      return dispatch(
        actions.showModal({
          name: 'CONFIRM_DELETE_NETWORK',
          target,
          onConfirm,
        }),
      )
    },
  }
}

class NetworkDropdown extends Component {
  static contextTypes = {
    t: PropTypes.func,
    metricsEvent: PropTypes.func,
  }

  static propTypes = {
    provider: PropTypes.shape({
      nickname: PropTypes.string,
      rpcUrl: PropTypes.string,
      type: PropTypes.string,
      ticker: PropTypes.string,
    }).isRequired,
    setProviderType: PropTypes.func.isRequired,
    setRpcTarget: PropTypes.func.isRequired,
    hideNetworkDropdown: PropTypes.func.isRequired,
    setNetworksTabAddMode: PropTypes.func.isRequired,
    setSelectedSettingsRpcUrl: PropTypes.func.isRequired,
    frequentRpcListDetail: PropTypes.array.isRequired,
    networkDropdownOpen: PropTypes.bool.isRequired,
    history: PropTypes.object.isRequired,
    displayInvalidCustomNetworkAlert: PropTypes.func.isRequired,
    showConfirmDeleteNetworkModal: PropTypes.func.isRequired,
  }

  handleClick(newProviderType) {
    const {
      provider: { type: providerType },
      setProviderType,
    } = this.props
    const { metricsEvent } = this.context

    metricsEvent({
      eventOpts: {
        category: 'Navigation',
        action: 'Home',
        name: 'Switched Networks',
      },
      customVariables: {
        fromNetwork: providerType,
        toNetwork: newProviderType,
      },
    })
    setProviderType(newProviderType)
  }

  renderCustomRpcList(rpcListDetail, provider) {
    const reversedRpcListDetail = rpcListDetail.slice().reverse()

    return reversedRpcListDetail.map((entry) => {
      const { rpcUrl, chainId, ticker = 'ETH', nickname = '' } = entry
      const isCurrentRpcTarget =
        provider.type === 'rpc' && rpcUrl === provider.rpcUrl

      return (
        <DropdownMenuItem
          key={`common${rpcUrl}`}
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => {
            if (isPrefixedFormattedHexString(chainId)) {
              this.props.setRpcTarget(rpcUrl, chainId, ticker, nickname)
            } else {
              this.props.displayInvalidCustomNetworkAlert(nickname || rpcUrl)
            }
          }}
          style={{
            fontSize: '16px',
            lineHeight: '20px',
            padding: '12px 0',
          }}
        >
          {isCurrentRpcTarget ? (
            <i className="fa fa-check" />
          ) : (
            <div className="network-check__transparent">✓</div>
          )}
          <NetworkDropdownIcon
            backgroundColor="#d6d9dc"
            isSelected={isCurrentRpcTarget}
          />
          <span
            className="network-name-item"
            style={{
              color: isCurrentRpcTarget ? '#ffffff' : '#9b9b9b',
            }}
          >
            {nickname || rpcUrl}
          </span>
          {isCurrentRpcTarget ? null : (
            <i
              className="fa fa-times delete"
              onClick={(e) => {
                e.stopPropagation()
                this.props.showConfirmDeleteNetworkModal({
                  target: rpcUrl,
                  onConfirm: () => undefined,
                })
              }}
            />
          )}
        </DropdownMenuItem>
      )
    })
  }

  getNetworkName() {
    const { provider } = this.props
    const providerName = provider.type

    let name

    if (providerName === 'mainnet') {
      name = this.context.t('mainnet')
    } else if (providerName === 'ropsten') {
      name = this.context.t('ropsten')
    } else if (providerName === 'kovan') {
      name = this.context.t('kovan')
    } else if (providerName === 'rinkeby') {
      name = this.context.t('rinkeby')
    } else if (providerName === 'goerli') {
      name = this.context.t('goerli')
    } else {
      name = provider.nickname || this.context.t('unknownNetwork')
    }

    return name
  }

  render() {
    const {
      provider: { type: providerType, rpcUrl: activeNetwork },
      setNetworksTabAddMode,
      setSelectedSettingsRpcUrl,
    } = this.props
    const rpcListDetail = this.props.frequentRpcListDetail
    const isOpen = this.props.networkDropdownOpen
    const dropdownMenuItemStyle = {
      fontSize: '16px',
      lineHeight: '20px',
      padding: '12px 0',
    }

    return (
      <Dropdown
        isOpen={isOpen}
        onClickOutside={(event) => {
          const { classList } = event.target
          const isInClassList = (className) => classList.contains(className)
          const notToggleElementIndex = notToggleElementClassnames.findIndex(
            isInClassList,
          )

          if (notToggleElementIndex === -1) {
            this.props.hideNetworkDropdown()
          }
        }}
        containerClassName="network-droppo"
        zIndex={55}
        style={{
          position: 'absolute',
          top: '58px',
          width: '309px',
          zIndex: '55px',
        }}
        innerStyle={{
          padding: '18px 8px',
        }}
      >
        <div className="network-dropdown-header">
          <div className="network-dropdown-title">
            {this.context.t('networks')}
          </div>
          <div className="network-dropdown-divider" />
          <div className="network-dropdown-content">
            {this.context.t('defaultNetwork')}
          </div>
        </div>
        <DropdownMenuItem
          key="main"
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => this.handleClick('mainnet')}
          style={{ ...dropdownMenuItemStyle, borderColor: '#038789' }}
        >
          {providerType === 'mainnet' ? (
            <i className="fa fa-check" />
          ) : (
            <div className="network-check__transparent">✓</div>
          )}
          <NetworkDropdownIcon
            backgroundColor="#29B6AF"
            isSelected={providerType === 'mainnet'}
          />
          <span
            className="network-name-item"
            style={{
              color: providerType === 'mainnet' ? '#ffffff' : '#9b9b9b',
            }}
          >
            {this.context.t('mainnet')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          key="ropsten"
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => this.handleClick('ropsten')}
          style={dropdownMenuItemStyle}
        >
          {providerType === 'ropsten' ? (
            <i className="fa fa-check" />
          ) : (
            <div className="network-check__transparent">✓</div>
          )}
          <NetworkDropdownIcon
            backgroundColor="#ff4a8d"
            isSelected={providerType === 'ropsten'}
          />
          <span
            className="network-name-item"
            style={{
              color: providerType === 'ropsten' ? '#ffffff' : '#9b9b9b',
            }}
          >
            {this.context.t('ropsten')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          key="kovan"
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => this.handleClick('kovan')}
          style={dropdownMenuItemStyle}
        >
          {providerType === 'kovan' ? (
            <i className="fa fa-check" />
          ) : (
            <div className="network-check__transparent">✓</div>
          )}
          <NetworkDropdownIcon
            backgroundColor="#7057ff"
            isSelected={providerType === 'kovan'}
          />
          <span
            className="network-name-item"
            style={{
              color: providerType === 'kovan' ? '#ffffff' : '#9b9b9b',
            }}
          >
            {this.context.t('kovan')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          key="rinkeby"
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => this.handleClick('rinkeby')}
          style={dropdownMenuItemStyle}
        >
          {providerType === 'rinkeby' ? (
            <i className="fa fa-check" />
          ) : (
            <div className="network-check__transparent">✓</div>
          )}
          <NetworkDropdownIcon
            backgroundColor="#f6c343"
            isSelected={providerType === 'rinkeby'}
          />
          <span
            className="network-name-item"
            style={{
              color: providerType === 'rinkeby' ? '#ffffff' : '#9b9b9b',
            }}
          >
            {this.context.t('rinkeby')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          key="goerli"
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => this.handleClick('goerli')}
          style={dropdownMenuItemStyle}
        >
          {providerType === 'goerli' ? (
            <i className="fa fa-check" />
          ) : (
            <div className="network-check__transparent">✓</div>
          )}
          <NetworkDropdownIcon
            backgroundColor="#3099f2"
            isSelected={providerType === 'goerli'}
          />
          <span
            className="network-name-item"
            style={{
              color: providerType === 'goerli' ? '#ffffff' : '#9b9b9b',
            }}
          >
            {this.context.t('goerli')}
          </span>
        </DropdownMenuItem>
        {this.renderCustomRpcList(rpcListDetail, this.props.provider)}
        <DropdownMenuItem
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => {
            this.props.history.push(
              getEnvironmentType() === ENVIRONMENT_TYPE_FULLSCREEN
                ? NETWORKS_ROUTE
                : NETWORKS_FORM_ROUTE,
            )
            setSelectedSettingsRpcUrl('')
            setNetworksTabAddMode(true)
          }}
          style={dropdownMenuItemStyle}
        >
          {activeNetwork === 'custom' ? (
            <i className="fa fa-check" />
          ) : (
            <div className="network-check__transparent">✓</div>
          )}
          <NetworkDropdownIcon
            isSelected={activeNetwork === 'custom'}
            innerBorder="1px solid #9b9b9b"
          />
          <span
            className="network-name-item"
            style={{
              color: activeNetwork === 'custom' ? '#ffffff' : '#9b9b9b',
            }}
          >
            {this.context.t('customRPC')}
          </span>
        </DropdownMenuItem>
      </Dropdown>
    )
  }
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(NetworkDropdown)

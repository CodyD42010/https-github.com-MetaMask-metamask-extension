<<<<<<< HEAD
const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const { withRouter } = require('react-router-dom')
const { compose } = require('recompose')
const actions = require('../../../store/actions')
const Dropdown = require('./components/dropdown').Dropdown
const DropdownMenuItem = require('./components/dropdown').DropdownMenuItem
const NetworkDropdownIcon = require('./components/network-dropdown-icon')
const R = require('ramda')
const { NETWORKS_ROUTE } = require('../../../helpers/constants/routes')
=======
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { compose } from 'recompose'
import * as actions from '../../../store/actions'
import { Dropdown, DropdownMenuItem } from './components/dropdown'
import NetworkDropdownIcon from './components/network-dropdown-icon'
import R from 'ramda'
import { NETWORKS_ROUTE } from '../../../helpers/constants/routes'
>>>>>>> eebc504b0f23d7c7b725e111a89665a2ac7d50dc

// classes from nodes of the toggle element.
const notToggleElementClassnames = [
  'menu-icon',
  'network-name',
  'network-indicator',
  'network-caret',
  'network-component',
]

function mapStateToProps (state) {
  return {
    provider: state.metamask.provider,
    frequentRpcListDetail: state.metamask.frequentRpcListDetail || [],
    networkDropdownOpen: state.appState.networkDropdownOpen,
    network: state.metamask.network,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    setProviderType: (type) => {
      dispatch(actions.setProviderType(type))
    },
    setRpcTarget: (target, network, ticker, nickname) => {
      dispatch(actions.setRpcTarget(target, network, ticker, nickname))
    },
    delRpcTarget: (target) => {
      dispatch(actions.delRpcTarget(target))
    },
    hideNetworkDropdown: () => dispatch(actions.hideNetworkDropdown()),
    setNetworksTabAddMode: (isInAddMode) => dispatch(actions.setNetworksTabAddMode(isInAddMode)),
  }
}

class NetworkDropdown extends Component {
  static contextTypes = {
    t: PropTypes.func,
    metricsEvent: PropTypes.func,
  }

  static propTypes = {
    provider: PropTypes.shape({
      type: PropTypes.string,
      ticker: PropTypes.string,
    }).isRequired,
    setProviderType: PropTypes.func.isRequired,
    network: PropTypes.string.isRequired,
    setRpcTarget: PropTypes.func.isRequired,
    hideNetworkDropdown: PropTypes.func.isRequired,
    setNetworksTabAddMode: PropTypes.func.isRequired,
    frequentRpcListDetail: PropTypes.array.isRequired,
    networkDropdownOpen: PropTypes.bool.isRequired,
    history: PropTypes.object.isRequired,
  }

  handleClick (newProviderType) {
    const { provider: { type: providerType }, setProviderType } = this.props
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

  renderCustomOption (provider) {
    const { rpcTarget, type, ticker, nickname } = provider
    const network = this.props.network

<<<<<<< HEAD
// TODO: specify default props and proptypes
NetworkDropdown.prototype.render = function () {
  const props = this.props
  const { provider: { type: providerType, rpcTarget: activeNetwork }, setNetworksTabAddMode } = props
  const rpcListDetail = props.frequentRpcListDetail
  const isOpen = this.props.networkDropdownOpen
  const dropdownMenuItemStyle = {
    fontSize: '16px',
    lineHeight: '20px',
    padding: '12px 0',
  }

  return h(Dropdown, {
    isOpen,
    onClickOutside: (event) => {
      const { classList } = event.target
      const isInClassList = className => classList.contains(className)
      const notToggleElementIndex = R.findIndex(isInClassList)(notToggleElementClassnames)

      if (notToggleElementIndex === -1) {
        this.props.hideNetworkDropdown()
      }
    },
    containerClassName: 'network-droppo',
    zIndex: 55,
    style: {
      position: 'absolute',
      top: '58px',
      width: '309px',
      zIndex: '55px',
    },
    innerStyle: {
      padding: '18px 8px',
    },
  }, [

    h('div.network-dropdown-header', {}, [
      h('div.network-dropdown-title', {}, this.context.t('networks')),

      h('div.network-dropdown-divider'),

      h('div.network-dropdown-content',
        {},
        this.context.t('defaultNetwork')
      ),
    ]),

    h(
      DropdownMenuItem,
      {
        key: 'main',
        closeMenu: () => this.props.hideNetworkDropdown(),
        onClick: () => this.handleClick('mainnet'),
        style: { ...dropdownMenuItemStyle, borderColor: '#038789' },
      },
      [
        providerType === 'mainnet' ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
        h(NetworkDropdownIcon, {
          backgroundColor: '#29B6AF', // $java
          isSelected: providerType === 'mainnet',
        }),
        h('span.network-name-item', {
          style: {
            color: providerType === 'mainnet' ? '#ffffff' : '#9b9b9b',
          },
        }, this.context.t('mainnet')),
      ]
    ),

    h(
      DropdownMenuItem,
      {
        key: 'ropsten',
        closeMenu: () => this.props.hideNetworkDropdown(),
        onClick: () => this.handleClick('ropsten'),
        style: dropdownMenuItemStyle,
      },
      [
        providerType === 'ropsten' ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
        h(NetworkDropdownIcon, {
          backgroundColor: '#ff4a8d', // $wild-strawberry
          isSelected: providerType === 'ropsten',
        }),
        h('span.network-name-item', {
          style: {
            color: providerType === 'ropsten' ? '#ffffff' : '#9b9b9b',
          },
        }, this.context.t('ropsten')),
      ]
    ),

    h(
      DropdownMenuItem,
      {
        key: 'kovan',
        closeMenu: () => this.props.hideNetworkDropdown(),
        onClick: () => this.handleClick('kovan'),
        style: dropdownMenuItemStyle,
      },
      [
        providerType === 'kovan' ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
        h(NetworkDropdownIcon, {
          backgroundColor: '#7057ff', // $cornflower-blue
          isSelected: providerType === 'kovan',
        }),
        h('span.network-name-item', {
          style: {
            color: providerType === 'kovan' ? '#ffffff' : '#9b9b9b',
          },
        }, this.context.t('kovan')),
      ]
    ),

    h(
      DropdownMenuItem,
      {
        key: 'rinkeby',
        closeMenu: () => this.props.hideNetworkDropdown(),
        onClick: () => this.handleClick('rinkeby'),
        style: dropdownMenuItemStyle,
      },
      [
        providerType === 'rinkeby' ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
        h(NetworkDropdownIcon, {
          backgroundColor: '#f6c343', // $saffron
          isSelected: providerType === 'rinkeby',
        }),
        h('span.network-name-item', {
          style: {
            color: providerType === 'rinkeby' ? '#ffffff' : '#9b9b9b',
          },
        }, this.context.t('rinkeby')),
      ]
    ),

    h(
      DropdownMenuItem,
      {
        key: 'goerli',
        closeMenu: () => this.props.hideNetworkDropdown(),
        onClick: () => this.handleClick('goerli'),
        style: dropdownMenuItemStyle,
      },
      [
        providerType === 'goerli' ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
        h(NetworkDropdownIcon, {
          backgroundColor: '#3099f2', // $dodger-blue
          isSelected: providerType === 'goerli',
        }),
        h('span.network-name-item', {
          style: {
            color: providerType === 'goerli' ? '#ffffff' : '#9b9b9b',
          },
        }, this.context.t('goerli')),
      ]
    ),

    h(
      DropdownMenuItem,
      {
        key: 'default',
        closeMenu: () => this.props.hideNetworkDropdown(),
        onClick: () => this.handleClick('localhost'),
        style: dropdownMenuItemStyle,
      },
      [
        providerType === 'localhost' ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
        h(NetworkDropdownIcon, {
          isSelected: providerType === 'localhost',
          innerBorder: '1px solid #9b9b9b',
        }),
        h('span.network-name-item', {
          style: {
            color: providerType === 'localhost' ? '#ffffff' : '#9b9b9b',
          },
        }, this.context.t('localhost')),
      ]
    ),

    this.renderCustomOption(props.provider),
    this.renderCommonRpc(rpcListDetail, props.provider),

    h(
      DropdownMenuItem,
      {
        closeMenu: () => this.props.hideNetworkDropdown(),
        onClick: () => {
          setNetworksTabAddMode(true)
          this.props.history.push(NETWORKS_ROUTE)
        },
        style: dropdownMenuItemStyle,
      },
      [
        activeNetwork === 'custom' ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
        h(NetworkDropdownIcon, {
          isSelected: activeNetwork === 'custom',
          innerBorder: '1px solid #9b9b9b',
        }),
        h('span.network-name-item', {
          style: {
            color: activeNetwork === 'custom' ? '#ffffff' : '#9b9b9b',
          },
        }, this.context.t('customRPC')),
      ]
    ),

  ])
}
=======
    if (type !== 'rpc') {
      return null
    }

    switch (rpcTarget) {

      case 'http://localhost:8545':
        return null

      default:
        return (
          <DropdownMenuItem
            key={rpcTarget}
            onClick={() => this.props.setRpcTarget(rpcTarget, network, ticker, nickname)}
            closeMenu={() => this.props.hideNetworkDropdown()}
            style={{
              fontSize: '16px',
              lineHeight: '20px',
              padding: '12px 0',
            }}
          >
            <i className="fa fa-check" />
            <i className="fa fa-question-circle fa-med menu-icon-circle" />
            <span
              className="network-name-item"
              style={{
                color: '#ffffff',
              }}
            >
              {nickname || rpcTarget}
            </span>
          </DropdownMenuItem>
        )
    }
  }

  renderCommonRpc (rpcListDetail, provider) {
    const props = this.props
    const reversedRpcListDetail = rpcListDetail.slice().reverse()

    return reversedRpcListDetail.map((entry) => {
      const rpc = entry.rpcUrl
      const ticker = entry.ticker || 'ETH'
      const nickname = entry.nickname || ''
      const currentRpcTarget = provider.type === 'rpc' && rpc === provider.rpcTarget
>>>>>>> eebc504b0f23d7c7b725e111a89665a2ac7d50dc

      if ((rpc === 'http://localhost:8545') || currentRpcTarget) {
        return null
      } else {
        const chainId = entry.chainId
        return (
          <DropdownMenuItem
            key={`common${rpc}`}
            closeMenu={() => this.props.hideNetworkDropdown()}
            onClick={() => props.setRpcTarget(rpc, chainId, ticker, nickname)}
            style={{
              fontSize: '16px',
              lineHeight: '20px',
              padding: '12px 0',
            }}
          >
            {
              currentRpcTarget
                ? <i className="fa fa-check" />
                : <div className="network-check__transparent">✓</div>
            }
            <i className="fa fa-question-circle fa-med menu-icon-circle" />
            <span
              className="network-name-item"
              style={{
                color: currentRpcTarget
                  ? '#ffffff'
                  : '#9b9b9b',
              }}
            >
              {nickname || rpc}
            </span>
            <i
              className="fa fa-times delete"
              onClick={(e) => {
                e.stopPropagation()
                props.delRpcTarget(rpc)
              }}
            />
          </DropdownMenuItem>
        )
      }
    })
  }

  getNetworkName () {
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
    } else if (providerName === 'localhost') {
      name = this.context.t('localhost')
    } else if (providerName === 'goerli') {
      name = this.context.t('goerli')
    } else {
      name = provider.nickname || this.context.t('unknownNetwork')
    }

    return name
  }

  render () {
    const { provider: { type: providerType, rpcTarget: activeNetwork, rpcType: rpcType }, setNetworksTabAddMode } = this.props
    const rpcListDetail = this.props.frequentRpcListDetail
    const isOpen = this.props.networkDropdownOpen
    const dropdownMenuItemStyle = {
      fontSize: '16px',
      lineHeight: '20px',
      padding: '12px 0',
    }
    const hidden = {
      display: 'none',
    }

    return (
      <Dropdown
        isOpen={isOpen}
        onClickOutside={(event) => {
          const { classList } = event.target
          const isInClassList = (className) => classList.contains(className)
          const notToggleElementIndex = R.findIndex(isInClassList)(notToggleElementClassnames)

<<<<<<< HEAD
    if ((rpc === 'http://localhost:8545') || currentRpcTarget) {
      return null
    } else {
      const chainId = entry.chainId
      return h(
        DropdownMenuItem,
        {
          key: `common${rpc}`,
          closeMenu: () => this.props.hideNetworkDropdown(),
          onClick: () => props.setRpcTarget(rpc, chainId, ticker, nickname),
          style: {
            fontSize: '16px',
            lineHeight: '20px',
            padding: '12px 0',
          },
        },
        [
          currentRpcTarget ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
          h('i.fa.fa-question-circle.fa-med.menu-icon-circle'),
          h('span.network-name-item', {
            style: {
              color: currentRpcTarget ? '#ffffff' : '#9b9b9b',
            },
          }, nickname || rpc),
          h('i.fa.fa-times.delete',
            {
              onClick: (e) => {
                e.stopPropagation()
                props.delRpcTarget(rpc)
              },
            }),
        ]
      )
    }
  })
}

NetworkDropdown.prototype.renderCustomOption = function (provider) {
  const { rpcTarget, type, ticker, nickname } = provider
  const props = this.props
  const network = props.network

  if (type !== 'rpc') return null

  switch (rpcTarget) {

    case 'http://localhost:8545':
      return null

    default:
      return h(
        DropdownMenuItem,
        {
          key: rpcTarget,
          onClick: () => props.setRpcTarget(rpcTarget, network, ticker, nickname),
          closeMenu: () => this.props.hideNetworkDropdown(),
          style: {
            fontSize: '16px',
            lineHeight: '20px',
            padding: '12px 0',
          },
        },
        [
          h('i.fa.fa-check'),
          h('i.fa.fa-question-circle.fa-med.menu-icon-circle'),
          h('span.network-name-item', {
            style: {
              color: '#ffffff',
            },
          }, nickname || rpcTarget),
        ]
      )
=======
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
          <div className="network-dropdown-content" style={{ 'text-align': 'center', fontSize: '16px' }}>
            Provider: {rpcType}
          </div>
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
          {
            providerType === 'mainnet'
              ? <i className="fa fa-check" />
              : <div className="network-check__transparent">✓</div>
          }
          <NetworkDropdownIcon backgroundColor="#29B6AF" isSelected={providerType === 'mainnet'} />
          <span
            className="network-name-item"
            style={{
              color: providerType === 'mainnet'
                ? '#ffffff'
                : '#9b9b9b',
            }}
          >
            {this.context.t('mainnet')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          key="ropsten"
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => this.handleClick('ropsten')}
          style={ rpcType === 'in3' ? hidden : dropdownMenuItemStyle }
        >
          {
            providerType === 'ropsten'
              ? <i className="fa fa-check" />
              : <div className="network-check__transparent">✓</div>
          }
          <NetworkDropdownIcon backgroundColor="#ff4a8d" isSelected={providerType === 'ropsten'} />
          <span
            className="network-name-item"
            style={{
              color: providerType === 'ropsten'
                ? '#ffffff'
                : '#9b9b9b',
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
          {
            providerType === 'kovan'
              ? <i className="fa fa-check" />
              : <div className="network-check__transparent">✓</div>
          }
          <NetworkDropdownIcon backgroundColor="#7057ff" isSelected={providerType === 'kovan'} />
          <span
            className="network-name-item"
            style={{
              color: providerType === 'kovan'
                ? '#ffffff'
                : '#9b9b9b',
            }}
          >
            {this.context.t('kovan')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          key="rinkeby"
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => this.handleClick('rinkeby')}
          style={ rpcType === 'in3' ? hidden : dropdownMenuItemStyle }
        >
          {
            providerType === 'rinkeby'
              ? <i className="fa fa-check" />
              : <div className="network-check__transparent">✓</div>
          }
          <NetworkDropdownIcon backgroundColor="#f6c343" isSelected={providerType === 'rinkeby'} />
          <span
            className="network-name-item"
            style={{
              color: providerType === 'rinkeby'
                ? '#ffffff'
                : '#9b9b9b',
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
          {
            providerType === 'goerli'
              ? <i className="fa fa-check" />
              : <div className="network-check__transparent">✓</div>
          }
          <NetworkDropdownIcon backgroundColor="#3099f2" isSelected={providerType === 'goerli'} />
          <span
            className="network-name-item"
            style={{
              color: providerType === 'goerli'
                ? '#ffffff'
                : '#9b9b9b',
            }}
          >
            {this.context.t('goerli')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          key="default"
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => this.handleClick('localhost')}
          style={dropdownMenuItemStyle}
        >
          {
            providerType === 'localhost'
              ? <i className="fa fa-check" />
              : <div className="network-check__transparent">✓</div>
          }
          <NetworkDropdownIcon isSelected={providerType === 'localhost'} innerBorder="1px solid #9b9b9b" />
          <span
            className="network-name-item"
            style={{
              color: providerType === 'localhost'
                ? '#ffffff'
                : '#9b9b9b',
            }}
          >
            {this.context.t('localhost')}
          </span>
        </DropdownMenuItem>
        {this.renderCustomOption(this.props.provider)}
        {this.renderCommonRpc(rpcListDetail, this.props.provider)}
        <DropdownMenuItem
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => {
            setNetworksTabAddMode(true)
            this.props.history.push(NETWORKS_ROUTE)
          }}
          style={dropdownMenuItemStyle}
        >
          {
            activeNetwork === 'custom'
              ? <i className="fa fa-check" />
              : <div className="network-check__transparent">✓</div>
          }
          <NetworkDropdownIcon isSelected={activeNetwork === 'custom'} innerBorder="1px solid #9b9b9b" />
          <span
            className="network-name-item"
            style={{
              color: activeNetwork === 'custom'
                ? '#ffffff'
                : '#9b9b9b',
            }}
          >
            {this.context.t('customRPC')}
          </span>
        </DropdownMenuItem>
      </Dropdown>
    )
>>>>>>> eebc504b0f23d7c7b725e111a89665a2ac7d50dc
  }
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(NetworkDropdown)

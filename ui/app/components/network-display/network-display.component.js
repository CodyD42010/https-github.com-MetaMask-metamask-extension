import React, { Component } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import {
  MAINNET_CODE,
  ROPSTEN_CODE,
  RINKEYBY_CODE,
  KOVAN_CODE,
} from '../../../../app/scripts/controllers/network/enums'

const networkToClassHash = {
  [MAINNET_CODE]: 'mainnet',
  [ROPSTEN_CODE]: 'ropsten',
  [RINKEYBY_CODE]: 'rinkeby',
  [KOVAN_CODE]: 'kovan',
}

export default class NetworkDisplay extends Component {
  static defaultProps = {
    colored: true,
  }

  static propTypes = {
    colored: PropTypes.bool,
    network: PropTypes.string,
    provider: PropTypes.object,
  }

  static contextTypes = {
    t: PropTypes.func,
  }

  renderNetworkIcon () {
    const { network } = this.props
    const networkClass = networkToClassHash[network]

    return networkClass
      ? <div className={`network-display__icon network-display__icon--${networkClass}`} />
      : <div
          className="i fa fa-question-circle fa-med"
          style={{
            margin: '0 4px',
            color: 'rgb(125, 128, 130)',
          }}
        />
  }

  render () {
    const { colored, network, provider: { type, nickname } } = this.props
    const networkClass = networkToClassHash[network]

    return (
      <div
        className={classnames('network-display__container', {
          'network-display__container--colored': colored,
          ['network-display__container--' + networkClass]: colored && networkClass,
        })}
      >
        {
          networkClass
            ? <div className={`network-display__icon network-display__icon--${networkClass}`} />
            : <div
                className="i fa fa-question-circle fa-med"
                style={{
                  margin: '0 4px',
                  color: 'rgb(125, 128, 130)',
                }}
              />
        }
        <div className="network-display__name">
          { type === 'rpc' && nickname ? nickname : this.context.t(type) }
        </div>
      </div>
    )
  }
}

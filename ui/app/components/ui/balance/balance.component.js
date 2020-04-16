import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import TokenBalance from '../token-balance'
import Identicon from '../identicon'
import UserPreferencedCurrencyDisplay from '../../app/user-preferenced-currency-display'
import { PRIMARY, SECONDARY } from '../../../helpers/constants/common'
import { formatBalance } from '../../../helpers/utils/util'
import Tooltip from '../tooltip-v2'

export default class Balance extends PureComponent {
  static contextTypes = {
    t: PropTypes.func.isRequired,
  }

  static propTypes = {
    account: PropTypes.object,
    assetImages: PropTypes.object,
    nativeCurrency: PropTypes.string,
    needsParse: PropTypes.bool,
    network: PropTypes.string,
    showFiat: PropTypes.bool,
    token: PropTypes.object,
  }

  static defaultProps = {
    needsParse: true,
    showFiat: true,
  }

  renderBalance () {
    const { account, nativeCurrency, needsParse, showFiat } = this.props
    const { t } = this.context
    const balanceValue = account && account.balance
    const formattedBalance = balanceValue
      ? formatBalance(balanceValue, 6, needsParse, nativeCurrency)
      : '...'

    if (formattedBalance === 'None' || formattedBalance === '...') {
      return (
        <div className="flex-column balance-display">
          <div className="token-amount">{formattedBalance}</div>
        </div>
      )
    }

    return (
      <div
        className="flex-column balance-display"
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <UserPreferencedCurrencyDisplay
          className="token-amount"
          value={balanceValue}
          type={PRIMARY}
          ethNumberOfDecimals={4}
        />
        <Tooltip position="bottom" title={t('cfxTestWarning')}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <i
              className="fa fa-info-circle"
              style={{
                marginLeft: '6px',
                fontSize: '80%',
                color: '#fbdc5e',
              }}
            />
          </div>
        </Tooltip>
        {showFiat && (
          <UserPreferencedCurrencyDisplay
            value={balanceValue}
            type={SECONDARY}
            ethNumberOfDecimals={4}
          />
        )}
      </div>
    )
  }

  renderTokenBalance () {
    const { token } = this.props

    return (
      <div className="flex-column balance-display">
        <div className="token-amount">
          <TokenBalance token={token} />
        </div>
      </div>
    )
  }

  render () {
    const { token, network, assetImages } = this.props
    const address = token && token.address
    const image =
      assetImages && address ? assetImages[token.address] : undefined

    return (
      <div className="balance-container">
        <Identicon
          diameter={50}
          address={address}
          network={network}
          image={image}
        />
        {token ? this.renderTokenBalance() : this.renderBalance()}
      </div>
    )
  }
}

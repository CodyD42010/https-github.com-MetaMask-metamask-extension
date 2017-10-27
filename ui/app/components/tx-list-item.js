const Component = require('react').Component
const h = require('react-hyperscript')
const connect = require('react-redux').connect
const inherits = require('util').inherits
const classnames = require('classnames')
const abi = require('human-standard-token-abi')
const abiDecoder = require('abi-decoder')
abiDecoder.addABI(abi)
const prefixForNetwork = require('../../lib/etherscan-prefix-for-network')
const Identicon = require('./identicon')

const { conversionUtil, multiplyCurrencies } = require('../conversion-util')

const { getCurrentCurrency } = require('../selectors')

module.exports = connect(mapStateToProps)(TxListItem)

function mapStateToProps (state) {
  return {
    tokens: state.metamask.tokens,
    currentCurrency: getCurrentCurrency(state),
    tokenExchangeRates: state.metamask.tokenExchangeRates,
  }
}

inherits(TxListItem, Component)
function TxListItem () {
  Component.call(this)
}

TxListItem.prototype.getAddressText = function () {
  const {
    address,
    txParams = {},
  } = this.props

  const decodedData = txParams.data && abiDecoder.decodeMethod(txParams.data)
  const { name: txDataName, params = [] } = decodedData || {}
  const { value } = params[0] || {}

  switch (txDataName) {
    case 'transfer':
      return `${value.slice(0, 10)}...${value.slice(-4)}`
    default:
      return address
        ? `${address.slice(0, 10)}...${address.slice(-4)}`
        : 'Contract Published'
  }
}

TxListItem.prototype.getSendEtherTotal = function () {
  const {
    transactionAmount,
    conversionRate,
    address,
    currentCurrency,
  } = this.props

  if (!address) {
    return {}
  }

  const totalInFiat = conversionUtil(transactionAmount, {
    fromNumericBase: 'hex',
    toNumericBase: 'dec',
    fromCurrency: 'ETH',
    toCurrency: currentCurrency,
    fromDenomination: 'WEI',
    numberOfDecimals: 2,
    conversionRate,
  })
  const totalInETH = conversionUtil(transactionAmount, {
    fromNumericBase: 'hex',
    toNumericBase: 'dec',
    fromCurrency: 'ETH',
    toCurrency: 'ETH',
    fromDenomination: 'WEI',
    conversionRate,
    numberOfDecimals: 6,
  })

  return {
    total: `${totalInETH} ETH`,
    fiatTotal: `${totalInFiat} ${currentCurrency.toUpperCase()}`,
  }
}

TxListItem.prototype.getSendTokenTotal = function () {
  const {
    txParams = {},
    tokens,
    conversionRate,
    tokenExchangeRates,
    currentCurrency,
  } = this.props

  const toAddress = txParams.to
  const decodedData = txParams.data && abiDecoder.decodeMethod(txParams.data)
  const { params = [] } = decodedData || {}
  const { value } = params[1] || {}
  const { decimals, symbol } = tokens.filter(({ address }) => address === toAddress)[0] || {}
  const multiplier = Math.pow(10, Number(decimals || 0))
  const total = Number(value / multiplier)

  const pair = symbol && `${symbol.toLowerCase()}_eth`;
  
  let tokenToFiatRate
  let totalInFiat

  if (tokenExchangeRates[pair]) {
    tokenToFiatRate = multiplyCurrencies(
      tokenExchangeRates[pair].rate,
      conversionRate
    )

    totalInFiat = conversionUtil(total, {
      fromNumericBase: 'dec',
      toNumericBase: 'dec',
      fromCurrency: symbol,
      toCurrency: currentCurrency,
      numberOfDecimals: 2,
      conversionRate: tokenToFiatRate,
    })
  }

  const showFiat = Boolean(totalInFiat) && currentCurrency.toUpperCase() !== symbol

  return {
    total: `${total} ${symbol}`,
    fiatTotal: showFiat && `${totalInFiat} ${currentCurrency.toUpperCase()}`,
  }
}

TxListItem.prototype.render = function () {
  const {
    transactionStatus,
    onClick,
    transActionId,
    dateString,
    address,
    className,
    txParams = {},
  } = this.props

  const decodedData = txParams.data && abiDecoder.decodeMethod(txParams.data)
  const { name: txDataName } = decodedData || {}

  const { total, fiatTotal } = txDataName === 'transfer'
    ? this.getSendTokenTotal()
    : this.getSendEtherTotal()

  return h(`div${className || ''}`, {
    key: transActionId,
    onClick: () => onClick && onClick(transActionId),
  }, [
    h(`div.flex-column.tx-list-item-wrapper`, {}, [

      h('div.tx-list-date-wrapper', {
        style: {},
      }, [
        h('span.tx-list-date', {}, [
          dateString,
        ]),
      ]),

      h('div.flex-row.tx-list-content-wrapper', {
        style: {},
      }, [

        h('div.tx-list-identicon-wrapper', {
          style: {},
        }, [
          h(Identicon, {
            address,
            diameter: 28,
          }),
        ]),

        h('div.tx-list-account-and-status-wrapper', {}, [
          h('div.tx-list-account-wrapper', {
            style: {},
          }, [
            h('span.tx-list-account', {}, [
              this.getAddressText(address),
            ]),
          ]),

          h('div.tx-list-status-wrapper', {
            style: {},
          }, [
            h('span', {
              className: classnames('tx-list-status', {
                'tx-list-status--rejected': transactionStatus === 'rejected',
                'tx-list-status--failed': transactionStatus === 'failed',
              }),
            },
              transactionStatus,
            ),
          ]),
        ]),

        h('div.flex-column.tx-list-details-wrapper', {
          style: {},
        }, [

          h('span', {
            className: classnames('tx-list-value', {
              'tx-list-value--confirmed': transactionStatus === 'confirmed',
            }),
          }, total),

          fiatTotal && h('span.tx-list-fiat-value', fiatTotal),

        ]),
      ]),
    ]) // holding on icon from design
  ])
}

const {
  addCurrencies,
  conversionUtil,
  conversionGTE,
  multiplyCurrencies,
} = require('../../conversion-util')
const {
  calcTokenAmount,
} = require('../../token-util')

function isBalanceSufficient ({
  amount = '0x0',
  gasTotal = '0x0',
  balance,
  primaryCurrency,
  amountConversionRate,
  conversionRate,
}) {
  const totalAmount = addCurrencies(amount, gasTotal, {
    aBase: 16,
    bBase: 16,
    toNumericBase: 'hex',
  })

  const balanceIsSufficient = conversionGTE(
    {
      value: balance,
      fromNumericBase: 'hex',
      fromCurrency: primaryCurrency,
      conversionRate,
    },
    {
      value: totalAmount,
      fromNumericBase: 'hex',
      conversionRate: amountConversionRate || conversionRate,
      fromCurrency: primaryCurrency,
    },
  )

  return balanceIsSufficient
}

function isTokenBalanceSufficient ({
  amount = '0x0',
  tokenBalance,
  decimals,
}) {
  const amountInDec = conversionUtil(amount, {
    fromNumericBase: 'hex',
  })

  const tokenBalanceIsSufficient = conversionGTE(
    {
      value: tokenBalance,
      fromNumericBase: 'dec',
    },
    {
      value: calcTokenAmount(amountInDec, decimals),
      fromNumericBase: 'dec',
    },
  )

  return tokenBalanceIsSufficient
}

function getGasTotal (gasLimit, gasPrice) {
  return multiplyCurrencies(gasLimit, gasPrice, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 16,
  })
}

module.exports = {
  getGasTotal,
  isBalanceSufficient,
  isTokenBalanceSufficient,
}

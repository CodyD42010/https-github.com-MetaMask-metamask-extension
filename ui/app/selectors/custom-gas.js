import { pipe, partialRight } from 'ramda'
import {
  conversionUtil,
  multiplyCurrencies,
  conversionGreaterThan,
} from '../conversion-util'
import {
  getCurrentCurrency,
} from '../selectors'
import {
  formatCurrency,
} from '../helpers/confirm-transaction/util'
import {
  decEthToConvertedCurrency as ethTotalToConvertedCurrency,
} from '../helpers/conversions.util'
import {
  formatETHFee,
} from '../helpers/formatters'
import {
  calcGasTotal,
} from '../components/send/send.utils'
import { addHexPrefix } from 'ethereumjs-util'

const selectors = {
  formatTimeEstimate,
  getAveragePriceEstimateInHexWEI,
  getFastPriceEstimateInHexWEI,
  getBasicGasEstimateLoadingStatus,
  getBasicGasEstimateBlockTime,
  getCustomGasErrors,
  getCustomGasLimit,
  getCustomGasPrice,
  getCustomGasTotal,
  getDefaultActiveButtonIndex,
  getEstimatedGasPrices,
  getEstimatedGasTimes,
  getGasEstimatesLoadingStatus,
  getPriceAndTimeEstimates,
  getRenderableBasicEstimateData,
  getRenderableEstimateDataForSmallButtonsFromGWEI,
  priceEstimateToWei,
  getSafeLowEstimate,
  isCustomPriceSafe,
}

module.exports = selectors

const NUMBER_OF_DECIMALS_SM_BTNS = 5

function getCustomGasErrors (state) {
  return state.gas.errors
}

function getCustomGasLimit (state) {
  return state.gas.customData.limit
}

function getCustomGasPrice (state) {
  return state.gas.customData.price
}

function getCustomGasTotal (state) {
  return state.gas.customData.total
}

function getBasicGasEstimateLoadingStatus (state) {
  return state.gas.basicEstimateIsLoading
}

function getGasEstimatesLoadingStatus (state) {
  return state.gas.gasEstimatesLoading
}

function getPriceAndTimeEstimates (state) {
  return state.gas.priceAndTimeEstimates
}

function getEstimatedGasPrices (state) {
  return getPriceAndTimeEstimates(state).map(({ gasprice }) => gasprice)
}

function getEstimatedGasTimes (state) {
  return getPriceAndTimeEstimates(state).map(({ expectedTime }) => expectedTime)
}

function getAveragePriceEstimateInHexWEI (state) {
  const averagePriceEstimate = state.gas.basicEstimates.average
  return getGasPriceInHexWei(averagePriceEstimate || '0x0')
}

function getFastPriceEstimateInHexWEI (state) {
  const fastPriceEstimate = state.gas.basicEstimates.fast
  return getGasPriceInHexWei(fastPriceEstimate || '0x0')
}

function getDefaultActiveButtonIndex (gasButtonInfo, customGasPriceInHex, gasPrice) {
  return gasButtonInfo.findIndex(({ priceInHexWei }) => {
    return priceInHexWei === addHexPrefix(customGasPriceInHex || gasPrice)
  })
}

function getSafeLowEstimate (state) {
  const {
    gas: {
      basicEstimates: {
        safeLow,
      },
    },
  } = state

  return safeLow
}

function isCustomPriceSafe (state) {
  const safeLow = getSafeLowEstimate(state)
  const customGasPrice = getCustomGasPrice(state)

  if (!customGasPrice) {
    return true
  }

  const customPriceSafe = conversionGreaterThan(
    {
      value: customGasPrice,
      fromNumericBase: 'hex',
      fromDenomination: 'WEI',
      toDenomination: 'GWEI',
    },
    { value: safeLow, fromNumericBase: 'dec' }
  )

  return customPriceSafe
}

function getBasicGasEstimateBlockTime (state) {
  return state.gas.basicEstimates.blockTime
}

function basicPriceEstimateToETHTotal (estimate, gasLimit, numberOfDecimals = 9) {
  return conversionUtil(calcGasTotal(gasLimit, estimate), {
    fromNumericBase: 'hex',
    toNumericBase: 'dec',
    fromDenomination: 'GWEI',
    numberOfDecimals,
  })
}

function getRenderableEthFee (estimate, gasLimit, numberOfDecimals = 9) {
  return pipe(
    x => conversionUtil(x, { fromNumericBase: 'dec', toNumericBase: 'hex' }),
    partialRight(basicPriceEstimateToETHTotal, [gasLimit, numberOfDecimals]),
    formatETHFee
  )(estimate, gasLimit)
}


function getRenderableConvertedCurrencyFee (estimate, gasLimit, convertedCurrency, conversionRate) {
  return pipe(
    x => conversionUtil(x, { fromNumericBase: 'dec', toNumericBase: 'hex' }),
    partialRight(basicPriceEstimateToETHTotal, [gasLimit]),
    partialRight(ethTotalToConvertedCurrency, [convertedCurrency, conversionRate]),
    partialRight(formatCurrency, [convertedCurrency])
  )(estimate, gasLimit, convertedCurrency, conversionRate)
}

function getTimeEstimateInSeconds (blockWaitEstimate) {
  return multiplyCurrencies(blockWaitEstimate, 60, {
    toNumericBase: 'dec',
    multiplicandBase: 10,
    multiplierBase: 10,
    numberOfDecimals: 1,
  })
}

function formatTimeEstimate (totalSeconds, greaterThanMax, lessThanMin) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (!minutes && !seconds) {
    return '...'
  }

  let symbol = '~'
  if (greaterThanMax) {
    symbol = '< '
  } else if (lessThanMin) {
    symbol = '> '
  }

  const formattedMin = `${minutes ? minutes + ' min' : ''}`
  const formattedSec = `${seconds ? seconds + ' sec' : ''}`
  const formattedCombined = formattedMin && formattedSec
    ? `${symbol}${formattedMin} ${formattedSec}`
    : symbol + [formattedMin, formattedSec].find(t => t)

  return formattedCombined
}

function getRenderableTimeEstimate (blockWaitEstimate) {
  return pipe(
    getTimeEstimateInSeconds,
    formatTimeEstimate
  )(blockWaitEstimate)
}

function priceEstimateToWei (priceEstimate) {
  return conversionUtil(priceEstimate, {
    fromNumericBase: 'hex',
    toNumericBase: 'hex',
    fromDenomination: 'GWEI',
    toDenomination: 'WEI',
    numberOfDecimals: 9,
  })
}

function getGasPriceInHexWei (price) {
  return pipe(
    x => conversionUtil(x, { fromNumericBase: 'dec', toNumericBase: 'hex' }),
    priceEstimateToWei,
    addHexPrefix
  )(price)
}

function getRenderableBasicEstimateData (state, gasLimit) {
  if (getBasicGasEstimateLoadingStatus(state)) {
    return []
  }
  const conversionRate = state.metamask.conversionRate
  const currentCurrency = getCurrentCurrency(state)
  const {
    gas: {
      basicEstimates: {
        safeLow,
        fast,
        fastest,
        safeLowWait,
        fastestWait,
        fastWait,
      },
    },
  } = state

  return [
    {
      labelKey: 'slow',
      feeInPrimaryCurrency: getRenderableConvertedCurrencyFee(safeLow, gasLimit, currentCurrency, conversionRate),
      feeInSecondaryCurrency: getRenderableEthFee(safeLow, gasLimit),
      timeEstimate: safeLowWait && getRenderableTimeEstimate(safeLowWait),
      priceInHexWei: getGasPriceInHexWei(safeLow),
    },
    {
      labelKey: 'average',
      feeInPrimaryCurrency: getRenderableConvertedCurrencyFee(fast, gasLimit, currentCurrency, conversionRate),
      feeInSecondaryCurrency: getRenderableEthFee(fast, gasLimit),
      timeEstimate: fastWait && getRenderableTimeEstimate(fastWait),
      priceInHexWei: getGasPriceInHexWei(fast),
    },
    {
      labelKey: 'fast',
      feeInPrimaryCurrency: getRenderableConvertedCurrencyFee(fastest, gasLimit, currentCurrency, conversionRate),
      feeInSecondaryCurrency: getRenderableEthFee(fastest, gasLimit),
      timeEstimate: fastestWait && getRenderableTimeEstimate(fastestWait),
      priceInHexWei: getGasPriceInHexWei(fastest),
    },
  ]
}

function getRenderableEstimateDataForSmallButtonsFromGWEI (state) {
  if (getBasicGasEstimateLoadingStatus(state)) {
    return []
  }
  const gasLimit = state.metamask.send.gasLimit || getCustomGasLimit(state) || '0x5208'
  const conversionRate = state.metamask.conversionRate
  const currentCurrency = getCurrentCurrency(state)
  const {
    gas: {
      basicEstimates: {
        safeLow,
        fast,
        fastest,
      },
    },
  } = state

  return [
    {
      labelKey: 'slow',
      feeInSecondaryCurrency: getRenderableConvertedCurrencyFee(safeLow, gasLimit, currentCurrency, conversionRate),
      feeInPrimaryCurrency: getRenderableEthFee(safeLow, gasLimit, NUMBER_OF_DECIMALS_SM_BTNS, true),
      priceInHexWei: getGasPriceInHexWei(safeLow, true),
    },
    {
      labelKey: 'average',
      feeInSecondaryCurrency: getRenderableConvertedCurrencyFee(fast, gasLimit, currentCurrency, conversionRate),
      feeInPrimaryCurrency: getRenderableEthFee(fast, gasLimit, NUMBER_OF_DECIMALS_SM_BTNS, true),
      priceInHexWei: getGasPriceInHexWei(fast, true),
    },
    {
      labelKey: 'fast',
      feeInSecondaryCurrency: getRenderableConvertedCurrencyFee(fastest, gasLimit, currentCurrency, conversionRate),
      feeInPrimaryCurrency: getRenderableEthFee(fastest, gasLimit, NUMBER_OF_DECIMALS_SM_BTNS, true),
      priceInHexWei: getGasPriceInHexWei(fastest, true),
    },
  ]
}

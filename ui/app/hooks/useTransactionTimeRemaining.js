import { useSelector } from 'react-redux'
import { useRef, useEffect, useState, useMemo } from 'react'
import { isEqual } from 'lodash'
import { captureException } from '@sentry/browser'
import { hexWEIToDecGWEI } from '../helpers/utils/conversions.util'
import {
  getEstimatedGasPrices,
  getEstimatedGasTimes,
  getFeatureFlags,
  getIsMainnet,
} from '../selectors'
import { getRawTimeEstimateData } from '../helpers/utils/gas-time-estimates.util'
import { getCurrentLocale } from '../ducks/metamask/metamask'

/**
 * Calculate the number of minutes remaining until the transaction completes.
 * @param {number} initialTimeEstimate - timestamp for the projected completion time
 * @param {number} submittedTime       - timestamp of when the tx was submitted
 * @return {number} minutes remaining
 */
function calcTransactionTimeRemaining(initialTimeEstimate, submittedTime) {
  const currentTime = new Date().getTime()
  const timeElapsedSinceSubmission = (currentTime - submittedTime) / 1000
  const timeRemainingOnEstimate =
    initialTimeEstimate - timeElapsedSinceSubmission

  const renderingTimeRemainingEstimate = Math.round(
    timeRemainingOnEstimate / 60,
  )
  return renderingTimeRemainingEstimate
}

/**
 * returns a string representing the number of minutes predicted for the transaction to be
 * completed. Only returns this prediction if the transaction is the earliest pending
 * transaction, and the feature flag for showing timing is enabled.
 * @param {bool} isSubmitted       - is the transaction currently in the 'submitted' state
 * @param {bool} isEarliestNonce   - is this transaction the earliest nonce in list
 * @param {number} submittedTime   - the timestamp for when the transaction was submitted
 * @param {number} currentGasPrice - gas price to use for calculation of time
 * @param {boolean} dontFormat     - Whether the result should be be formatted, or just a number of minutes
 * @returns {string | undefined} i18n formatted string if applicable
 */
export function useTransactionTimeRemaining(
  isSubmitted,
  isEarliestNonce,
  submittedTime,
  currentGasPrice,
  forceAllow,
  dontFormat,
) {
  // the following two selectors return the result of mapping over an array, as such they
  // will always be new objects and trigger effects. To avoid this, we use isEqual as the
  // equalityFn to only update when the data is new.
  const gasPrices = useSelector(getEstimatedGasPrices, isEqual)
  const estimatedTimes = useSelector(getEstimatedGasTimes, isEqual)
  const locale = useSelector(getCurrentLocale)
  const isMainNet = useSelector(getIsMainnet)
  const interval = useRef()
  const [timeRemaining, setTimeRemaining] = useState(null)
  const featureFlags = useSelector(getFeatureFlags)
  const transactionTimeFeatureActive = featureFlags?.transactionTime

  const rtf = new Intl.RelativeTimeFormat(locale.replace('_', '-'), {
    numeric: 'auto',
    style: 'narrow',
  })

  // Memoize this value so it can be used as a dependency in the effect below
  const initialTimeEstimate = useMemo(() => {
    const customGasPrice = Number(hexWEIToDecGWEI(currentGasPrice))
    try {
      const { newTimeEstimate } = getRawTimeEstimateData(
        customGasPrice,
        gasPrices,
        estimatedTimes,
      )
      return newTimeEstimate
    } catch (error) {
      captureException(error)
      return NaN
    }
  }, [currentGasPrice, gasPrices, estimatedTimes])

  useEffect(() => {
    if (
      isMainNet &&
      (transactionTimeFeatureActive || forceAllow) &&
      isSubmitted &&
      isEarliestNonce &&
      !isNaN(initialTimeEstimate)
    ) {
      clearInterval(interval.current)
      setTimeRemaining(
        calcTransactionTimeRemaining(initialTimeEstimate, submittedTime),
      )
      interval.current = setInterval(() => {
        setTimeRemaining(
          calcTransactionTimeRemaining(initialTimeEstimate, submittedTime),
        )
      }, 10000)
      return () => clearInterval(interval.current)
    }
    return undefined
  }, [
    isMainNet,
    transactionTimeFeatureActive,
    isEarliestNonce,
    submittedTime,
    initialTimeEstimate,
    forceAllow,
    isSubmitted,
  ])

  // there are numerous checks to determine if time should be displayed.
  // if any of the following are true, the timeRemaining will be null
  // User is currently not on the mainnet
  // User does not have the transactionTime feature flag enabled
  // The transaction is not pending, or isn't the earliest nonce
  if (timeRemaining && dontFormat) {
    return timeRemaining
  } else if (timeRemaining) {
    return rtf.format(timeRemaining, 'minute')
  }
  return undefined
}

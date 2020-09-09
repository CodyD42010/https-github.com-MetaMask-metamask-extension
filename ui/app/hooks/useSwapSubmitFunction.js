import { useDispatch, useSelector } from 'react-redux'

import { useHistory, useLocation } from 'react-router-dom'
import BigNumber from 'bignumber.js'
import { calcTokenAmount } from '../helpers/utils/token-util'

import { LOADING_QUOTES_ROUTE, DEFAULT_ROUTE, ASSET_ROUTE, AWAITING_SWAP_ROUTE, BUILD_QUOTE_ROUTE, VIEW_QUOTE_ROUTE, SWAPS_ERROR_ROUTE } from '../helpers/constants/routes'
import {
  QUOTES_EXPIRED_ERROR,
  ERROR_FETCHING_QUOTES,
  QUOTES_NOT_AVAILABLE_ERROR,
} from '../helpers/constants/swaps'

import {
  getApproveTxParams,
  setApproveTxId,
  getFetchParams,
  setFetchingQuotes,
  setSwapFromToken,
  getSwapsTokens,
  getSelectedQuote,
  getMaxMode,
  setBalanceError,
  setSwapQuotesFetchStartTime,
  getBestQuoteAggId,
  getQuotes,
  getCustomSwapsGas,
  getSwapsTradeTxParams,
  getSwapsErrorKey,
} from '../ducks/swaps/swaps'
import { setInitialGasEstimate, setSwapsErrorKey, resetSwapsPostFetchState, setTradeTxId, addUnapprovedTransaction, updateAndApproveTx, setQuotes, forceUpdateMetamaskState, updateTransaction, addToken, fetchAndSetQuotes, setTradeTxParams, setApproveTxParams, resetBackgroundSwapsState, setShowAwaitingSwapScreen, setTradeTxParamsWithGasEstimate, updateBlockTrackerListener, setQuotesStatus, estimateGasFromTxParams, stopPollingForQuotes, setBackgoundSwapRouteState } from '../store/actions'
import { fetchTradesInfo } from '../pages/swaps/swaps.util'
import { getTokenExchangeRates, getConversionRate } from '../selectors'
import { calcGasTotal } from '../pages/send/send.utils'
import { constructTxParams } from '../helpers/utils/util'

import { decimalToHex, getValueFromWeiHex } from '../helpers/utils/conversions.util'

export function useSwapSubmitFunction ({
  maxSlippage,
  inputValue,
  usedGasPrice,
  selectedAccountAddress,
  selectedFromToken,
  selectedToToken,
  balanceError,
  conversionError,
  ethBalance,
  setSubmittingSwap,
  networkId,
  isCustomNetwork,
  quotesStatus,
  isRetry,
  fetchingQuotes,
  quotesRequestCancelledEvent,
}) {
  const dispatch = useDispatch()
  const history = useHistory()
  const { pathname } = useLocation()
  const retry = () => {
    dispatch(resetSwapsPostFetchState())
    dispatch(setBalanceError(false))
    setSubmittingSwap(false)

    history.push(BUILD_QUOTE_ROUTE)
  }
  const isBuildQuoteRoute = pathname === BUILD_QUOTE_ROUTE
  const isViewQuoteRoute = pathname === VIEW_QUOTE_ROUTE
  const isAwaitingSwapRoute = pathname === AWAITING_SWAP_ROUTE
  const isSwapsErrorRoute = pathname === SWAPS_ERROR_ROUTE
  const isLoadingQuoteRoute = pathname === LOADING_QUOTES_ROUTE

  const tradeTxParams = useSelector(getSwapsTradeTxParams)
  const approveTxParams = useSelector(getApproveTxParams)
  const fetchParams = useSelector(getFetchParams)
  const contractExchangeRates = useSelector(getTokenExchangeRates)
  const selectedQuote = useSelector(getSelectedQuote)
  const maxMode = useSelector(getMaxMode)
  const quotes = useSelector(getQuotes)
  const numberOfQuotes = quotes.length
  const bestQuoteAggId = useSelector(getBestQuoteAggId)
  const customMaxGas = useSelector(getCustomSwapsGas)
  const conversionRate = useSelector(getConversionRate)
  const swapsErrorKey = useSelector(getSwapsErrorKey)

  const swapsTokens = useSelector(getSwapsTokens)

  const goHome = () => {
    dispatch(setBalanceError(false))
    dispatch(resetBackgroundSwapsState())
    setSubmittingSwap(false)

    history.push(DEFAULT_ROUTE)
  }
  const goToToken = () => {
    dispatch(setBalanceError(false))
    dispatch(resetBackgroundSwapsState())
    setSubmittingSwap(false)

    history.push(`${ASSET_ROUTE}/${selectedToToken.address}`)
  }
  if (isRetry) {
    return retry
  }

  const signAndSendTransactions = async () => {
    const { sourceTokenInfo = {}, destinationTokenInfo = {}, value: swapTokenValue, slippage } = fetchParams
    history.push(AWAITING_SWAP_ROUTE)

    dispatch(stopPollingForQuotes())

    setSubmittingSwap(true)
    let usedTradeTxParams = tradeTxParams

    const totalGasLimitForCalculation = (new BigNumber(usedTradeTxParams.gas, 16)).plus(selectedQuote.approvalNeeded?.gas || '0x0', 16).toString(16)
    const gasTotalInWeiHex = calcGasTotal(totalGasLimitForCalculation, usedGasPrice)
    if (maxMode && sourceTokenInfo.symbol === 'ETH') {
      const revisedTradeValue = (new BigNumber(ethBalance, 16)).minus(gasTotalInWeiHex, 16).toString(10)
      const [revisedQuote] = await fetchTradesInfo({
        sourceToken: sourceTokenInfo.address,
        destinationToken: destinationTokenInfo.address,
        slippage,
        value: revisedTradeValue,
        exchangeList: selectedQuote.aggregator,
        fromAddress: selectedAccountAddress,
        timeout: 10000,
        networkId,
        isCustomNetwork,
      })
      const tradeForGasEstimate = { ...revisedQuote.trade }
      delete tradeForGasEstimate.gas
      usedTradeTxParams = constructTxParams({
        ...revisedQuote.trade,
        gas: decimalToHex(usedTradeTxParams.gas),
        amount: decimalToHex(revisedQuote.trade.value),
        gasPrice: tradeTxParams.gasPrice,
      })
    }
    const destinationValue = calcTokenAmount(selectedQuote.destinationAmount, destinationTokenInfo.decimals || 18).toPrecision(8)

    if (approveTxParams) {
      const approveTxMeta = await dispatch(addUnapprovedTransaction(approveTxParams, 'metamask'))
      dispatch(setApproveTxId(approveTxMeta.id))
      const finalApproveTxMeta = await (dispatch(updateTransaction({
        ...approveTxMeta,
        sourceTokenSymbol: sourceTokenInfo.symbol,
      }, true)))
      await dispatch(updateAndApproveTx(finalApproveTxMeta, true))
    }

    const tradeTxMeta = await dispatch(addUnapprovedTransaction(usedTradeTxParams, 'metamask'))
    dispatch(setTradeTxId(tradeTxMeta.id))
    const finalTradeTxMeta = await (dispatch(updateTransaction({
      ...tradeTxMeta,
      sourceTokenSymbol: sourceTokenInfo.symbol,
      destinationTokenSymbol: destinationTokenInfo.symbol,
      swapTokenValue,
    }, true)))
    await dispatch(updateAndApproveTx(finalTradeTxMeta, 'metamask', true))

    await forceUpdateMetamaskState(dispatch)
    dispatch(setShowAwaitingSwapScreen(true))
    setSubmittingSwap(false)
  }

  const fetchQuotesAndSetQuoteState = async () => {
    const {
      address: fromTokenAddress,
      symbol: fromTokenSymbol,
      decimals: fromTokenDecimals,
      iconUrl: fromTokenIconUrl,
      balance: fromTokenBalance,
    } = selectedFromToken
    const {
      address: toTokenAddress,
      symbol: toTokenSymbol,
      decimals: toTokenDecimals,
      iconUrl: toTokenIconUrl,
    } = selectedToToken
    await dispatch(setQuotesStatus(''))
    history.push(LOADING_QUOTES_ROUTE)
    await dispatch(setBackgoundSwapRouteState('loading'))
    dispatch(setFetchingQuotes(true))

    let destinationTokenAddedForSwap = false
    if (toTokenSymbol !== 'ETH' && !contractExchangeRates[toTokenAddress]) {
      destinationTokenAddedForSwap = true
      await dispatch(addToken(toTokenAddress, toTokenSymbol, toTokenDecimals, toTokenIconUrl))
    }
    if (fromTokenSymbol !== 'ETH' && !contractExchangeRates[fromTokenAddress] && fromTokenBalance && (new BigNumber(fromTokenBalance, 16)).gt(0)) {
      dispatch(addToken(fromTokenAddress, fromTokenSymbol, fromTokenDecimals, fromTokenIconUrl))
    }

    const sourceTokenInfo = swapsTokens?.find(({ address }) => address === fromTokenAddress) || selectedFromToken
    const destinationTokenInfo = swapsTokens?.find(({ address }) => address === toTokenAddress) || selectedToToken

    dispatch(setSwapFromToken(selectedFromToken))
    let newSwapsError = null
    let newQuotes
    let revisedValue
    if (maxMode && sourceTokenInfo.symbol === 'ETH') {
      const totalGasLimitForCalculation = (new BigNumber(800000, 10)).plus(100000, 10).toString(16)
      const gasTotalInWeiHex = calcGasTotal(totalGasLimitForCalculation, usedGasPrice)
      revisedValue = (new BigNumber(ethBalance, 16)).minus(gasTotalInWeiHex, 16).div('1000000000000000000').toString(10)
    }

    try {
      const fetchStartTime = Date.now()
      dispatch(setSwapQuotesFetchStartTime(fetchStartTime))
      const fetchedQuotes = await dispatch(fetchAndSetQuotes({
        sourceTokenInfo,
        destinationTokenInfo,
        slippage: maxSlippage,
        sourceToken: fromTokenAddress,
        destinationToken: toTokenAddress,
        value: revisedValue || inputValue,
        fromAddress: selectedAccountAddress,
        sourceSymbol: fromTokenSymbol,
        sourceDecimals: fromTokenDecimals,
        networkId,
        isCustomNetwork,
        destinationTokenAddedForSwap,
        balanceError,
      }))
      if (fetchedQuotes?.length === 0) {
        newSwapsError = QUOTES_NOT_AVAILABLE_ERROR
      }
    } catch (e) {
      console.log('e', e)
      newSwapsError = ERROR_FETCHING_QUOTES
    }

    if (newSwapsError) {
      dispatch(setSwapsErrorKey(newSwapsError))
    } else {
      const bestQuote = fetchedQuotes.find((quote) => quote.isBestQuote)
      dispatch(setInitialGasEstimate(bestQuote.aggregator, bestQuote.maxGas))
    }
    dispatch(setFetchingQuotes(false))

  }

  if (isBuildQuoteRoute || (isSwapsErrorRoute && swapsErrorKey === QUOTES_EXPIRED_ERROR)) {
    return fetchQuotesAndSetQuoteState
  }
  if (isSwapsErrorRoute) {
    return retry
  }
  if (isViewQuoteRoute && (!balanceError || (maxMode && selectedFromToken?.symbol === 'ETH'))) {
    return signAndSendTransactions
  }
  if ((isViewQuoteRoute && balanceError) || isAwaitingSwapRoute) {
    return selectedToToken.symbol === 'ETH' ? goHome : goToToken
  }
  if (isLoadingQuoteRoute) {
    return async () => {
      quotesRequestCancelledEvent()
      await dispatch(setBackgoundSwapRouteState(''))
      dispatch(setQuotes([]))
      history.push(BUILD_QUOTE_ROUTE)
    }
  }
  return null
}

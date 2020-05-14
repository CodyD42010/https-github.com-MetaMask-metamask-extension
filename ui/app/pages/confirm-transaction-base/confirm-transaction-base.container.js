import { connect } from 'react-redux'
import { compose } from 'recompose'
import { withRouter } from 'react-router-dom'
import { isValidContractAddress } from 'cfx-util'
import ConfirmTransactionBase from './confirm-transaction-base.component'
import { clearConfirmTransaction } from '../../ducks/confirm-transaction/confirm-transaction.duck'

import {
  updateCustomNonce,
  cancelTx,
  cancelTxs,
  updateAndApproveTx,
  showModal,
  setMetaMetricsSendCount,
  updateTransaction,
  getNextNonce,
  tryReverseResolveAddress,
} from '../../store/actions'
import {
  INSUFFICIENT_FUNDS_ERROR_KEY,
  GAS_LIMIT_TOO_LOW_ERROR_KEY,
} from '../../helpers/constants/error-keys'
import { getHexGasAndCollateralTotal } from '../../helpers/utils/confirm-tx.util'
import {
  isBalanceSufficient,
  calcGasTotal,
} from '../send/send.utils'
import { conversionGreaterThan } from '../../helpers/utils/conversion-util'
import { MIN_GAS_LIMIT_DEC } from '../send/send.constants'
import {
  checksumAddress,
  addressSlicer,
  valuesFor,
} from '../../helpers/utils/util'
import {
  getMetaMaskAccounts,
  getCustomNonceValue,
  getUseNonceField,
  getAdvancedInlineGasShown,
  preferencesSelector,
  getIsMainnet,
  getKnownMethodData,
} from '../../selectors/selectors'
import { transactionFeeSelector } from '../../selectors/confirm-transaction'

let customNonceValue = ''
const customNonceMerge = (txData) =>
  (customNonceValue
    ? {
      ...txData,
      customNonceValue,
    }
    : txData)

const mapStateToProps = (state, ownProps) => {
  const {
    toAddress: propsToAddress,
    customTxParamsData,
    match: { params = {} },
  } = ownProps
  const { id: paramsTransactionId } = params
  const { showFiatInTestnets } = preferencesSelector(state)
  const isMainnet = getIsMainnet(state)
  const trustedTokenMap = state.metamask.trustedTokenMap
  const casedContractMap = Object.keys(trustedTokenMap).reduce((acc, base) => {
    return {
      ...acc,
      [base.toLowerCase()]: trustedTokenMap[base],
    }
  }, {})

  const { confirmTransaction, metamask } = state
  const {
    ensResolutionsByAddress,
    conversionRate,
    identities,
    addressBook,
    assetImages,
    network,
    unapprovedTxs,
    metaMetricsSendCount,
    nextNonce,
  } = metamask
  const { tokenData, txData, tokenProps, nonce } = confirmTransaction
  const {
    txParams = {},
    lastGasPrice,
    id: transactionId,
    transactionCategory,
    willUserPayTxFee,
  } = txData
  const transaction =
    Object.values(unapprovedTxs).find(
      ({ id }) => id === (transactionId || Number(paramsTransactionId))
    ) || {}
  const {
    from: fromAddress,
    to: txParamsToAddress,
    gasPrice,
    storageLimit,
    gas: gasLimit,
    value: amount,
    data,
  } = (transaction && transaction.txParams) || txParams
  const accounts = getMetaMaskAccounts(state)
  const assetImage = assetImages[txParamsToAddress]

  const { balance } = accounts[fromAddress]
  const { name: fromName } = identities[fromAddress]
  const toAddress = propsToAddress || txParamsToAddress
  const toName = identities[toAddress]
    ? identities[toAddress].name
    : casedContractMap[toAddress]
      ? casedContractMap[toAddress].name
      : addressSlicer(checksumAddress(toAddress))

  const checksummedAddress = checksumAddress(toAddress)
  const addressBookObject = addressBook[checksummedAddress]
  const toEns = ensResolutionsByAddress[checksummedAddress] || ''
  const toNickname = addressBookObject ? addressBookObject.name : ''
  const isTxReprice = Boolean(lastGasPrice)
  const transactionStatus = transaction ? transaction.status : ''

  const {
    hexTransactionAmount,
    hexTransactionFee,
    hexTransactionTotal,
    hexSponsoredTransactionFee,
    hexSponsoredTransactionCollateral,
  } = transactionFeeSelector(state, transaction)

  if (transaction && transaction.simulationFails) {
    txData.simulationFails = transaction.simulationFails
  }

  const currentNetworkUnapprovedTxs = Object.keys(unapprovedTxs)
    .filter((key) => unapprovedTxs[key].metamaskNetworkId === network)
    .reduce((acc, key) => ({ ...acc, [key]: unapprovedTxs[key] }), {})
  const unapprovedTxCount = valuesFor(currentNetworkUnapprovedTxs).length

  const insufficientBalance = !isBalanceSufficient({
    amount,
    gasTotal: calcGasTotal(
      willUserPayTxFee ? gasLimit : '0',
      willUserPayTxFee ? gasPrice : '0',
    ),
    balance,
    conversionRate,
  })

  const methodData = getKnownMethodData(state, data) || {}

  let fullTxData = { ...txData, ...transaction }
  if (customTxParamsData) {
    fullTxData = {
      ...fullTxData,
      txParams: {
        ...fullTxData.txParams,
        data: customTxParamsData,
      },
    }
  }

  const isSimpleTx =
    fullTxData.simpleSend ||
    !(fullTxData.txParams.data || isValidContractAddress(toAddress))

  return {
    balance,
    fromAddress,
    fromName,
    toAddress,
    toEns,
    toName,
    toNickname,
    hexTransactionAmount,
    hexTransactionFee,
    hexTransactionTotal,
    txData: fullTxData,
    tokenData,
    methodData,
    tokenProps,
    isTxReprice,
    isSimpleTx,
    conversionRate,
    transactionStatus,
    nonce,
    assetImage,
    unapprovedTxs,
    unapprovedTxCount,
    currentNetworkUnapprovedTxs,
    customGasAndCollateral: {
      storageLimit,
      gasLimit,
      gasPrice,
    },
    advancedInlineGasShown: getAdvancedInlineGasShown(state),
    useNonceField: getUseNonceField(state),
    customNonceValue: getCustomNonceValue(state),
    insufficientBalance,
    hexSponsoredTransactionFee,
    hexSponsoredTransactionCollateral,
    hideSubtitle: !isMainnet && !showFiatInTestnets,
    hideFiatConversion: !isMainnet && !showFiatInTestnets,
    metaMetricsSendCount,
    transactionCategory,
    nextNonce,
  }
}

export const mapDispatchToProps = (dispatch) => {
  return {
    tryReverseResolveAddress: (address) => {
      return dispatch(tryReverseResolveAddress(address))
    },
    updateCustomNonce: (value) => {
      customNonceValue = value
      dispatch(updateCustomNonce(value))
    },
    clearConfirmTransaction: () => dispatch(clearConfirmTransaction()),
    showTransactionConfirmedModal: ({ onSubmit }) => {
      return dispatch(showModal({ name: 'TRANSACTION_CONFIRMED', onSubmit }))
    },
    showCustomizeStorageModal: ({ txData, onSubmit, validate }) => {
      return dispatch(
        showModal({ name: 'CUSTOMIZE_STORAGE', txData, onSubmit, validate })
      )
    },
    showCustomizeGasModal: ({ txData, onSubmit, validate }) => {
      return dispatch(
        showModal({ name: 'CUSTOMIZE_GAS', txData, onSubmit, validate })
      )
    },
    updateGasAndCollateralAndCalculte: (updatedTx) => {
      return dispatch(updateTransaction(updatedTx))
    },
    showRejectTransactionsConfirmationModal: ({
      onSubmit,
      unapprovedTxCount,
    }) => {
      return dispatch(
        showModal({ name: 'REJECT_TRANSACTIONS', onSubmit, unapprovedTxCount })
      )
    },
    cancelTransaction: ({ id }) => dispatch(cancelTx({ id })),
    cancelAllTransactions: (txList) => dispatch(cancelTxs(txList)),
    sendTransaction: (txData) =>
      dispatch(updateAndApproveTx(customNonceMerge(txData))),
    setMetaMetricsSendCount: (val) => dispatch(setMetaMetricsSendCount(val)),
    getNextNonce: () => dispatch(getNextNonce()),
  }
}

const getValidateEditGasAndCollateral = ({
  balance,
  conversionRate,
  txData,
}) => {
  const { txParams: { value: amount } = {} } = txData

  return ({ gasLimit, gasPrice, storageLimit }) => {
    const gasAndCollateralTotal = getHexGasAndCollateralTotal({
      gasLimit,
      gasPrice,
      storageLimit,
    })
    const hasSufficientBalance = isBalanceSufficient({
      amount,
      gasAndCollateralTotal,
      balance,
      conversionRate,
    })

    if (!hasSufficientBalance) {
      return {
        valid: false,
        errorKey: INSUFFICIENT_FUNDS_ERROR_KEY,
      }
    }

    const gasLimitTooLow =
      gasLimit &&
      conversionGreaterThan(
        {
          value: MIN_GAS_LIMIT_DEC,
          fromNumericBase: 'dec',
          conversionRate,
        },
        {
          value: gasLimit,
          fromNumericBase: 'hex',
        }
      )

    if (gasLimitTooLow) {
      return {
        valid: false,
        errorKey: GAS_LIMIT_TOO_LOW_ERROR_KEY,
      }
    }

    return {
      valid: true,
    }
  }
}

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { balance, conversionRate, txData, unapprovedTxs } = stateProps
  const {
    cancelAllTransactions: dispatchCancelAllTransactions,
    showCustomizeGasModal: dispatchShowCustomizeGasModal,
    showCustomizeStorageModal: dispatchShowCustomizeStorageModal,
    updateGasAndCollateralAndCalculte: dispatchUpdateGasAndCollateralAndCalculate,
    ...otherDispatchProps
  } = dispatchProps

  const validateEditGasAndCollateral = getValidateEditGasAndCollateral({
    balance,
    conversionRate,
    txData,
  })

  return {
    ...stateProps,
    ...otherDispatchProps,
    ...ownProps,
    showCustomizeGasModal: () =>
      dispatchShowCustomizeGasModal({
        txData,
        onSubmit: (customGasAndCollateral) =>
          dispatchUpdateGasAndCollateralAndCalculate(customGasAndCollateral),
        validate: validateEditGasAndCollateral,
      }),
    showCustomizeStorageModal: () =>
      dispatchShowCustomizeStorageModal({
        txData,
        onSubmit: (customGasAndCollateral) =>
          dispatchUpdateGasAndCollateralAndCalculate(customGasAndCollateral),
        validate: validateEditGasAndCollateral,
      }),
    cancelAllTransactions: () =>
      dispatchCancelAllTransactions(valuesFor(unapprovedTxs)),
    updateGasAndCollateralAndCalculte: ({
      gasLimit,
      gasPrice,
      storageLimit,
    }) => {
      const updatedTx = {
        ...txData,
        txParams: {
          ...txData.txParams,
          gas: gasLimit,
          storageLimit,
          gasPrice,
        },
      }
      dispatchUpdateGasAndCollateralAndCalculate(updatedTx)
    },
  }
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps, mergeProps)
)(ConfirmTransactionBase)

import { connect } from 'react-redux'
import { compose } from 'recompose'
import ethUtil from 'ethereumjs-util'
import { multiplyCurrencies } from '../../../conversion-util'
import withModalProps from '../../../higher-order-components/with-modal-props'
import CancelTransaction from './cancel-transaction.component'
import { showModal, createCancelTransaction } from '../../../actions'
import { getHexGasTotal } from '../../../helpers/confirm-transaction/util'

const mapStateToProps = (state, ownProps) => {
  const { metamask } = state
  const { transactionId, originalGasPrice } = ownProps
  const { selectedAddressTxList } = metamask
  const transaction = selectedAddressTxList.find(({ id }) => id === transactionId)
  const transactionStatus = transaction ? transaction.status : ''

  const defaultNewGasPrice = ethUtil.addHexPrefix(
    multiplyCurrencies(originalGasPrice, 1.1, {
      toNumericBase: 'hex',
      multiplicandBase: 16,
      multiplierBase: 10,
    })
  )

  const newGasFee = getHexGasTotal({ gasPrice: defaultNewGasPrice, gasLimit: '0x5208' })

  return {
    transactionId,
    transactionStatus,
    originalGasPrice,
    defaultNewGasPrice,
    newGasFee,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    createCancelTransaction: (txId, customGasPrice) => {
      return dispatch(createCancelTransaction(txId, customGasPrice))
    },
    showTransactionConfirmedModal: () => dispatch(showModal({ name: 'TRANSACTION_CONFIRMED' })),
  }
}

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { transactionId, defaultNewGasPrice, ...restStateProps } = stateProps
  const { createCancelTransaction, ...restDispatchProps } = dispatchProps

  return {
    ...restStateProps,
    ...restDispatchProps,
    ...ownProps,
    createCancelTransaction: () => createCancelTransaction(transactionId, defaultNewGasPrice),
  }
}

export default compose(
  withModalProps,
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
)(CancelTransaction)

import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { compose } from 'recompose'
import TransactionViewBalance from './transaction-view-balance.component'
import { getSelectedToken, getSelectedAddress, getNativeCurrency, getSelectedTokenAssetImage } from '../../selectors'
import { showModal } from '../../actions'

const mapStateToProps = state => {
  const selectedAddress = getSelectedAddress(state)
  const { metamask: { network, accounts } } = state
  const account = accounts[selectedAddress]
  const { balance } = account

  return {
    selectedToken: getSelectedToken(state),
    network,
    balance,
    nativeCurrency: getNativeCurrency(state),
    assetImage: getSelectedTokenAssetImage(state),
  }
}

const mapDispatchToProps = dispatch => {
  return {
    showDepositModal: () => dispatch(showModal({ name: 'DEPOSIT_ETHER' })),
  }
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(TransactionViewBalance)

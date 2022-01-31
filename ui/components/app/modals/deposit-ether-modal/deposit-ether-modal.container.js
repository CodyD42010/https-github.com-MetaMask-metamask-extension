import { connect } from 'react-redux';
import {
  buyEth,
  hideModal,
  showModal,
  hideWarning,
} from '../../../../store/actions';
import {
  getIsTestnet,
  getIsMainnet,
  getCurrentChainId,
  getSelectedAddress,
  getIsBuyableTransakChain,
} from '../../../../selectors/selectors';
import DepositEtherModal from './deposit-ether-modal.component';

function mapStateToProps(state) {
  return {
    chainId: getCurrentChainId(state),
    isTestnet: getIsTestnet(state),
    isMainnet: getIsMainnet(state),
    address: getSelectedAddress(state),
    isBuyableTransakChain: getIsBuyableTransakChain(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    toWyre: (address) => {
      dispatch(buyEth({ service: 'wyre', address }));
    },
    toTransak: (address, chainId) => {
      dispatch(buyEth({ service: 'transak', address, chainId }));
    },
    hideModal: () => {
      dispatch(hideModal());
    },
    hideWarning: () => {
      dispatch(hideWarning());
    },
    showAccountDetailModal: () => {
      dispatch(showModal({ name: 'ACCOUNT_DETAILS' }));
    },
    toFaucet: (chainId) => dispatch(buyEth({ chainId })),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(DepositEtherModal);

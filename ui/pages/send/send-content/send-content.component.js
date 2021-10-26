import React, { Component } from 'react';
import PropTypes from 'prop-types';
import PageContainerContent from '../../../components/ui/page-container/page-container-content.component';
import Dialog from '../../../components/ui/dialog';
import {
  ETH_GAS_PRICE_FETCH_WARNING_KEY,
  GAS_PRICE_FETCH_FAILURE_ERROR_KEY,
  GAS_PRICE_EXCESSIVE_ERROR_KEY,
  UNSENDABLE_ASSET_ERROR_KEY,
  INSUFFICIENT_FUNDS_FOR_GAS_ERROR_KEY,
} from '../../../helpers/constants/error-keys';
import SendAmountRow from './send-amount-row';
import SendHexDataRow from './send-hex-data-row';
import SendAssetRow from './send-asset-row';
import SendGasRow from './send-gas-row';

export default class SendContent extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    isAssetSendable: PropTypes.bool,
    showAddToAddressBookModal: PropTypes.func,
    showHexData: PropTypes.bool,
    contact: PropTypes.object,
    isOwnedAccount: PropTypes.bool,
    warning: PropTypes.string,
    error: PropTypes.string,
    gasIsExcessive: PropTypes.bool.isRequired,
    isEthGasPrice: PropTypes.bool,
    noGasPrice: PropTypes.bool,
    networkOrAccountNotSupports1559: PropTypes.bool,
    getIsBalanceInsufficient: PropTypes.bool,
    location: PropTypes.object,
    passDataToSendPage: PropTypes.func,
  };

  state = {
    dataFromSendAmountRow: {},
  };

  getDataFromSendAmountRow = (value) => {
    this.setState({ dataFromSendAmountRow: value });
  };

  render() {
    const {
      warning,
      error,
      gasIsExcessive,
      isEthGasPrice,
      noGasPrice,
      isAssetSendable,
      networkOrAccountNotSupports1559,
      getIsBalanceInsufficient,
      location
    } = this.props;

    this.props.passDataToSendPage(this.state);

    let gasError;
    if (gasIsExcessive) gasError = GAS_PRICE_EXCESSIVE_ERROR_KEY;
    else if (noGasPrice) gasError = GAS_PRICE_FETCH_FAILURE_ERROR_KEY;
    else if (getIsBalanceInsufficient)
      gasError = INSUFFICIENT_FUNDS_FOR_GAS_ERROR_KEY;

    return (
      <PageContainerContent>
        <div className="send-v2__form">
          {gasError ? this.renderError(gasError) : null}
          {isEthGasPrice
            ? this.renderWarning(ETH_GAS_PRICE_FETCH_WARNING_KEY)
            : null}
          {isAssetSendable === false
            ? this.renderError(UNSENDABLE_ASSET_ERROR_KEY)
            : null}
          {error ? this.renderError(error) : null}
          {warning ? this.renderWarning() : null}
          {this.maybeRenderAddContact()}
          <SendAssetRow />
          <SendAmountRow
            passDataToSendContent={this.getDataFromSendAmountRow}
            location={location}
          />
          {networkOrAccountNotSupports1559 && <SendGasRow />}
          {this.props.showHexData && <SendHexDataRow location={location} />}
        </div>
      </PageContainerContent>
    );
  }

  maybeRenderAddContact() {
    const { t } = this.context;
    const {
      isOwnedAccount,
      showAddToAddressBookModal,
      contact = {},
    } = this.props;

    if (isOwnedAccount || contact.name) {
      return null;
    }

    return (
      <Dialog
        type="message"
        className="send__dialog"
        onClick={showAddToAddressBookModal}
      >
        {t('newAccountDetectedDialogMessage')}
      </Dialog>
    );
  }

  renderWarning(gasWarning = '') {
    const { t } = this.context;
    const { warning } = this.props;
    return (
      <Dialog type="warning" className="send__error-dialog">
        {gasWarning === '' ? t(warning) : t(gasWarning)}
      </Dialog>
    );
  }

  renderError(error) {
    const { t } = this.context;
    return (
      <Dialog type="error" className="send__error-dialog">
        {t(error)}
      </Dialog>
    );
  }
}

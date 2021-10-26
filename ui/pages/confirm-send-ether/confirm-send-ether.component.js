import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ConfirmTransactionBase from '../confirm-transaction-base';
import { SEND_ROUTE } from '../../helpers/constants/routes';

export default class ConfirmSendEther extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    editTransaction: PropTypes.func,
    history: PropTypes.object,
    txParams: PropTypes.object,
  };

  state = {
    currencyPreferenceObject: {},
  };

  handleEdit({ txData }) {
    const { editTransaction, history } = this.props;
    editTransaction(txData).then(() => {
      history.push({
        pathname: SEND_ROUTE,
        state: {
          hexData: txData.txParams.data,
          currencyObject: this.state.currencyPreferenceObject,
        },
      });
    });
  }

  shouldHideData() {
    const { txParams = {} } = this.props;
    return !txParams.data;
  }

  render() {
    const hideData = this.shouldHideData();

    if (this.props.location.state && this.props.location.state.currencyData) {
      this.state.currencyPreferenceObject = this.props.location.state.currencyData.currencyPreferenceData.dataFromSendAmountRow.dataFromCurrency.dataFromCurrency;
    }

    return (
      <ConfirmTransactionBase
        actionKey="confirm"
        hideData={hideData}
        onEdit={(confirmTransactionData) =>
          this.handleEdit(confirmTransactionData)
        }
      />
    );
  }
}

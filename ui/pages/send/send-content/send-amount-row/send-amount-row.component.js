import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SendRowWrapper from '../send-row-wrapper';
import UserPreferencedCurrencyInput from '../../../../components/app/user-preferenced-currency-input';
import UserPreferencedTokenInput from '../../../../components/app/user-preferenced-token-input';
import { ASSET_TYPES } from '../../../../ducks/send';
import { MAX_DECIMAL } from '../../../../../shared/constants/decimal';
import AmountMaxButton from './amount-max-button';

export default class SendAmountRow extends Component {
  static propTypes = {
    amount: PropTypes.string,
    inError: PropTypes.bool,
    asset: PropTypes.object,
    updateSendAmount: PropTypes.func,
  };

  static contextTypes = {
    t: PropTypes.func,
  };

  handleChange = (newAmount) => {
    this.props.updateSendAmount(newAmount);
  };

  renderInput() {
    const { amount, inError, asset } = this.props;

    return asset.type === ASSET_TYPES.TOKEN ? (
      <UserPreferencedTokenInput
        error={inError}
        onChange={this.handleChange}
        token={asset.details}
        value={amount}
        primaryNumberOfDecimals={asset.decimals}
      />
    ) : (
      <UserPreferencedCurrencyInput
        error={inError}
        onChange={this.handleChange}
        hexValue={amount}
        primaryNumberOfDecimals={MAX_DECIMAL}
      />
    );
  }

  render() {
    const { inError, asset } = this.props;

    if (asset.type === ASSET_TYPES.COLLECTIBLE) {
      return null;
    }

    return (
      <SendRowWrapper
        label={`${this.context.t('amount')}:`}
        showError={inError}
        errorType="amount"
      >
        <AmountMaxButton inError={inError} />
        {this.renderInput()}
      </SendRowWrapper>
    );
  }
}

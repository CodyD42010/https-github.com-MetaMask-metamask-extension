import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SendRowWrapper from '../send-row-wrapper';
import GasPriceButtonGroup from '../../../../components/app/gas-customization/gas-price-button-group';
import AdvancedGasInputs from '../../../../components/app/gas-customization/advanced-gas-inputs';
import GasFeeDisplay from './gas-fee-display/gas-fee-display.component';

export default class SendGasRow extends Component {
  static propTypes = {
    balance: PropTypes.string,
    gasFeeError: PropTypes.bool,
    gasLoadingError: PropTypes.bool,
    gasTotal: PropTypes.string,
    maxModeOn: PropTypes.bool,
    showCustomizeGasModal: PropTypes.func,
    sendToken: PropTypes.object,
    setAmountToMax: PropTypes.func,
    setGasPrice: PropTypes.func,
    setGasLimit: PropTypes.func,
    tokenBalance: PropTypes.string,
    gasPriceButtonGroupProps: PropTypes.object,
    gasButtonGroupShown: PropTypes.bool,
    advancedInlineGasShown: PropTypes.bool,
    resetGasButtons: PropTypes.func,
    gasPrice: PropTypes.string,
    gasLimit: PropTypes.string,
    insufficientBalance: PropTypes.bool,
    isMainnet: PropTypes.bool,
    isEthGasPrice: PropTypes.bool,
    noGasPrice: PropTypes.bool,
  };

  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  renderAdvancedOptionsButton() {
    const { trackEvent } = this.context;
    const {
      showCustomizeGasModal,
      isMainnet,
      isEthGasPrice,
      noGasPrice,
    } = this.props;
    // Tests should behave in same way as mainnet, but are using Localhost
    if (!isMainnet && !process.env.IN_TEST) {
      return null;
    }
    if (isEthGasPrice || noGasPrice) {
      return null;
    }
    return (
      <div
        className="advanced-gas-options-btn"
        onClick={() => {
          trackEvent({
            category: 'Transactions',
            event: 'Clicked "Advanced Options"',
          });
          showCustomizeGasModal();
        }}
      >
        {this.context.t('advancedOptions')}
      </div>
    );
  }

  setMaxAmount() {
    const {
      balance,
      gasTotal,
      sendToken,
      setAmountToMax,
      tokenBalance,
    } = this.props;

    setAmountToMax({
      balance,
      gasTotal,
      sendToken,
      tokenBalance,
    });
  }

  renderContent() {
    const {
      gasLoadingError,
      gasTotal,
      showCustomizeGasModal,
      gasPriceButtonGroupProps,
      gasButtonGroupShown,
      advancedInlineGasShown,
      maxModeOn,
      resetGasButtons,
      setGasPrice,
      setGasLimit,
      gasPrice,
      gasLimit,
      insufficientBalance,
      isMainnet,
      isEthGasPrice,
      noGasPrice,
    } = this.props;
    const { trackEvent } = this.context;
    const gasPriceFetchFailure = isEthGasPrice || noGasPrice;

    const gasPriceButtonGroup = (
      <div>
        <GasPriceButtonGroup
          className="gas-price-button-group--small"
          showCheck={false}
          {...gasPriceButtonGroupProps}
          handleGasPriceSelection={async (opts) => {
            trackEvent({
              category: 'Transactions',
              event: 'User Clicked Gas Estimate Button',
              properties: {
                gasEstimateType: opts.gasEstimateType.toLowerCase(),
              },
            });
            await gasPriceButtonGroupProps.handleGasPriceSelection(opts);
            if (maxModeOn) {
              this.setMaxAmount();
            }
          }}
        />
      </div>
    );
    const gasFeeDisplay = (
      <GasFeeDisplay
        gasLoadingError={gasLoadingError}
        gasTotal={gasTotal}
        onReset={() => {
          resetGasButtons();
          if (maxModeOn) {
            this.setMaxAmount();
          }
        }}
        onClick={() => showCustomizeGasModal()}
      />
    );
    const advancedGasInputs = (
      <div>
        <AdvancedGasInputs
          updateCustomGasPrice={(newGasPrice) =>
            setGasPrice({ gasPrice: newGasPrice, gasLimit })
          }
          updateCustomGasLimit={(newGasLimit) =>
            setGasLimit(newGasLimit, gasPrice)
          }
          customGasPrice={gasPrice}
          customGasLimit={gasLimit}
          insufficientBalance={insufficientBalance}
          customPriceIsSafe
          isSpeedUp={false}
        />
      </div>
    );
    // Tests should behave in same way as mainnet, but are using Localhost
    if (
      advancedInlineGasShown ||
      (!isMainnet && !process.env.IN_TEST) ||
      gasPriceFetchFailure
    ) {
      return advancedGasInputs;
    } else if (gasButtonGroupShown) {
      return gasPriceButtonGroup;
    }
    return gasFeeDisplay;
  }

  render() {
    const {
      gasFeeError,
      gasButtonGroupShown,
      advancedInlineGasShown,
    } = this.props;

    return (
      <>
        <SendRowWrapper
          label={`${this.context.t('transactionFee')}:`}
          showError={gasFeeError}
          errorType="gasFee"
        >
          {this.renderContent()}
        </SendRowWrapper>
        {gasButtonGroupShown || advancedInlineGasShown ? (
          <SendRowWrapper>{this.renderAdvancedOptionsButton()}</SendRowWrapper>
        ) : null}
      </>
    );
  }
}

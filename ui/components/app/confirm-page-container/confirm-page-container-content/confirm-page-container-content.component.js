import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Tabs, Tab } from '../../../ui/tabs';
import Button from '../../../ui/button';
import ActionableMessage from '../../../ui/actionable-message/actionable-message';
import { PageContainerFooter } from '../../../ui/page-container';
import ErrorMessage from '../../../ui/error-message';
import { INSUFFICIENT_FUNDS_ERROR_KEY } from '../../../../helpers/constants/error-keys';
import Typography from '../../../ui/typography';
import { TypographyVariant } from '../../../../helpers/constants/design-system';

import { isSuspiciousResponse } from '../../../../../shared/modules/security-provider.utils';
import SecurityProviderBannerMessage from '../../security-provider-banner-message/security-provider-banner-message';

import { ConfirmPageContainerSummary, ConfirmPageContainerWarning } from '.';

export default class ConfirmPageContainerContent extends Component {
  static contextTypes = {
    t: PropTypes.func.isRequired,
    ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
    trackEvent: PropTypes.func,
    ///: END:ONLY_INCLUDE_IN
  };

  static propTypes = {
    action: PropTypes.string,
    dataComponent: PropTypes.node,
    dataHexComponent: PropTypes.node,
    detailsComponent: PropTypes.node,
    ///: BEGIN:ONLY_INCLUDE_IN(snaps)
    insightComponent: PropTypes.node,
    ///: END:ONLY_INCLUDE_IN
    errorKey: PropTypes.string,
    errorMessage: PropTypes.string,
    tokenAddress: PropTypes.string,
    nonce: PropTypes.string,
    subtitleComponent: PropTypes.node,
    image: PropTypes.string,
    titleComponent: PropTypes.node,
    warning: PropTypes.string,
    origin: PropTypes.string.isRequired,
    ethGasPriceWarning: PropTypes.string,
    // Footer
    onCancelAll: PropTypes.func,
    onCancel: PropTypes.func,
    cancelText: PropTypes.string,
    onSubmit: PropTypes.func,
    submitText: PropTypes.string,
    disabled: PropTypes.bool,
    unapprovedTxCount: PropTypes.number,
    rejectNText: PropTypes.string,
    supportsEIP1559: PropTypes.bool,
    hasTopBorder: PropTypes.bool,
    nativeCurrency: PropTypes.string,
    networkName: PropTypes.string,
    toAddress: PropTypes.string,
    transactionType: PropTypes.string,
    isBuyableChain: PropTypes.bool,
    openBuyCryptoInPdapp: PropTypes.func,
    txData: PropTypes.object,
    ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
    noteComponent: PropTypes.node,
    ///: END:ONLY_INCLUDE_IN
  };

  renderContent() {
    const { detailsComponent, dataComponent } = this.props;

    ///: BEGIN:ONLY_INCLUDE_IN(snaps)
    const { insightComponent } = this.props;

    if (insightComponent && (detailsComponent || dataComponent)) {
      return this.renderTabs();
    }
    ///: END:ONLY_INCLUDE_IN

    ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
    const { noteComponent } = this.props;

    if (noteComponent) {
      return this.renderTabs();
    }
    ///: END:ONLY_INCLUDE_IN

    if (detailsComponent && dataComponent) {
      return this.renderTabs();
    }

    return (
      detailsComponent ||
      ///: BEGIN:ONLY_INCLUDE_IN(snaps)
      insightComponent ||
      ///: END:ONLY_INCLUDE_IN
      dataComponent
    );
  }

  renderTabs() {
    const { t } = this.context;
    const {
      detailsComponent,
      dataComponent,
      dataHexComponent,
      ///: BEGIN:ONLY_INCLUDE_IN(snaps)
      insightComponent,
      ///: END:ONLY_INCLUDE_IN
      ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
      noteComponent,
      ///: END:ONLY_INCLUDE_IN
    } = this.props;

    return (
      <Tabs>
        <Tab
          className="confirm-page-container-content__tab"
          name={t('details')}
          tabKey="details"
        >
          {detailsComponent}
        </Tab>
        {
          ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
          noteComponent && (
            <Tab
              className="confirm-page-container-content__tab"
              name={t('note')}
              pillText={t('new')}
              onClick={() => {
                this.context.trackEvent({
                  category: 'Note to trader',
                  event: 'Clicked on Notes tab on a transaction window',
                });
              }}
            >
              {noteComponent}
            </Tab>
          )
          ///: END:ONLY_INCLUDE_IN
        }
        {dataComponent && (
          <Tab
            className="confirm-page-container-content__tab"
            name={t('data')}
            tabKey="data"
          >
            {dataComponent}
          </Tab>
        )}
        {dataHexComponent && (
          <Tab
            className="confirm-page-container-content__tab"
            name={t('dataHex')}
            tabKey="dataHex"
          >
            {dataHexComponent}
          </Tab>
        )}

        {
          ///: BEGIN:ONLY_INCLUDE_IN(snaps)
          insightComponent
          ///: END:ONLY_INCLUDE_IN
        }
      </Tabs>
    );
  }

  render() {
    const {
      action,
      errorKey,
      errorMessage,
      image,
      titleComponent,
      subtitleComponent,
      tokenAddress,
      nonce,
      detailsComponent,
      dataComponent,
      warning,
      onCancelAll,
      onCancel,
      cancelText,
      onSubmit,
      submitText,
      disabled,
      unapprovedTxCount,
      rejectNText,
      origin,
      ethGasPriceWarning,
      supportsEIP1559,
      hasTopBorder,
      nativeCurrency,
      networkName,
      toAddress,
      transactionType,
      isBuyableChain,
      openBuyCryptoInPdapp,
      txData,
    } = this.props;

    const { t } = this.context;

    const showInsuffienctFundsError =
      (errorKey || errorMessage) && errorKey === INSUFFICIENT_FUNDS_ERROR_KEY;

    return (
      <div
        className={classnames('confirm-page-container-content', {
          'confirm-page-container-content--with-top-border': hasTopBorder,
        })}
      >
        {warning ? <ConfirmPageContainerWarning warning={warning} /> : null}
        {ethGasPriceWarning && (
          <ConfirmPageContainerWarning warning={ethGasPriceWarning} />
        )}
        {isSuspiciousResponse(txData?.securityProviderResponse) && (
          <SecurityProviderBannerMessage
            securityProviderResponse={txData.securityProviderResponse}
          />
        )}
        <ConfirmPageContainerSummary
          className={classnames({
            'confirm-page-container-summary--border':
              !detailsComponent || !dataComponent,
          })}
          action={action}
          image={image}
          titleComponent={titleComponent}
          subtitleComponent={subtitleComponent}
          tokenAddress={tokenAddress}
          nonce={nonce}
          origin={origin}
          toAddress={toAddress}
          transactionType={transactionType}
        />
        {this.renderContent()}
        {!supportsEIP1559 &&
          !showInsuffienctFundsError &&
          (errorKey || errorMessage) && (
            <div className="confirm-page-container-content__error-container">
              <ErrorMessage errorMessage={errorMessage} errorKey={errorKey} />
            </div>
          )}
        {showInsuffienctFundsError && (
          <div className="confirm-page-container-content__error-container">
            <ActionableMessage
              className="actionable-message--warning"
              message={
                isBuyableChain ? (
                  <Typography variant={TypographyVariant.H7} align="left">
                    {t('insufficientCurrencyBuyOrDeposit', [
                      nativeCurrency,
                      networkName,
                      ///: BEGIN:ONLY_INCLUDE_IN(build-main,build-beta,build-flask)
                      <Button
                        type="inline"
                        className="confirm-page-container-content__link"
                        onClick={openBuyCryptoInPdapp}
                        key={`${nativeCurrency}-buy-button`}
                      >
                        {t('buyAsset', [nativeCurrency])}
                      </Button>,
                      ///: END:ONLY_INCLUDE_IN
                    ])}
                  </Typography>
                ) : (
                  <Typography variant={TypographyVariant.H7} align="left">
                    {t('insufficientCurrencyDeposit', [
                      nativeCurrency,
                      networkName,
                    ])}
                  </Typography>
                )
              }
              useIcon
              iconFillColor="var(--color-error-default)"
              type="danger"
            />
          </div>
        )}
        <PageContainerFooter
          onCancel={onCancel}
          cancelText={cancelText}
          onSubmit={onSubmit}
          submitText={submitText}
          disabled={disabled}
        >
          {unapprovedTxCount > 1 ? (
            <a onClick={onCancelAll}>{rejectNText}</a>
          ) : null}
        </PageContainerFooter>
      </div>
    );
  }
}

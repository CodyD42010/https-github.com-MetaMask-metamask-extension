import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Tabs, Tab } from '../../../ui/tabs';
import {
  ///: BEGIN:ONLY_INCLUDE_IN(build-main,build-beta,build-flask)
  Button,
  BUTTON_SIZES,
  BUTTON_VARIANT,
  ///: END:ONLY_INCLUDE_IN
  BannerAlert,
} from '../../../component-library';
import { PageContainerFooter } from '../../../ui/page-container';
import { INSUFFICIENT_FUNDS_ERROR_KEY } from '../../../../helpers/constants/error-keys';
import { Severity } from '../../../../helpers/constants/design-system';

import { isSuspiciousResponse } from '../../../../../shared/modules/security-provider.utils';
///: BEGIN:ONLY_INCLUDE_IN(blockaid)
import BlockaidBannerAlert from '../../security-provider-banner-alert/blockaid-banner-alert/blockaid-banner-alert';
///: END:ONLY_INCLUDE_IN
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
    ///: BEGIN:ONLY_INCLUDE_IN(build-main,build-beta,build-flask)
    openBuyCryptoInPdapp: PropTypes.func,
    ///: END:ONLY_INCLUDE_IN
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
              data-testid="note-tab"
              className="confirm-page-container-content__tab"
              name={t('note')}
              tabKey="note"
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
      ///: BEGIN:ONLY_INCLUDE_IN(build-main,build-beta,build-flask)
      openBuyCryptoInPdapp,
      ///: END:ONLY_INCLUDE_IN
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
        {
          ///: BEGIN:ONLY_INCLUDE_IN(blockaid)
          <BlockaidBannerAlert
            securityAlertResponse={txData?.securityAlertResponse}
          />
          ///: END:ONLY_INCLUDE_IN
        }
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
            <BannerAlert
              severity={Severity.Danger}
              description={errorKey ? t(errorKey) : errorMessage}
              marginBottom={4}
              marginLeft={4}
              marginRight={4}
            />
          )}
        {showInsuffienctFundsError && (
          <BannerAlert
            severity={Severity.Danger}
            marginBottom={4}
            marginLeft={4}
            marginRight={4}
            description={
              isBuyableChain
                ? t('insufficientCurrencyBuyOrDeposit', [
                    nativeCurrency,
                    networkName,
                    ///: BEGIN:ONLY_INCLUDE_IN(build-main,build-beta,build-flask)
                    <Button
                      variant={BUTTON_VARIANT.LINK}
                      size={BUTTON_SIZES.INHERIT}
                      onClick={openBuyCryptoInPdapp}
                      key={`${nativeCurrency}-buy-button`}
                    >
                      {t('buyAsset', [nativeCurrency])}
                    </Button>,
                    ///: END:ONLY_INCLUDE_IN
                  ])
                : t('insufficientCurrencyDeposit', [
                    nativeCurrency,
                    networkName,
                  ])
            }
          />
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

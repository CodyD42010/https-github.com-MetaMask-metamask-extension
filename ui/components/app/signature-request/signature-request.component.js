import React, { PureComponent } from 'react';
import { memoize } from 'lodash';
import PropTypes from 'prop-types';
import { ethErrors, serializeError } from 'eth-rpc-errors';
import LedgerInstructionField from '../ledger-instruction-field';
import {
  sanitizeMessage,
  getURLHostName,
  getNetworkNameFromProviderType,
  ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
  shortenAddress,
  ///: END:ONLY_INCLUDE_IN
} from '../../../helpers/utils/util';
import { MetaMetricsEventCategory } from '../../../../shared/constants/metametrics';
import SiteOrigin from '../../ui/site-origin';
import Button from '../../ui/button';
import Typography from '../../ui/typography/typography';
import ContractDetailsModal from '../modals/contract-details-modal/contract-details-modal';
import {
  TypographyVariant,
  FontWeight,
  TextAlign,
  TextColor,
  ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
  IconColor,
  DISPLAY,
  BLOCK_SIZES,
  TextVariant,
  BackgroundColor,
  ///: END:ONLY_INCLUDE_IN
} from '../../../helpers/constants/design-system';
import NetworkAccountBalanceHeader from '../network-account-balance-header';
import { Numeric } from '../../../../shared/modules/Numeric';
import { isSuspiciousResponse } from '../../../../shared/modules/security-provider.utils';
import { EtherDenomination } from '../../../../shared/constants/common';
import ConfirmPageContainerNavigation from '../confirm-page-container/confirm-page-container-navigation';
import SecurityProviderBannerMessage from '../security-provider-banner-message/security-provider-banner-message';
import { formatCurrency } from '../../../helpers/utils/confirm-tx.util';
import { getValueFromWeiHex } from '../../../../shared/modules/conversion.utils';
///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
import { Icon, IconName, Text } from '../../component-library';
import Box from '../../ui/box/box';
///: END:ONLY_INCLUDE_IN

import Footer from './signature-request-footer';
import Message from './signature-request-message';

export default class SignatureRequest extends PureComponent {
  static propTypes = {
    /**
     * The display content of transaction data
     */
    txData: PropTypes.object.isRequired,
    /**
     * The display content of sender account
     */
    fromAccount: PropTypes.shape({
      address: PropTypes.string.isRequired,
      balance: PropTypes.string,
      name: PropTypes.string,
    }).isRequired,
    /**
     * Check if the wallet is ledget wallet or not
     */
    isLedgerWallet: PropTypes.bool,

    /**
     * Whether the hardware wallet requires a connection disables the sign button if true.
     */
    hardwareWalletRequiresConnection: PropTypes.bool.isRequired,
    /**
     * Current network chainId
     */
    chainId: PropTypes.string,
    /**
     * RPC prefs of the current network
     */
    rpcPrefs: PropTypes.object,
    nativeCurrency: PropTypes.string,
    currentCurrency: PropTypes.string.isRequired,
    conversionRate: PropTypes.number,
    providerConfig: PropTypes.object,
    subjectMetadata: PropTypes.object,
    unapprovedMessagesCount: PropTypes.number,
    clearConfirmTransaction: PropTypes.func.isRequired,
    history: PropTypes.object,
    mostRecentOverviewPage: PropTypes.string,
    showRejectTransactionsConfirmationModal: PropTypes.func.isRequired,
    cancelAllApprovals: PropTypes.func.isRequired,
    resolvePendingApproval: PropTypes.func.isRequired,
    rejectPendingApproval: PropTypes.func.isRequired,
    completedTx: PropTypes.func.isRequired,
    ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
    showCustodianDeepLink: PropTypes.func,
    isNotification: PropTypes.bool,
    mmiOnSignCallback: PropTypes.func,
    // Used to show a warning if the signing account is not the selected account
    // Largely relevant for contract wallet custodians
    selectedAccount: PropTypes.object,
    ///: END:ONLY_INCLUDE_IN
  };

  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  state = {
    hasScrolledMessage: false,
    showContractDetails: false,
  };

  ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
  componentDidMount() {
    if (this.props.txData.custodyId) {
      this.props.showCustodianDeepLink({
        custodyId: this.props.txData.custodyId,
        fromAddress: this.props.fromAccount.address,
        closeNotification: this.props.isNotification,
        onDeepLinkFetched: () => undefined,
        onDeepLinkShown: () => {
          this.context.trackEvent({
            category: 'MMI',
            event: 'Show deeplink for signature',
          });
        },
      });
    }
  }
  ///: END:ONLY_INCLUDE_IN

  setMessageRootRef(ref) {
    this.messageRootRef = ref;
  }

  formatWallet(wallet) {
    return `${wallet.slice(0, 8)}...${wallet.slice(
      wallet.length - 8,
      wallet.length,
    )}`;
  }

  memoizedParseMessage = memoize((data) => {
    const { message, domain = {}, primaryType, types } = JSON.parse(data);
    const sanitizedMessage = sanitizeMessage(message, primaryType, types);
    return { sanitizedMessage, domain, primaryType };
  });

  handleCancelAll = () => {
    const {
      clearConfirmTransaction,
      history,
      mostRecentOverviewPage,
      showRejectTransactionsConfirmationModal,
      unapprovedMessagesCount,
      cancelAllApprovals,
    } = this.props;

    showRejectTransactionsConfirmationModal({
      unapprovedTxCount: unapprovedMessagesCount,
      onSubmit: async () => {
        await cancelAllApprovals();
        clearConfirmTransaction();
        history.push(mostRecentOverviewPage);
      },
    });
  };

  render() {
    const {
      providerConfig,
      txData: {
        msgParams: { data, origin, version },
        type,
        id,
      },
      fromAccount: { address, balance, name },
      isLedgerWallet,
      hardwareWalletRequiresConnection,
      chainId,
      rpcPrefs,
      txData,
      subjectMetadata,
      nativeCurrency,
      currentCurrency,
      conversionRate,
      unapprovedMessagesCount,
      resolvePendingApproval,
      rejectPendingApproval,
      completedTx,
    } = this.props;

    const { t, trackEvent } = this.context;
    const {
      sanitizedMessage,
      domain: { verifyingContract },
      primaryType,
    } = this.memoizedParseMessage(data);
    const rejectNText = t('rejectRequestsN', [unapprovedMessagesCount]);
    const networkName = getNetworkNameFromProviderType(providerConfig.type);
    const currentNetwork =
      networkName === ''
        ? providerConfig.nickname || t('unknownNetwork')
        : t(networkName);

    const balanceInBaseAsset = conversionRate
      ? formatCurrency(
          getValueFromWeiHex({
            value: balance,
            fromCurrency: nativeCurrency,
            toCurrency: currentCurrency,
            conversionRate,
            numberOfDecimals: 6,
            toDenomination: EtherDenomination.ETH,
          }),
          currentCurrency,
        )
      : new Numeric(balance, 16, EtherDenomination.WEI)
          .toDenomination(EtherDenomination.ETH)
          .round(6)
          .toBase(10)
          .toString();

    const onSign = async () => {
      await resolvePendingApproval(id);
      completedTx(id);
      ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
      if (this.props.mmiOnSignCallback) {
        await this.props.mmiOnSignCallback(txData);
      }
      ///: END:ONLY_INCLUDE_IN

      trackEvent({
        category: MetaMetricsEventCategory.Transactions,
        event: 'Confirm',
        properties: {
          action: 'Sign Request',
          legacy_event: true,
          type,
          version,
        },
      });
    };

    const onCancel = async () => {
      await rejectPendingApproval(
        id,
        serializeError(ethErrors.provider.userRejectedRequest()),
      );
      trackEvent({
        category: MetaMetricsEventCategory.Transactions,
        event: 'Cancel',
        properties: {
          action: 'Sign Request',
          legacy_event: true,
          type,
          version,
        },
      });
    };

    const messageIsScrollable =
      this.messageRootRef?.scrollHeight > this.messageRootRef?.clientHeight;

    const targetSubjectMetadata = txData.msgParams.origin
      ? subjectMetadata?.[txData.msgParams.origin]
      : null;

    return (
      <div className="signature-request">
        <ConfirmPageContainerNavigation />
        <div
          className="request-signature__account"
          data-testid="request-signature-account"
        >
          <NetworkAccountBalanceHeader
            networkName={currentNetwork}
            accountName={name}
            accountBalance={balanceInBaseAsset}
            tokenName={
              conversionRate ? currentCurrency?.toUpperCase() : nativeCurrency
            }
            accountAddress={address}
          />
        </div>
        <div className="signature-request-content">
          {isSuspiciousResponse(txData?.securityProviderResponse) && (
            <SecurityProviderBannerMessage
              securityProviderResponse={txData.securityProviderResponse}
            />
          )}

          {
            ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
            this.props.selectedAccount.address === address ? null : (
              <Box
                className="request-signature__mismatch-info"
                display={DISPLAY.FLEX}
                width={BLOCK_SIZES.FULL}
                padding={4}
                marginBottom={4}
                backgroundColor={BackgroundColor.primaryMuted}
              >
                <Icon
                  name={IconName.Info}
                  color={IconColor.infoDefault}
                  marginRight={2}
                />
                <Text
                  variant={TextVariant.bodyXs}
                  color={TextColor.textDefault}
                  as="h7"
                >
                  {this.context.t('mismatchAccount', [
                    shortenAddress(this.props.selectedAccount.address),
                    shortenAddress(address),
                  ])}
                </Text>
              </Box>
            )
            ///: END:ONLY_INCLUDE_IN
          }

          <div className="signature-request__origin">
            <SiteOrigin
              siteOrigin={origin}
              iconSrc={targetSubjectMetadata?.iconUrl}
              iconName={getURLHostName(origin) || origin}
              chip
            />
          </div>

          <Typography
            className="signature-request__content__title"
            variant={TypographyVariant.H3}
            fontWeight={FontWeight.Bold}
            boxProps={{
              marginTop: 4,
            }}
          >
            {this.context.t('sigRequest')}
          </Typography>
          <Typography
            className="request-signature__content__subtitle"
            variant={TypographyVariant.H7}
            color={TextColor.textAlternative}
            align={TextAlign.Center}
            margin={12}
            marginTop={3}
          >
            {this.context.t('signatureRequestGuidance')}
          </Typography>
          {verifyingContract ? (
            <div>
              <Button
                type="link"
                onClick={() => this.setState({ showContractDetails: true })}
                className="signature-request-content__verify-contract-details"
                data-testid="verify-contract-details"
              >
                <Typography
                  variant={TypographyVariant.H7}
                  color={TextColor.primaryDefault}
                >
                  {this.context.t('verifyContractDetails')}
                </Typography>
              </Button>
            </div>
          ) : null}
        </div>
        {isLedgerWallet ? (
          <div className="confirm-approve-content__ledger-instruction-wrapper">
            <LedgerInstructionField showDataInstruction />
          </div>
        ) : null}
        <Message
          data={sanitizedMessage}
          onMessageScrolled={() => this.setState({ hasScrolledMessage: true })}
          setMessageRootRef={this.setMessageRootRef.bind(this)}
          messageRootRef={this.messageRootRef}
          messageIsScrollable={messageIsScrollable}
          primaryType={primaryType}
        />
        <Footer
          cancelAction={onCancel}
          signAction={onSign}
          disabled={
            ///: BEGIN:ONLY_INCLUDE_IN(build-mmi)
            Boolean(this.props.txData?.custodyId) ||
            ///: END:ONLY_INCLUDE_IN
            hardwareWalletRequiresConnection ||
            (messageIsScrollable && !this.state.hasScrolledMessage)
          }
        />
        {this.state.showContractDetails && (
          <ContractDetailsModal
            toAddress={verifyingContract}
            chainId={chainId}
            rpcPrefs={rpcPrefs}
            onClose={() => this.setState({ showContractDetails: false })}
            isContractRequestingSignature
          />
        )}
        {unapprovedMessagesCount > 1 ? (
          <Button
            type="link"
            className="signature-request__reject-all-button"
            data-testid="signature-request-reject-all"
            onClick={(e) => {
              e.preventDefault();
              this.handleCancelAll();
            }}
          >
            {rejectNText}
          </Button>
        ) : null}
      </div>
    );
  }
}

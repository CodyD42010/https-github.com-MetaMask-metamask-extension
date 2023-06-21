import React, { useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import PropTypes from 'prop-types';
import BigNumber from 'bignumber.js';
import Box from '../../components/ui/box/box';
import NetworkAccountBalanceHeader from '../../components/app/network-account-balance-header/network-account-balance-header';
import UrlIcon from '../../components/ui/url-icon/url-icon';
import {
  AlignItems,
  BorderStyle,
  Color,
  DISPLAY,
  FLEX_DIRECTION,
  FontWeight,
  JustifyContent,
  TextAlign,
  TextColor,
  TextVariant,
} from '../../helpers/constants/design-system';
import { I18nContext } from '../../contexts/i18n';
import ContractTokenValues from '../../components/ui/contract-token-values/contract-token-values';
import Button from '../../components/ui/button';
import ReviewSpendingCap from '../../components/ui/review-spending-cap/review-spending-cap';
import { PageContainerFooter } from '../../components/ui/page-container';
import ContractDetailsModal from '../../components/app/modals/contract-details-modal/contract-details-modal';
import {
  getNetworkIdentifier,
  transactionFeeSelector,
  getKnownMethodData,
  getRpcPrefsForCurrentProvider,
  getCustomTokenAmount,
  getUnapprovedTxCount,
  getUnapprovedTransactions,
  getUseCurrencyRateCheck,
  getTargetAccountWithSendEtherInfo,
} from '../../selectors';
import { NETWORK_TO_NAME_MAP } from '../../../shared/constants/network';
import {
  cancelTx,
  cancelTxs,
  showModal,
  updateAndApproveTx,
  updateCustomNonce,
} from '../../store/actions';
import { clearConfirmTransaction } from '../../ducks/confirm-transaction/confirm-transaction.duck';
import { getMostRecentOverviewPage } from '../../ducks/history/history';
import ApproveContentCard from '../../components/app/approve-content-card/approve-content-card';
import CustomSpendingCap from '../../components/app/custom-spending-cap/custom-spending-cap';
import Dialog from '../../components/ui/dialog';
import { useGasFeeContext } from '../../contexts/gasFee';
import { getCustomTxParamsData } from '../confirm-approve/confirm-approve.util';
import { setCustomTokenAmount } from '../../ducks/app/app';
import { valuesFor } from '../../helpers/utils/util';
import { calcTokenAmount } from '../../../shared/lib/transactions-controller-utils';
import {
  MAX_TOKEN_ALLOWANCE_AMOUNT,
  NUM_W_OPT_DECIMAL_COMMA_OR_DOT_REGEX,
} from '../../../shared/constants/tokens';
import { isSuspiciousResponse } from '../../../shared/modules/security-provider.utils';
import { ConfirmPageContainerNavigation } from '../../components/app/confirm-page-container';
import { useSimulationFailureWarning } from '../../hooks/useSimulationFailureWarning';
import SimulationErrorMessage from '../../components/ui/simulation-error-message';
import LedgerInstructionField from '../../components/app/ledger-instruction-field/ledger-instruction-field';
import SecurityProviderBannerMessage from '../../components/app/security-provider-banner-message/security-provider-banner-message';
import { Text, Icon, IconName } from '../../components/component-library';

const ALLOWED_HOSTS = ['portfolio.metamask.io'];

export default function TokenAllowance({
  origin,
  siteImage,
  showCustomizeGasModal,
  useNonceField,
  currentCurrency,
  nativeCurrency,
  ethTransactionTotal,
  fiatTransactionTotal,
  hexTransactionTotal,
  hexMinimumTransactionFee,
  txData,
  isMultiLayerFeeNetwork,
  supportsEIP1559,
  userAddress,
  tokenAddress,
  data,
  isSetApproveForAll,
  isApprovalOrRejection,
  decimals,
  dappProposedTokenAmount,
  currentTokenBalance,
  toAddress,
  tokenSymbol,
  fromAddressIsLedger,
}) {
  const t = useContext(I18nContext);
  const dispatch = useDispatch();
  const history = useHistory();
  const mostRecentOverviewPage = useSelector(getMostRecentOverviewPage);

  const { hostname } = new URL(origin);
  const thisOriginIsAllowedToSkipFirstPage = ALLOWED_HOSTS.includes(hostname);

  const [showContractDetails, setShowContractDetails] = useState(false);
  const [inputChangeInProgress, setInputChangeInProgress] = useState(false);
  const [showFullTxDetails, setShowFullTxDetails] = useState(false);
  const [isFirstPage, setIsFirstPage] = useState(
    dappProposedTokenAmount !== '0' && !thisOriginIsAllowedToSkipFirstPage,
  );
  const [errorText, setErrorText] = useState('');
  const [userAcknowledgedGasMissing, setUserAcknowledgedGasMissing] =
    useState(false);

  const renderSimulationFailureWarning = useSimulationFailureWarning(
    userAcknowledgedGasMissing,
  );
  const fromAccount = useSelector((state) =>
    getTargetAccountWithSendEtherInfo(state, userAddress),
  );
  const networkIdentifier = useSelector(getNetworkIdentifier);
  const rpcPrefs = useSelector(getRpcPrefsForCurrentProvider);
  const unapprovedTxCount = useSelector(getUnapprovedTxCount);
  const unapprovedTxs = useSelector(getUnapprovedTransactions);
  const useCurrencyRateCheck = useSelector(getUseCurrencyRateCheck);
  let customTokenAmount = useSelector(getCustomTokenAmount);
  if (thisOriginIsAllowedToSkipFirstPage && dappProposedTokenAmount) {
    customTokenAmount = dappProposedTokenAmount;
  }

  const replaceCommaToDot = (inputValue) => {
    return inputValue.replace(/,/gu, '.');
  };

  let customPermissionAmount = NUM_W_OPT_DECIMAL_COMMA_OR_DOT_REGEX.test(
    customTokenAmount,
  )
    ? replaceCommaToDot(customTokenAmount).toString()
    : '0';

  const maxTokenAmount = calcTokenAmount(MAX_TOKEN_ALLOWANCE_AMOUNT, decimals);
  if (customTokenAmount.length > 1 && Number(customTokenAmount)) {
    const customSpendLimitNumber = new BigNumber(customTokenAmount);
    if (customSpendLimitNumber.greaterThan(maxTokenAmount)) {
      customPermissionAmount = 0;
    }
  }

  const customTxParamsData = customPermissionAmount
    ? getCustomTxParamsData(data, {
        customPermissionAmount,
        decimals,
      })
    : null;

  let fullTxData = { ...txData };

  if (customTxParamsData) {
    fullTxData = {
      ...fullTxData,
      txParams: {
        ...fullTxData.txParams,
        data: customTxParamsData,
      },
    };
  }

  const fee = useSelector((state) => transactionFeeSelector(state, fullTxData));
  const methodData = useSelector((state) => getKnownMethodData(state, data));

  const { balanceError } = useGasFeeContext();

  const disableNextButton =
    isFirstPage && (customTokenAmount === '' || errorText !== '');

  const disableApproveButton = !isFirstPage && balanceError;

  const networkName =
    NETWORK_TO_NAME_MAP[fullTxData.chainId] || networkIdentifier;

  const customNonceValue = '';
  const customNonceMerge = (transactionData) =>
    customNonceValue
      ? {
          ...transactionData,
          customNonceValue,
        }
      : transactionData;

  const handleReject = () => {
    dispatch(updateCustomNonce(''));
    dispatch(setCustomTokenAmount(''));

    dispatch(cancelTx(fullTxData)).then(() => {
      dispatch(clearConfirmTransaction());
      history.push(mostRecentOverviewPage);
    });
  };

  const handleApprove = () => {
    const { name } = methodData;

    if (fee.gasEstimationObject.baseFeePerGas) {
      fullTxData.estimatedBaseFee = fee.gasEstimationObject.baseFeePerGas;
    }

    if (name) {
      fullTxData.contractMethodName = name;
    }

    if (dappProposedTokenAmount) {
      fullTxData.dappProposedTokenAmount = dappProposedTokenAmount;
      fullTxData.originalApprovalAmount = dappProposedTokenAmount;
    }

    if (customTokenAmount) {
      fullTxData.customTokenAmount = customTokenAmount;
      fullTxData.finalApprovalAmount = customTokenAmount;
    } else if (dappProposedTokenAmount !== undefined) {
      fullTxData.finalApprovalAmount = dappProposedTokenAmount;
    }

    if (currentTokenBalance) {
      fullTxData.currentTokenBalance = currentTokenBalance;
    }

    dispatch(updateCustomNonce(''));

    dispatch(updateAndApproveTx(customNonceMerge(fullTxData))).then(() => {
      dispatch(clearConfirmTransaction());
      history.push(mostRecentOverviewPage);
    });
  };

  const handleNextClick = () => {
    setShowFullTxDetails(false);
    setIsFirstPage(false);
  };

  const handleBackClick = () => {
    setShowFullTxDetails(false);
    setIsFirstPage(true);
  };

  const handleCancelAll = () => {
    dispatch(
      showModal({
        name: 'REJECT_TRANSACTIONS',
        unapprovedTxCount,
        onSubmit: async () => {
          await dispatch(cancelTxs(valuesFor(unapprovedTxs)));
          dispatch(clearConfirmTransaction());
          history.push(mostRecentOverviewPage);
        },
      }),
    );
  };

  const isEmpty = customTokenAmount === '';

  const renderContractTokenValues = (
    <Box marginTop={4} key={tokenAddress}>
      <ContractTokenValues
        tokenName={tokenSymbol}
        address={tokenAddress}
        chainId={fullTxData.chainId}
        rpcPrefs={rpcPrefs}
      />
    </Box>
  );

  return (
    <Box className="token-allowance-container page-container">
      <Box>
        <ConfirmPageContainerNavigation />
      </Box>
      {isSuspiciousResponse(txData?.securityProviderResponse) && (
        <SecurityProviderBannerMessage
          securityProviderResponse={txData.securityProviderResponse}
        />
      )}
      <Box
        paddingLeft={4}
        paddingRight={4}
        alignItems={AlignItems.center}
        display={DISPLAY.FLEX}
        flexDirection={FLEX_DIRECTION.ROW}
        justifyContent={JustifyContent.spaceBetween}
      >
        <Box>
          {!isFirstPage && (
            <Button type="inline" onClick={() => handleBackClick()}>
              <Text
                variant={TextVariant.bodySm}
                as="h6"
                color={TextColor.textMuted}
                fontWeight={FontWeight.Bold}
              >
                {'<'} {t('back')}
              </Text>
            </Button>
          )}
        </Box>
        <Box textAlign={TextAlign.End}>
          <Text
            variant={TextVariant.bodySm}
            as="h6"
            color={TextColor.textMuted}
            fontWeight={FontWeight.Bold}
          >
            {isFirstPage ? 1 : 2} {t('ofTextNofM')} 2
          </Text>
        </Box>
      </Box>
      <NetworkAccountBalanceHeader
        networkName={networkName}
        accountName={fromAccount.name}
        accountBalance={currentTokenBalance}
        tokenName={tokenSymbol}
        accountAddress={userAddress}
        chainId={fullTxData.chainId}
      />
      <Box
        display={DISPLAY.FLEX}
        flexDirection={FLEX_DIRECTION.ROW}
        justifyContent={JustifyContent.center}
      >
        <Box
          display={DISPLAY.FLEX}
          alignItems={AlignItems.center}
          marginTop={6}
          marginRight={12}
          marginBottom={8}
          marginLeft={12}
          paddingTop={2}
          paddingRight={4}
          paddingBottom={2}
          paddingLeft={2}
          borderColor={Color.borderMuted}
          borderStyle={BorderStyle.solid}
          borderWidth={1}
          className="token-allowance-container__icon-display-content"
        >
          <UrlIcon
            className="token-allowance-container__icon-display-content__siteimage-identicon"
            fallbackClassName="token-allowance-container__icon-display-content__siteimage-identicon"
            name={origin}
            url={siteImage}
          />
          <Text
            variant={TextVariant.bodySm}
            as="h6"
            color={TextColor.textAlternative}
            marginLeft={1}
          >
            {origin}
          </Text>
        </Box>
      </Box>
      <Box marginLeft={4} marginRight={4}>
        <Text variant={TextVariant.headingMd} align={TextAlign.Center}>
          {isFirstPage ? (
            t('setSpendingCap', [renderContractTokenValues])
          ) : (
            <Box>
              {customTokenAmount === '0' || isEmpty ? (
                t('revokeSpendingCap', [renderContractTokenValues])
              ) : (
                <Box>
                  {t('reviewSpendingCap')}
                  {renderContractTokenValues}
                </Box>
              )}
            </Box>
          )}
        </Text>
      </Box>
      <Box
        marginTop={1}
        display={DISPLAY.FLEX}
        flexDirection={FLEX_DIRECTION.ROW}
        justifyContent={JustifyContent.center}
      >
        <Button
          type="link"
          onClick={() => setShowContractDetails(true)}
          className="token-allowance-container__verify-link"
        >
          <Text
            variant={TextVariant.bodySm}
            as="h6"
            color={Color.primaryDefault}
          >
            {t('verifyContractDetails')}
          </Text>
        </Button>
      </Box>
      <Box margin={[4, 4, 3, 4]}>
        {isFirstPage ? (
          <CustomSpendingCap
            txParams={txData?.txParams}
            tokenName={tokenSymbol}
            currentTokenBalance={currentTokenBalance}
            dappProposedValue={dappProposedTokenAmount}
            siteOrigin={origin}
            passTheErrorText={(value) => setErrorText(value)}
            decimals={decimals}
            setInputChangeInProgress={setInputChangeInProgress}
          />
        ) : (
          <ReviewSpendingCap
            tokenName={tokenSymbol}
            currentTokenBalance={currentTokenBalance}
            tokenValue={
              isNaN(parseFloat(customTokenAmount))
                ? dappProposedTokenAmount
                : replaceCommaToDot(customTokenAmount)
            }
            onEdit={() => handleBackClick()}
          />
        )}
      </Box>
      {!isFirstPage && balanceError && (
        <Dialog type="error" className="send__error-dialog">
          {t('insufficientFundsForGas')}
        </Dialog>
      )}
      {!isFirstPage && (
        <Box className="token-allowance-container__card-wrapper">
          {renderSimulationFailureWarning && (
            <Box
              paddingTop={0}
              paddingRight={4}
              paddingBottom={4}
              paddingLeft={4}
            >
              <SimulationErrorMessage
                userAcknowledgedGasMissing={userAcknowledgedGasMissing}
                setUserAcknowledgedGasMissing={() =>
                  setUserAcknowledgedGasMissing(true)
                }
              />
            </Box>
          )}
          <ApproveContentCard
            symbol={<Icon name={IconName.Tag} />}
            title={t('transactionFee')}
            showEdit
            showAdvanceGasFeeOptions
            onEditClick={showCustomizeGasModal}
            renderTransactionDetailsContent
            noBorder={useNonceField || !showFullTxDetails}
            supportsEIP1559={supportsEIP1559}
            isMultiLayerFeeNetwork={isMultiLayerFeeNetwork}
            ethTransactionTotal={ethTransactionTotal}
            nativeCurrency={nativeCurrency}
            fullTxData={fullTxData}
            userAcknowledgedGasMissing={userAcknowledgedGasMissing}
            renderSimulationFailureWarning={renderSimulationFailureWarning}
            hexTransactionTotal={hexTransactionTotal}
            hexMinimumTransactionFee={hexMinimumTransactionFee}
            fiatTransactionTotal={fiatTransactionTotal}
            currentCurrency={currentCurrency}
            useCurrencyRateCheck={useCurrencyRateCheck}
          />
        </Box>
      )}
      <Box
        display={DISPLAY.FLEX}
        flexDirection={FLEX_DIRECTION.ROW}
        justifyContent={JustifyContent.center}
      >
        <Button
          type="link"
          onClick={() => setShowFullTxDetails(!showFullTxDetails)}
          className="token-allowance-container__view-details"
        >
          <Text
            variant={TextVariant.bodySm}
            as="h6"
            color={TextColor.primaryDefault}
            marginRight={1}
          >
            {t('viewDetails')}
          </Text>
          {showFullTxDetails ? (
            <i className="fa fa-sm fa-angle-up" />
          ) : (
            <i className="fa fa-sm fa-angle-down" />
          )}
        </Button>
      </Box>
      {showFullTxDetails ? (
        <Box
          display={DISPLAY.FLEX}
          flexDirection={FLEX_DIRECTION.COLUMN}
          alignItems={AlignItems.center}
          className="token-allowance-container__full-tx-content"
        >
          <Box className="token-allowance-container__data">
            <ApproveContentCard
              symbol={<i className="fa fa-file" />}
              title={t('data')}
              renderDataContent
              noBorder
              supportsEIP1559={supportsEIP1559}
              isSetApproveForAll={isSetApproveForAll}
              fullTxData={fullTxData}
              userAcknowledgedGasMissing={userAcknowledgedGasMissing}
              renderSimulationFailureWarning={renderSimulationFailureWarning}
              isApprovalOrRejection={isApprovalOrRejection}
              data={customTxParamsData || data}
              useCurrencyRateCheck={useCurrencyRateCheck}
              hexMinimumTransactionFee={hexMinimumTransactionFee}
            />
          </Box>
        </Box>
      ) : null}
      {!isFirstPage && fromAddressIsLedger && (
        <Box paddingLeft={2} paddingRight={2}>
          <LedgerInstructionField showDataInstruction />
        </Box>
      )}
      <PageContainerFooter
        cancelText={t('reject')}
        submitText={isFirstPage ? t('next') : t('approveButtonText')}
        onCancel={() => handleReject()}
        onSubmit={() => (isFirstPage ? handleNextClick() : handleApprove())}
        disabled={
          inputChangeInProgress || disableNextButton || disableApproveButton
        }
      >
        {unapprovedTxCount > 1 && (
          <Button
            type="link"
            onClick={(e) => {
              e.preventDefault();
              handleCancelAll();
            }}
          >
            {t('rejectTxsN', [unapprovedTxCount])}
          </Button>
        )}
      </PageContainerFooter>
      {showContractDetails && (
        <ContractDetailsModal
          tokenName={tokenSymbol}
          onClose={() => setShowContractDetails(false)}
          tokenAddress={tokenAddress}
          toAddress={toAddress}
          chainId={fullTxData.chainId}
          rpcPrefs={rpcPrefs}
        />
      )}
    </Box>
  );
}

TokenAllowance.propTypes = {
  /**
   * Dapp URL
   */
  origin: PropTypes.string,
  /**
   * Dapp image
   */
  siteImage: PropTypes.string,
  /**
   * Function that is supposed to open the customized gas modal
   */
  showCustomizeGasModal: PropTypes.func,
  /**
   * Whether nonce field should be used or not
   */
  useNonceField: PropTypes.bool,
  /**
   * Current fiat currency (e.g. USD)
   */
  currentCurrency: PropTypes.string,
  /**
   * Current native currency (e.g. RopstenETH)
   */
  nativeCurrency: PropTypes.string,
  /**
   * Total sum of the transaction in native currency
   */
  ethTransactionTotal: PropTypes.string,
  /**
   * Total sum of the transaction in fiat currency
   */
  fiatTransactionTotal: PropTypes.string,
  /**
   * Total sum of the transaction converted to hex value
   */
  hexTransactionTotal: PropTypes.string,
  /**
   * Minimum transaction fee converted to hex value
   */
  hexMinimumTransactionFee: PropTypes.string,
  /**
   * Current transaction
   */
  txData: PropTypes.object,
  /**
   * Is multi-layer fee network or not
   */
  isMultiLayerFeeNetwork: PropTypes.bool,
  /**
   * Is the enhanced gas fee enabled or not
   */
  supportsEIP1559: PropTypes.bool,
  /**
   * User's address
   */
  userAddress: PropTypes.string,
  /**
   * Address of the token that is waiting to be allowed
   */
  tokenAddress: PropTypes.string,
  /**
   * Current transaction data
   */
  data: PropTypes.string,
  /**
   * Is set approve for all or not
   */
  isSetApproveForAll: PropTypes.bool,
  /**
   * Whether a current set approval for all transaction will approve or revoke access
   */
  isApprovalOrRejection: PropTypes.bool,
  /**
   * Number of decimals
   */
  decimals: PropTypes.string,
  /**
   * Token amount proposed by the Dapp
   */
  dappProposedTokenAmount: PropTypes.string,
  /**
   * Token balance of the current account
   */
  currentTokenBalance: PropTypes.string,
  /**
   * Contract address requesting spending cap
   */
  toAddress: PropTypes.string,
  /**
   * Symbol of the token that is waiting to be allowed
   */
  tokenSymbol: PropTypes.string,
  /**
   * Whether the address sending the transaction is a ledger address
   */
  fromAddressIsLedger: PropTypes.bool,
};

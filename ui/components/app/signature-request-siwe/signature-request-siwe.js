import React, { useCallback, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import log from 'loglevel';
import { isValidSIWEOrigin } from '@metamask/controller-utils';
import { BannerAlert, Text } from '../../component-library';
import Popover from '../../ui/popover';
import Checkbox from '../../ui/check-box';
import { I18nContext } from '../../../contexts/i18n';
import { PageContainerFooter } from '../../ui/page-container';
import { isAddressLedger } from '../../../ducks/metamask/metamask';
import {
  accountsWithSendEtherInfoSelector,
  getSubjectMetadata,
} from '../../../selectors';
import { getAccountByAddress } from '../../../helpers/utils/util';
import { formatMessageParams } from '../../../../shared/modules/siwe';

import {
  SEVERITIES,
  TextVariant,
} from '../../../helpers/constants/design-system';

import SecurityProviderBannerMessage from '../security-provider-banner-message/security-provider-banner-message';
import { SECURITY_PROVIDER_MESSAGE_SEVERITIES } from '../security-provider-banner-message/security-provider-banner-message.constants';
import LedgerInstructionField from '../ledger-instruction-field';

import SignatureRequestHeader from '../signature-request-header';
import Header from './signature-request-siwe-header';
import Message from './signature-request-siwe-message';

export default function SignatureRequestSIWE({
  txData,
  cancelPersonalMessage,
  signPersonalMessage,
}) {
  const t = useContext(I18nContext);

  const allAccounts = useSelector(accountsWithSendEtherInfoSelector);
  const subjectMetadata = useSelector(getSubjectMetadata);

  const {
    msgParams: {
      from,
      origin,
      siwe: { parsedMessage },
    },
  } = txData;

  const isLedgerWallet = useSelector((state) => isAddressLedger(state, from));

  const fromAccount = getAccountByAddress(allAccounts, from);
  const targetSubjectMetadata = subjectMetadata[origin];

  const isMatchingAddress =
    from.toLowerCase() === parsedMessage.address.toLowerCase();

  const isSIWEDomainValid = isValidSIWEOrigin(txData.msgParams);

  const [isShowingDomainWarning, setIsShowingDomainWarning] = useState(false);
  const [hasAgreedToDomainWarning, setHasAgreedToDomainWarning] =
    useState(false);

  const showSecurityProviderBanner =
    (txData?.securityProviderResponse?.flagAsDangerous !== undefined &&
      txData?.securityProviderResponse?.flagAsDangerous !==
        SECURITY_PROVIDER_MESSAGE_SEVERITIES.NOT_MALICIOUS) ||
    (txData?.securityProviderResponse &&
      Object.keys(txData.securityProviderResponse).length === 0);

  const onSign = useCallback(
    async (event) => {
      try {
        await signPersonalMessage(event);
      } catch (e) {
        log.error(e);
      }
    },
    [signPersonalMessage],
  );

  const onCancel = useCallback(
    async (event) => {
      try {
        await cancelPersonalMessage(event);
      } catch (e) {
        log.error(e);
      }
    },
    [cancelPersonalMessage],
  );

  return (
    <div className="signature-request-siwe">
      <SignatureRequestHeader txData={txData} />
      <Header
        fromAccount={fromAccount}
        domain={origin}
        isSIWEDomainValid={isSIWEDomainValid}
        subjectMetadata={targetSubjectMetadata}
      />

      {showSecurityProviderBanner && (
        <SecurityProviderBannerMessage
          securityProviderResponse={txData.securityProviderResponse}
        />
      )}

      <Message data={formatMessageParams(parsedMessage, t)} />
      {!isMatchingAddress && (
        <BannerAlert
          severity={SEVERITIES.WARNING}
          marginLeft={4}
          marginRight={4}
          marginBottom={4}
        >
          {t('SIWEAddressInvalid', [
            parsedMessage.address,
            fromAccount.address,
          ])}
        </BannerAlert>
      )}

      {isLedgerWallet && (
        <div className="confirm-approve-content__ledger-instruction-wrapper">
          <LedgerInstructionField showDataInstruction />
        </div>
      )}

      {!isSIWEDomainValid && (
        <BannerAlert
          severity={SEVERITIES.DANGER}
          marginLeft={4}
          marginRight={4}
          marginBottom={4}
        >
          <Text variant={TextVariant.bodyMdBold}>
            {t('SIWEDomainInvalidTitle')}
          </Text>{' '}
          <Text>{t('SIWEDomainInvalidText')}</Text>
        </BannerAlert>
      )}
      <PageContainerFooter
        footerClassName="signature-request-siwe__page-container-footer"
        onCancel={onCancel}
        onSubmit={
          isSIWEDomainValid ? onSign : () => setIsShowingDomainWarning(true)
        }
        cancelText={t('cancel')}
        submitText={t('signin')}
        submitButtonType={isSIWEDomainValid ? 'primary' : 'danger-primary'}
      />
      {isShowingDomainWarning && (
        <Popover
          onClose={() => setIsShowingDomainWarning(false)}
          title={t('SIWEWarningTitle')}
          subtitle={t('SIWEWarningSubtitle')}
          className="signature-request-siwe__warning-popover"
          footerClassName="signature-request-siwe__warning-popover__footer"
          footer={
            <PageContainerFooter
              footerClassName="signature-request-siwe__warning-popover__footer__warning-footer"
              onCancel={() => setIsShowingDomainWarning(false)}
              cancelText={t('cancel')}
              cancelButtonType="default"
              onSubmit={onSign}
              submitText={t('confirm')}
              submitButtonType="danger-primary"
              disabled={!hasAgreedToDomainWarning}
            />
          }
        >
          <div className="signature-request-siwe__warning-popover__checkbox-wrapper">
            <Checkbox
              id="signature-request-siwe_domain-checkbox"
              checked={hasAgreedToDomainWarning}
              className="signature-request-siwe__warning-popover__checkbox-wrapper__checkbox"
              onClick={() => setHasAgreedToDomainWarning((checked) => !checked)}
            />
            <label
              className="signature-request-siwe__warning-popover__checkbox-wrapper__label"
              htmlFor="signature-request-siwe_domain-checkbox"
            >
              {t('SIWEDomainWarningBody', [parsedMessage.domain])}
            </label>
          </div>
        </Popover>
      )}
    </div>
  );
}

SignatureRequestSIWE.propTypes = {
  /**
   * The display content of transaction data
   */
  txData: PropTypes.object.isRequired,
  /**
   * Handler for cancel button
   */
  cancelPersonalMessage: PropTypes.func.isRequired,
  /**
   * Handler for sign button
   */
  signPersonalMessage: PropTypes.func.isRequired,
};

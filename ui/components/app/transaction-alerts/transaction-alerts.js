import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import { PriorityLevels } from '../../../../shared/constants/gas';
import { submittedPendingTransactionsSelector } from '../../../selectors';
import { useGasFeeContext } from '../../../contexts/gasFee';
import { useI18nContext } from '../../../hooks/useI18nContext';
import ActionableMessage from '../../ui/actionable-message/actionable-message';
import SimulationErrorMessage from '../../ui/simulation-error-message';
import Typography from '../../ui/typography';
import { TypographyVariant } from '../../../helpers/constants/design-system';
import ZENDESK_URLS from '../../../helpers/constants/zendesk-url';

const TransactionAlerts = ({
  userAcknowledgedGasMissing,
  setUserAcknowledgedGasMissing,
}) => {
  const { estimateUsed, hasSimulationError, supportsEIP1559, isNetworkBusy } =
    useGasFeeContext();
  const pendingTransactions = useSelector(submittedPendingTransactionsSelector);
  const t = useI18nContext();

  return (
    <div className="transaction-alerts">
      {supportsEIP1559 && hasSimulationError && (
        <SimulationErrorMessage
          userAcknowledgedGasMissing={userAcknowledgedGasMissing}
          setUserAcknowledgedGasMissing={setUserAcknowledgedGasMissing}
        />
      )}
      {supportsEIP1559 && pendingTransactions?.length > 0 && (
        <ActionableMessage
          message={
            <Typography
              align="left"
              className="transaction-alerts__pending-transactions"
              margin={0}
              tag={TypographyVariant.paragraph}
              variant={TypographyVariant.H7}
            >
              <strong>
                {pendingTransactions?.length === 1
                  ? t('pendingTransactionSingle', [pendingTransactions?.length])
                  : t('pendingTransactionMultiple', [
                      pendingTransactions?.length,
                    ])}
              </strong>{' '}
              {t('pendingTransactionInfo')}
              {t('learnCancelSpeeedup', [
                <a
                  key="cancelSpeedUpInfo"
                  href={ZENDESK_URLS.SPEEDUP_CANCEL}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {t('cancelSpeedUp')}
                </a>,
              ])}
            </Typography>
          }
          useIcon
          iconFillColor="var(--color-warning-default)"
          type="warning"
        />
      )}
      {estimateUsed === PriorityLevels.low && (
        <ActionableMessage
          dataTestId="low-gas-fee-alert"
          message={
            <Typography
              align="left"
              margin={0}
              tag={TypographyVariant.paragraph}
              variant={TypographyVariant.H7}
            >
              {t('lowPriorityMessage')}
            </Typography>
          }
          useIcon
          iconFillColor="var(--color-warning-default)"
          type="warning"
        />
      )}
      {supportsEIP1559 && isNetworkBusy ? (
        <ActionableMessage
          message={
            <Typography
              align="left"
              margin={0}
              tag={TypographyVariant.paragraph}
              variant={TypographyVariant.H7}
            >
              {t('networkIsBusy')}
            </Typography>
          }
          iconFillColor="var(--color-warning-default)"
          type="warning"
          useIcon
        />
      ) : null}
    </div>
  );
};

TransactionAlerts.propTypes = {
  userAcknowledgedGasMissing: PropTypes.bool,
  setUserAcknowledgedGasMissing: PropTypes.func,
};

export default TransactionAlerts;

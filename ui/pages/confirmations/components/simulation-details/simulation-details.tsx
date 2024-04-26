import React from 'react';
import {
  SimulationData,
  SimulationError,
  SimulationErrorCode,
} from '@metamask/transaction-controller';
import {
  Box,
  Icon,
  IconName,
  Text,
} from '../../../../components/component-library';
import {
  AlignItems,
  BorderColor,
  BorderRadius,
  Display,
  FlexDirection,
  JustifyContent,
  TextColor,
  TextVariant,
} from '../../../../helpers/constants/design-system';
import InfoTooltip from '../../../../components/ui/info-tooltip/info-tooltip';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import Preloader from '../../../../components/ui/icon/preloader/preloader-icon.component';
import { BalanceChangeList } from './balance-change-list';
import { useBalanceChanges } from './useBalanceChanges';
import { useSimulationMetrics } from './useSimulationMetrics';

export type SimulationDetailsProps = {
  simulationData?: SimulationData;
  transactionId: string;
  enableMetrics?: boolean;
};

/**
 * Displayed while loading the simulation preview.
 *
 * @returns
 */
const LoadingIndicator: React.FC = () => {
  return (
    <div role="progressbar">
      <Preloader size={20} />
    </div>
  );
};

/**
 * Content when simulation has failed.
 *
 * @param props
 * @param props.error
 */
const ErrorContent: React.FC<{ error: SimulationError }> = ({ error }) => {
  const t = useI18nContext();

  function getMessage() {
    return error.code === SimulationErrorCode.Reverted
      ? t('simulationDetailsTransactionReverted')
      : t('simulationDetailsFailed');
  }

  return (
    <Text
      color={TextColor.warningDefault}
      variant={TextVariant.bodyMd}
      display={Display.Flex}
      alignItems={AlignItems.center}
    >
      <Icon name={IconName.Warning} marginInlineEnd={1} />
      {getMessage()}
    </Text>
  );
};

/**
 * Content when there are no balance changes.
 */
const EmptyContent: React.FC = () => {
  const t = useI18nContext();
  return (
    <Text color={TextColor.textAlternative} variant={TextVariant.bodyMd}>
      {t('simulationDetailsNoBalanceChanges')}
    </Text>
  );
};

/**
 * Header at the top of the simulation preview.
 *
 * @param props
 * @param props.children
 */
const HeaderLayout: React.FC = ({ children }) => {
  const t = useI18nContext();
  return (
    <Box
      display={Display.Flex}
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      justifyContent={JustifyContent.spaceBetween}
    >
      <Box
        display={Display.Flex}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={1}
      >
        <Text variant={TextVariant.bodyMdMedium}>
          {t('simulationDetailsTitle')}
        </Text>
        <InfoTooltip
          position="right"
          iconFillColor="var(--color-icon-muted)"
          contentText={t('simulationDetailsTitleTooltip')}
        />
      </Box>
      {children}
    </Box>
  );
};

/**
 * Top-level layout for the simulation preview.
 *
 * @param props
 * @param props.inHeader
 * @param props.children
 */
const SimulationDetailsLayout: React.FC<{
  inHeader?: React.ReactNode;
}> = ({ inHeader, children }) => (
  <Box
    data-testid="simulation-details-layout"
    className="simulation-details-layout"
    display={Display.Flex}
    flexDirection={FlexDirection.Column}
    borderRadius={BorderRadius.LG}
    borderColor={BorderColor.borderDefault}
    padding={3}
    margin={4}
    gap={3}
  >
    <HeaderLayout>{inHeader}</HeaderLayout>
    {children}
  </Box>
);

/**
 * Preview of a transaction's effects using simulation data.
 *
 * @param props
 * @param props.simulationData - The simulation data to display.
 * @param props.transactionId - The ID of the transaction being simulated.
 * @param props.enableMetrics - Whether to enable simulation metrics.
 */
export const SimulationDetails: React.FC<SimulationDetailsProps> = ({
  simulationData,
  transactionId,
  enableMetrics = false,
}: SimulationDetailsProps) => {
  const t = useI18nContext();
  const balanceChangesResult = useBalanceChanges(simulationData);
  const loading = !simulationData || balanceChangesResult.pending;

  useSimulationMetrics({
    enableMetrics,
    balanceChanges: balanceChangesResult.value,
    loading,
    simulationData,
    transactionId,
  });

  if (loading) {
    return (
      <SimulationDetailsLayout
        inHeader={<LoadingIndicator />}
      ></SimulationDetailsLayout>
    );
  }

  const { error } = simulationData;

  if (
    [
      SimulationErrorCode.ChainNotSupported,
      SimulationErrorCode.Disabled,
    ].includes(error?.code as SimulationErrorCode)
  ) {
    return null;
  }

  if (error) {
    return (
      <SimulationDetailsLayout>
        <ErrorContent error={error} />
      </SimulationDetailsLayout>
    );
  }

  const balanceChanges = balanceChangesResult.value;
  const empty = balanceChanges.length === 0;
  if (empty) {
    return (
      <SimulationDetailsLayout>
        <EmptyContent />
      </SimulationDetailsLayout>
    );
  }

  const outgoing = balanceChanges.filter((bc) => bc.amount.isNegative());
  const incoming = balanceChanges.filter((bc) => !bc.amount.isNegative());
  return (
    <SimulationDetailsLayout>
      <Box display={Display.Flex} flexDirection={FlexDirection.Column} gap={3}>
        <BalanceChangeList
          heading={t('simulationDetailsOutgoingHeading')}
          balanceChanges={outgoing}
          testId="simulation-rows-outgoing"
        />
        <BalanceChangeList
          heading={t('simulationDetailsIncomingHeading')}
          balanceChanges={incoming}
          testId="simulation-rows-incoming"
        />
      </Box>
    </SimulationDetailsLayout>
  );
};

import React, { useCallback, useState } from 'react';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
} from '../../../../component-library';
import {
  AlignItems,
  BackgroundColor,
  BorderRadius,
  Display,
  IconColor,
  TextColor,
  TextVariant,
} from '../../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import useAlerts from '../../../../../hooks/useAlerts';
import { AlertModal } from '../alert-modal';
import { Alert } from '../../../../../ducks/confirm-alerts/confirm-alerts';

export type MultipleAlertModalProps = {
  /** The key of the initial alert to display. */
  alertKey: string;
  /** The function to execute a determinate action based on the action key. */
  onActionClick?: (actionKey: string) => void;
  /** The function to be executed when the button in the alert modal is clicked. */
  onFinalAcknowledgeClick: () => void;
  /** The function to be executed when the modal needs to be closed. */
  onClose: () => void;
  /** The unique identifier of the entity that owns the alert. */
  ownerId: string;
};

function PreviousButton({
  selectedIndex,
  onBackButtonClick,
}: {
  selectedIndex: number;
  onBackButtonClick: () => void;
}) {
  const t = useI18nContext();
  const showPreviousButton = selectedIndex + 1 > 1;
  if (!showPreviousButton) {
    return null;
  }

  return (
    <ButtonIcon
      iconName={IconName.ArrowLeft}
      ariaLabel={t('back')}
      size={ButtonIconSize.Sm}
      onClick={onBackButtonClick}
      className={'confirm_nav__left_btn'}
      data-testid="alert-modal-back-button"
      borderRadius={BorderRadius.full}
      color={IconColor.iconAlternative}
      backgroundColor={BackgroundColor.backgroundAlternative}
    />
  );
}

function NextButton({
  selectedIndex,
  alertsLength,
  onNextButtonClick,
}: {
  selectedIndex: number;
  alertsLength: number;
  onNextButtonClick: () => void;
}) {
  const t = useI18nContext();
  const showNextButton = selectedIndex + 1 < alertsLength;
  if (!showNextButton) {
    return null;
  }

  return (
    <ButtonIcon
      iconName={IconName.ArrowRight}
      ariaLabel={t('next')}
      size={ButtonIconSize.Sm}
      onClick={onNextButtonClick}
      className={'confirm_nav__right_btn'}
      data-testid="alert-modal-next-button"
      borderRadius={BorderRadius.full}
      color={IconColor.iconAlternative}
      backgroundColor={BackgroundColor.backgroundAlternative}
    />
  );
}

function PageNumber({
  selectedIndex,
  alertsLength,
}: {
  selectedIndex: number;
  alertsLength: number;
}) {
  const t = useI18nContext();
  return (
    <Text
      variant={TextVariant.bodySm}
      color={TextColor.textAlternative}
      marginInline={2}
    >
      {`${selectedIndex + 1} ${t('ofTextNofM')} ${alertsLength}`}
    </Text>
  );
}

function PageNavigation({
  alerts,
  onBackButtonClick,
  onNextButtonClick,
  selectedIndex,
}: {
  alerts: Alert[];
  onBackButtonClick: () => void;
  onNextButtonClick: () => void;
  selectedIndex: number;
}) {
  if (alerts.length <= 1) {
    return null;
  }
  return (
    <Box display={Display.Flex} alignItems={AlignItems.center}>
      <PreviousButton
        selectedIndex={selectedIndex}
        onBackButtonClick={onBackButtonClick}
      />
      <PageNumber selectedIndex={selectedIndex} alertsLength={alerts.length} />
      <NextButton
        selectedIndex={selectedIndex}
        alertsLength={alerts.length}
        onNextButtonClick={onNextButtonClick}
      />
    </Box>
  );
}

export function MultipleAlertModal({
  alertKey,
  onActionClick,
  onClose,
  onFinalAcknowledgeClick,
  ownerId,
}: MultipleAlertModalProps) {
  const { alerts } = useAlerts(ownerId);

  const [selectedIndex, setSelectedIndex] = useState(
    alerts.findIndex((alert) => alert.key === alertKey),
  );

  const selectedAlert = alerts[selectedIndex];

  const handleBackButtonClick = useCallback(() => {
    setSelectedIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : prevIndex,
    );
  }, []);

  const handleNextButtonClick = useCallback(() => {
    setSelectedIndex((prevIndex) => prevIndex + 1);
  }, []);

  const handleAcknowledgeClick = useCallback(() => {
    if (selectedIndex + 1 === alerts.length) {
      onFinalAcknowledgeClick();
      return;
    }

    handleBackButtonClick();
  }, [onFinalAcknowledgeClick, handleBackButtonClick, selectedIndex, alerts]);

  return (
    <AlertModal
      ownerId={ownerId}
      onAcknowledgeClick={handleAcknowledgeClick}
      onActionClick={onActionClick}
      alertKey={selectedAlert.key}
      onClose={onClose}
      headerStartAccessory={
        <PageNavigation
          alerts={alerts}
          onBackButtonClick={handleBackButtonClick}
          onNextButtonClick={handleNextButtonClick}
          selectedIndex={selectedIndex}
        />
      }
    />
  );
}

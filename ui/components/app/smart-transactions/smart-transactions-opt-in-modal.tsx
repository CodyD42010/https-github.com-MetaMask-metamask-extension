import React, { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  TextColor,
  Display,
  FlexDirection,
  BlockSize,
  AlignItems,
  TextAlign,
  JustifyContent,
  TextVariant,
  IconColor,
} from '../../../helpers/constants/design-system';
import {
  Modal,
  ModalOverlay,
  Text,
  Box,
  Button,
  ButtonVariant,
  ModalHeader,
  ModalContent,
  ButtonLink,
  ButtonLinkSize,
  AvatarIcon,
  IconName,
  AvatarIconSize,
} from '../../component-library';
import { setSmartTransactionsOptInStatus } from '../../../store/actions';
import { SMART_TRANSACTIONS_LEARN_MORE_URL } from '../../../../shared/constants/smartTransactions';

export type SmartTransactionsOptInModalProps = {
  isOpen: boolean;
  hideWhatsNewPopup: () => void;
};

const LearnMoreLink = () => {
  const t = useI18nContext();
  return (
    <ButtonLink
      size={ButtonLinkSize.Inherit}
      textProps={{
        variant: TextVariant.bodyMd,
        alignItems: AlignItems.flexStart,
      }}
      as="a"
      href={SMART_TRANSACTIONS_LEARN_MORE_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      {t('learnMoreUpperCaseWithDot')}
    </ButtonLink>
  );
};

const EnableSmartTransactionsButton = ({
  handleEnableButtonClick,
}: {
  handleEnableButtonClick: () => void;
}) => {
  const t = useI18nContext();
  return (
    <Button
      marginTop={8}
      variant={ButtonVariant.Primary}
      onClick={handleEnableButtonClick}
      width={BlockSize.Full}
    >
      {t('enableSmartTransactions')}
    </Button>
  );
};

const NotRightNowLink = ({
  handleNotRightNowLinkClick,
}: {
  handleNotRightNowLinkClick: () => void;
}) => {
  const t = useI18nContext();
  return (
    <Button
      marginTop={2}
      type="link"
      variant={ButtonVariant.Link}
      onClick={handleNotRightNowLinkClick}
      width={BlockSize.Full}
    >
      {t('notRightNow')}
    </Button>
  );
};

const Description = () => {
  const t = useI18nContext();
  return (
    <Box display={Display.Flex} flexDirection={FlexDirection.Column}>
      <Text variant={TextVariant.bodyMd} marginTop={4}>
        {t('smartTransactionsDescription')}
      </Text>
      <Text variant={TextVariant.bodyMd} marginTop={4}>
        {t('smartTransactionsDescription2')}
      </Text>
      <Text variant={TextVariant.bodyMd} marginTop={4}>
        {t('smartTransactionsDescription3', [<LearnMoreLink />])}
      </Text>
    </Box>
  );
};

const Benefit = ({ text, iconName }: { text: string; iconName: IconName }) => {
  return (
    <Box
      display={Display.Flex}
      flexDirection={FlexDirection.Column}
      className="mm-smart-transactions-opt-in-modal__benefit"
      textAlign={TextAlign.Center}
      alignItems={AlignItems.center}
      justifyContent={JustifyContent.flexStart}
    >
      <AvatarIcon
        iconName={iconName}
        size={AvatarIconSize.Md}
        color={IconColor.primaryDefault}
      />
      <Text
        variant={TextVariant.bodyXs}
        color={TextColor.textAlternative}
        marginTop={1}
      >
        {text}
      </Text>
    </Box>
  );
};

const Benefits = () => {
  const t = useI18nContext();
  return (
    <Box
      display={Display.Flex}
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.center}
      marginTop={4}
    >
      <Benefit
        text={t('smartTransactionsBenefit1')}
        iconName={IconName.Confirmation}
      />
      <Benefit
        text={t('smartTransactionsBenefit2')}
        iconName={IconName.SecurityTick}
      />
      <Benefit
        text={t('smartTransactionsBenefit3')}
        iconName={IconName.Clock}
      />
    </Box>
  );
};

export default function SmartTransactionsOptInModal({
  isOpen,
  hideWhatsNewPopup,
}: SmartTransactionsOptInModalProps) {
  const t = useI18nContext();
  const dispatch = useDispatch();

  const handleEnableButtonClick = useCallback(() => {
    dispatch(setSmartTransactionsOptInStatus(true));
  }, [dispatch]);

  const handleNotRightNowLinkClick = useCallback(() => {
    dispatch(setSmartTransactionsOptInStatus(false));
  }, [dispatch]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    // If the Smart Transactions Opt-In modal is open, hide the What's New popup,
    // because we don't want to show 2 modals at the same time.
    hideWhatsNewPopup();
  }, [isOpen, hideWhatsNewPopup]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleEnableButtonClick}
      isClosedOnOutsideClick={false}
      isClosedOnEscapeKey={false}
      className="mm-modal__custom-scrollbar mm-smart-transactions-opt-in-modal"
      autoFocus={false}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader
          alignItems={AlignItems.center}
          justifyContent={JustifyContent.center}
        >
          {t('introducingSmartTransactions')}
        </ModalHeader>
        <Box
          display={Display.Flex}
          flexDirection={FlexDirection.Column}
          paddingLeft={4}
          paddingRight={4}
        >
          <Benefits />
          <Description />
          <EnableSmartTransactionsButton
            handleEnableButtonClick={handleEnableButtonClick}
          />
          <NotRightNowLink
            handleNotRightNowLinkClick={handleNotRightNowLinkClick}
          />
        </Box>
      </ModalContent>
    </Modal>
  );
}

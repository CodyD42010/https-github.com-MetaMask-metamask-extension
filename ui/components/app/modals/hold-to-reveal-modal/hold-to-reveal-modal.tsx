import React from 'react';
import {
  Display,
  FlexDirection,
  TextVariant,
} from '../../../../helpers/constants/design-system';
import ZENDESK_URLS from '../../../../helpers/constants/zendesk-url';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import {
  BUTTON_SIZES,
  BUTTON_VARIANT,
  Box,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from '../../../component-library';
import HoldToRevealButton from '../../hold-to-reveal-button';

type HoldToRevealModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLongPressed: () => void;
  holdToRevealType: 'SRP' | 'PrivateKey';
};

export default function HoldToRevealModal({
  isOpen,
  onClose,
  onLongPressed,
  holdToRevealType,
}: HoldToRevealModalProps) {
  const t = useI18nContext();
  const holdToRevealTitle =
    holdToRevealType === 'SRP'
      ? 'holdToRevealSRPTitle'
      : 'holdToRevealPrivateKeyTitle';

  const holdToRevealButton =
    holdToRevealType === 'SRP' ? 'holdToRevealSRP' : 'holdToRevealPrivateKey';

  const holdToRevealContent =
    holdToRevealType === 'SRP'
      ? 'holdToRevealContent'
      : 'holdToRevealContentPrivateKey';

  // If this is done inline, verify-locales will output `Forbidden use of template strings in 't' function`
  const holdToRevealContent1 = `${holdToRevealContent}1`;
  const holdToRevealContent2 = `${holdToRevealContent}2`;

  // This is here to stop yarn verify-locales from removing these strings
  t('holdToRevealContentPrivateKey1');
  t('holdToRevealContentPrivateKey2');
  t('holdToRevealContent1');
  t('holdToRevealContent2');

  const MainContent = () => {
    return (
      <Box
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        gap={4}
        marginTop={6}
        marginBottom={6}
      >
        <Text variant={TextVariant.bodyMd}>
          {t(holdToRevealContent1, [
            <Text
              key="hold-to-reveal-2"
              variant={TextVariant.bodyMdBold}
              as="span"
            >
              {t(holdToRevealContent2)}
            </Text>,
          ])}
        </Text>
        <Text variant={TextVariant.bodyMdBold}>
          {t('holdToRevealContent3', [
            <Text
              key="hold-to-reveal-4"
              variant={TextVariant.bodyMd}
              as="span"
              display={Display.Inline}
            >
              {t('holdToRevealContent4')}
            </Text>,
            <Button
              key="hold-to-reveal-5"
              variant={BUTTON_VARIANT.LINK}
              size={BUTTON_SIZES.INHERIT}
              href={ZENDESK_URLS.NON_CUSTODIAL_WALLET}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('holdToRevealContent5')}
            </Button>,
          ])}
        </Text>
      </Box>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader onClose={onClose}>{t(holdToRevealTitle)}</ModalHeader>
        <Box display={Display.Flex} flexDirection={FlexDirection.Column}>
          <MainContent />
          <HoldToRevealButton
            buttonText={t(holdToRevealButton)}
            onLongPressed={onLongPressed}
          />
        </Box>
      </ModalContent>
    </Modal>
  );
}

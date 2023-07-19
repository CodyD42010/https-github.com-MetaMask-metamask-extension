import React from 'react';
import {
  BUTTON_VARIANT,
  Box,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '../../../components/component-library';
import { Text } from '../../../components/component-library/text/deprecated';
import {
  AlignItems,
  Display,
  FlexDirection,
  JustifyContent,
  TextAlign,
  TextVariant,
} from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';

export default function AddSnapAccountModal({
  onClose,
  isOpen,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const t = useI18nContext();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader onClose={onClose} margin={[4, 4, 4, 4]}>
          {t('settingAddSnapAccount')}
        </ModalHeader>
        <Box
          display={Display.Flex}
          padding={[4, 4, 4, 4]}
          flexDirection={FlexDirection.Column}
          justifyContent={JustifyContent.center}
          alignItems={AlignItems.center}
        >
          <Box marginBottom={4}>
            <img src="/images/add-snaps-image.svg" />
          </Box>
          <Text
            variant={TextVariant.bodyLgMedium}
            textAlign={TextAlign.Center}
            marginBottom={4}
          >
            {t('addSnapAccountModalDescription')}
          </Text>
          <Button
            variant={BUTTON_VARIANT.PRIMARY}
            block
            className="get-started_button"
            data-testid="get-started-button"
            onClick={() => {
              onClose();
            }}
          >
            {t('getStarted')}
          </Button>
        </Box>
      </ModalContent>
    </Modal>
  );
}

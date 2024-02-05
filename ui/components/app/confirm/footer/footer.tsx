import React, { useCallback } from 'react';
import { ethErrors, serializeError } from 'eth-rpc-errors';
import { useDispatch, useSelector } from 'react-redux';

import {
  BlockSize,
  Display,
  FlexDirection,
} from '../../../../helpers/constants/design-system';
import { currentConfirmationSelector } from '../../../../selectors';
import {
  rejectPendingApproval,
  resolvePendingApproval,
} from '../../../../store/actions';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '../../../component-library';

const Footer = () => {
  const t = useI18nContext();
  const currentConfirmation = useSelector(currentConfirmationSelector);
  const dispatch = useDispatch();

  const onCancel = useCallback(() => {
    if (!currentConfirmation) {
      return;
    }
    dispatch(
      rejectPendingApproval(
        currentConfirmation.id,
        serializeError(ethErrors.provider.userRejectedRequest()),
      ),
    );
  }, [currentConfirmation]);

  const onSubmit = useCallback(() => {
    if (!currentConfirmation) {
      return;
    }
    dispatch(resolvePendingApproval(currentConfirmation.id, undefined));
  }, [currentConfirmation]);

  return (
    <Box
      display={Display.Flex}
      flexDirection={FlexDirection.Row}
      gap={4}
      padding={4}
      width={BlockSize.Full}
    >
      <Button
        block
        data-testid="confirm-footer-cancel-button"
        onClick={onCancel}
        size={ButtonSize.Lg}
        variant={ButtonVariant.Secondary}
      >
        {t('cancel')}
      </Button>
      <Button
        block
        data-testid="confirm-footer-confirm-button"
        onClick={onSubmit}
        size={ButtonSize.Lg}
      >
        {t('confirm')}
      </Button>
    </Box>
  );
};

export default Footer;

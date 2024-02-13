import { ethErrors, serializeError } from 'eth-rpc-errors';
import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '../../../../../components/component-library';
import { Footer as PageFooter } from '../../../../../components/multichain/pages/page';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import { currentConfirmationSelector } from '../../../../../selectors';
import {
  rejectPendingApproval,
  resolvePendingApproval,
} from '../../../../../store/actions';

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
    <PageFooter>
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
    </PageFooter>
  );
};

export default Footer;

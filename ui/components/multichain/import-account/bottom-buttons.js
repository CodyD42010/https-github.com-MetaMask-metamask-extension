import PropTypes from 'prop-types';
import React from 'react';
import { useDispatch } from 'react-redux';
import {
  ButtonPrimary,
  ButtonSecondary,
  BUTTON_SECONDARY_SIZES,
} from '../../component-library';
import Box from '../../ui/box/box';
import { Display } from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';
import * as actions from '../../../store/actions';

BottomButtons.propTypes = {
  importAccountFunc: PropTypes.func.isRequired,
  isPrimaryDisabled: PropTypes.bool.isRequired,
  onActionComplete: PropTypes.func.isRequired,
};

export default function BottomButtons({
  importAccountFunc,
  isPrimaryDisabled,
  onActionComplete,
}) {
  const t = useI18nContext();
  const dispatch = useDispatch();

  return (
    <Box display={Display.Flex} gap={4}>
      <ButtonSecondary
        onClick={() => {
          dispatch(actions.hideWarning());
          onActionComplete();
        }}
        size={BUTTON_SECONDARY_SIZES.LG}
        block
      >
        {t('cancel')}
      </ButtonSecondary>
      <ButtonPrimary
        onClick={async () => {
          try {
            const result = await importAccountFunc();
            if (result) {
              onActionComplete(true);
            }
          } catch (e) {
            // Take no action
          }
        }}
        disabled={isPrimaryDisabled}
        size={BUTTON_SECONDARY_SIZES.LG}
        data-testid="import-account-confirm-button"
        block
      >
        {t('import')}
      </ButtonPrimary>
    </Box>
  );
}

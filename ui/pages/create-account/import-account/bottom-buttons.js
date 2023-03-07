import PropTypes from 'prop-types';
import React from 'react';
import { useDispatch } from 'react-redux';
import {
  ButtonPrimary,
  ButtonSecondary,
  BUTTON_SECONDARY_SIZES,
} from '../../../components/component-library';
import Box from '../../../components/ui/box/box';
import { DISPLAY } from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';
import * as actions from '../../../store/actions';

BottomButtons.propTypes = {
  importAccountFunc: PropTypes.func.isRequired,
  isPrimaryDisabled: PropTypes.bool.isRequired,
};

export default function BottomButtons({
  importAccountFunc,
  isPrimaryDisabled,
}) {
  const t = useI18nContext();
  const dispatch = useDispatch();

  return (
    <Box display={DISPLAY.FLEX} gap={4}>
      <ButtonSecondary
        onClick={() => {
          dispatch(actions.hideWarning());
          window.history.back();
        }}
        size={BUTTON_SECONDARY_SIZES.LG}
        block
      >
        {t('cancel')}
      </ButtonSecondary>
      <ButtonPrimary
        onClick={importAccountFunc}
        disabled={isPrimaryDisabled}
        size={BUTTON_SECONDARY_SIZES.LG}
        block
      >
        {t('import')}
      </ButtonPrimary>
    </Box>
  );
}

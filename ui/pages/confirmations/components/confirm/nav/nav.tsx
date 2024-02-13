import { ethErrors, serializeError } from 'eth-rpc-errors';
import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  Box,
  Button,
  ButtonVariant,
  IconName,
} from '../../../../../components/component-library';
import {
  AlignItems,
  BackgroundColor,
  BorderRadius,
  Display,
  FlexDirection,
  FontWeight,
  JustifyContent,
} from '../../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import { pendingConfirmationsSelector } from '../../../../../selectors';
import { rejectPendingApproval } from '../../../../../store/actions';

const Nav = () => {
  const t = useI18nContext();
  const pendingConfirmations = useSelector(pendingConfirmationsSelector);
  const dispatch = useDispatch();

  const onRejectAll = useCallback(() => {
    pendingConfirmations.forEach((conf) => {
      dispatch(
        rejectPendingApproval(
          conf.id,
          serializeError(ethErrors.provider.userRejectedRequest()),
        ),
      );
    });
  }, [pendingConfirmations]);

  return (
    <Box
      alignItems={AlignItems.center}
      backgroundColor={BackgroundColor.backgroundDefault}
      display={Display.Flex}
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.spaceBetween}
      padding={3}
    >
      <Box>Nav Placeholder</Box>
      {pendingConfirmations.length > 1 && (
        <Button
          borderRadius={BorderRadius.XL}
          className="confirm_nav__reject_all"
          fontWeight={FontWeight.Normal}
          onClick={onRejectAll}
          paddingLeft={3}
          paddingRight={3}
          startIconName={IconName.Close}
          type={ButtonVariant.Secondary}
        >
          {t('rejectAll')}
        </Button>
      )}
    </Box>
  );
};

export default Nav;

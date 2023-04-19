import React from 'react';
import {
  DISPLAY,
  AlignItems,
  Color,
  JustifyContent,
} from '../../../../helpers/constants/design-system';
import Box from '../../../ui/box';
import { Icon, IconName } from '../../../component-library';

const SignatureRequestSIWEIcon = () => {
  return (
    <Box
      className="signature-request-siwe-icon"
      display={DISPLAY.INLINE_FLEX}
      alignItems={AlignItems.center}
      backgroundColor={Color.errorDefault}
      justifyContent={JustifyContent.center}
    >
      <Icon name={IconName.Danger} color={Color.errorInverse} />
    </Box>
  );
};

export default SignatureRequestSIWEIcon;

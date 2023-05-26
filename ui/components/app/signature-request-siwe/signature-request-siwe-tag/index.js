import React from 'react';
import PropTypes from 'prop-types';
import {
  TextVariant,
  Size,
  DISPLAY,
  AlignItems,
  BackgroundColor,
  TextColor,
} from '../../../../helpers/constants/design-system';
import Box from '../../../ui/box';
import { Text } from '../../../component-library';

const SignatureRequestSIWETag = ({ text }) => {
  return (
    <Box
      className="signature-request-siwe-tag"
      marginRight={1}
      display={DISPLAY.INLINE_FLEX}
      alignItems={AlignItems.center}
      backgroundColor={BackgroundColor.errorDefault}
      borderRadius={Size.XL}
      paddingLeft={4}
      paddingRight={4}
    >
      <Text
        margin={0}
        variant={TextVariant.bodySmBold}
        as="h6"
        color={TextColor.errorInverse}
      >
        {text}
      </Text>
    </Box>
  );
};

export default SignatureRequestSIWETag;

SignatureRequestSIWETag.propTypes = {
  /**
   * The text to display in the tag
   */
  text: PropTypes.string,
};

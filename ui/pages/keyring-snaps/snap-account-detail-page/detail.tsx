import React from 'react';
import { Box } from '../../../components/component-library';
import { Text } from '../../../components/component-library/text/deprecated';
import {
  FlexDirection,
  TextVariant,
} from '../../../helpers/constants/design-system';

const Detail = ({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) => {
  return (
    <Box flexDirection={FlexDirection.Column} marginBottom={4}>
      <Text variant={TextVariant.bodySmBold} marginBottom={1}>
        {title}
      </Text>
      {children}
    </Box>
  );
};

export default Detail;

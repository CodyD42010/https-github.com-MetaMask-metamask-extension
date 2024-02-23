import React, { memo } from 'react';
import { useSelector } from 'react-redux';

import {
  BackgroundColor,
  BorderRadius,
} from '../../../../../helpers/constants/design-system';
import { Box } from '../../../../../components/component-library';
import { ConfirmInfo } from '../../../../../components/app/confirm/info/info';
import { confirmationInfoSelector } from './selector/confirmationInfoSelector';

const Info: React.FC = memo(() => {
  const infoRows = useSelector(confirmationInfoSelector);

  if (!infoRows?.length) {
    return null;
  }

  return (
    <Box
      backgroundColor={BackgroundColor.backgroundDefault}
      borderRadius={BorderRadius.MD}
      padding={2}
      marginBottom={4}
    >
      <ConfirmInfo rowConfigs={infoRows} />
    </Box>
  );
});

export default Info;

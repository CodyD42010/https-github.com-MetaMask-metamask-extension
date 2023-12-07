import React from 'react';
import { Box, Text } from '../../../../component-library';
import {
  AlignItems,
  Display,
  FlexDirection,
  TextColor,
  FlexWrap,
  Color,
} from '../../../../../helpers/constants/design-system';
import { useRowContext } from './hook';
import { ConfirmInfoRowState } from './row';

export type ConfirmInfoRowValueDoubleProps = {
  left: string;
  right: string;
};

const LEFT_TEXT_COLORS = {
  [ConfirmInfoRowState.Default]: TextColor.textMuted,
  [ConfirmInfoRowState.Critical]: Color.errorAlternative,
  [ConfirmInfoRowState.Warning]: Color.warningAlternative,
};

export const ConfirmInfoRowValueDouble = ({
  left,
  right,
}: ConfirmInfoRowValueDoubleProps) => {
  const { state } = useRowContext();
  return (
    <Box
      display={Display.Flex}
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      flexWrap={FlexWrap.Wrap}
      style={{
        // TODO: Box should support this
        columnGap: '8px',
      }}
    >
      <Text color={LEFT_TEXT_COLORS[state] as TextColor}>{left}</Text>
      <Text color={TextColor.inherit}>{right}</Text>
    </Box>
  );
};

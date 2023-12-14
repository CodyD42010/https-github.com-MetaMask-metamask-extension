import React from 'react';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  Text,
} from '../../../../component-library';
import {
  AlignItems,
  BorderRadius,
  Display,
  FlexWrap,
  IconColor,
  TextColor,
  TextVariant,
  BackgroundColor,
} from '../../../../../helpers/constants/design-system';

export type ConfirmInfoRowUrlProps = {
  url: string;
};

export const ConfirmInfoRowUrl = ({
  url: urlString,
}: ConfirmInfoRowUrlProps) => {
  let url;

  try {
    url = new URL(urlString);
  } catch (e) {
    console.log(`ConfirmInfoRowUrl: Error parsing url: ${urlString}`);
  }

  const isHTTP = url?.protocol === 'http:';
  const isValidUrl = Boolean(url);

  const displayUrl = isValidUrl
    ? `${url?.host}${url?.pathname === '/' ? '' : url?.pathname}`
    : urlString;

  return (
    <Box
      display={Display.Flex}
      alignItems={AlignItems.center}
      flexWrap={FlexWrap.Wrap}
      style={{
        // TODO: Box should support this
        columnGap: '8px',
      }}
    >
      {isHTTP && (
        <Text
          variant={TextVariant.bodySm}
          display={Display.Flex}
          alignItems={AlignItems.center}
          borderRadius={BorderRadius.SM}
          backgroundColor={BackgroundColor.warningMuted}
          paddingLeft={1}
          paddingRight={1}
          color={TextColor.warningDefault}
        >
          <Icon
            name={IconName.Danger}
            color={IconColor.warningDefault}
            size={IconSize.Sm}
            marginInlineEnd={1}
          />
          HTTP
        </Text>
      )}
      <Text color={TextColor.inherit}>{displayUrl}</Text>
    </Box>
  );
};

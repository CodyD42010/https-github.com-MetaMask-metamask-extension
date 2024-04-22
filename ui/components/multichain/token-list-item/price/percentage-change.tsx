import React from 'react';
import { Text } from '../../../component-library';
import {
  Display,
  FontWeight,
  TextColor,
  TextVariant,
} from '../../../../helpers/constants/design-system';
import { Box } from '../../../component-library';
import { useSelector } from 'react-redux';
import { getCurrentCurrency } from '../../../../selectors';
import { getIntlLocale } from '../../../../ducks/locale/locale';

const renderPercentage = (value, color) => {
  return (
    <Box display={Display.Flex}>
      <Text
        fontWeight={FontWeight.Normal}
        variant={TextVariant.bodyMd}
        color={color}
        data-testid="token-increase-decrease-percentage"
        ellipsis
      >
        {value}
      </Text>
    </Box>
  );
};

const renderPercentageWithNumber = (value, formattedValuePrice, color) => {
  return (
    <Box display={Display.Flex}>
      <Text
        fontWeight={FontWeight.Normal}
        variant={TextVariant.bodyMd}
        color={color}
        data-testid="token-increase-decrease-value"
        style={{ whiteSpace: 'pre' }}
        ellipsis
      >
        {formattedValuePrice}
      </Text>
      <Text
        fontWeight={FontWeight.Normal}
        variant={TextVariant.bodyMd}
        color={color}
        data-testid="token-increase-decrease-percentage"
        ellipsis
      >
        {value}
      </Text>
    </Box>
  );
};
const isNotNullOrUndefinedOrNaN = (value) => {
  return value !== null && value !== undefined && !Number.isNaN(value);
};

export const PercentageChange = ({
  value,
  valueChange = null,
  includeNumber = false,
}) => {
  const fiatCurrency = useSelector(getCurrentCurrency);
  const locale = useSelector(getIntlLocale);

  const color = isNotNullOrUndefinedOrNaN(value)
    ? value >= 0
      ? TextColor.successDefault
      : TextColor.errorDefault
    : TextColor.textDefault;

  const formattedValue = isNotNullOrUndefinedOrNaN(value)
    ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
    : '';

  const formattedValuePrice = isNotNullOrUndefinedOrNaN(valueChange)
    ? `${valueChange >= 0 ? '+' : ''}(${Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short',
        style: 'currency',
        currency: fiatCurrency,
        maximumFractionDigits: 2,
      }).format(valueChange)})  `
    : '';

  return includeNumber
    ? renderPercentageWithNumber(formattedValue, formattedValuePrice, color)
    : renderPercentage(formattedValue, color);
};

import React from 'react';
import { useSelector } from 'react-redux';
import { Text, Box } from '../../../component-library';
import {
  Display,
  FontWeight,
  TextColor,
  TextVariant,
} from '../../../../helpers/constants/design-system';
import { getCurrentCurrency } from '../../../../selectors';
import { getIntlLocale } from '../../../../ducks/locale/locale';

const renderPercentage = (value: string, color: TextColor) => {
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

const renderPercentageWithNumber = (
  value: string,
  formattedValuePrice: string,
  color: TextColor,
) => {
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

export const PercentageChange = ({
  value,
  valueChange,
  includeNumber = false,
}: {
  value: number | null | undefined;
  valueChange?: number | null | undefined;
  includeNumber?: boolean;
}) => {
  const fiatCurrency = useSelector(getCurrentCurrency);
  const locale = useSelector(getIntlLocale);

  let color = TextColor.textDefault;

  if (value !== null && value !== undefined && !Number.isNaN(value)) {
    if (value >= 0) {
      color = TextColor.successDefault;
    } else {
      color = TextColor.errorDefault;
    }
  }

  const formattedValue =
    value !== null && value !== undefined && !Number.isNaN(value)
      ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
      : '';

  const formattedValuePrice =
    valueChange !== null &&
    valueChange !== undefined &&
    !Number.isNaN(valueChange)
      ? `${valueChange >= 0 ? '+' : ''}(${Intl.NumberFormat(locale, {
          notation: 'compact',
          compactDisplay: 'short',
          style: 'currency',
          currency: fiatCurrency,
          maximumFractionDigits: 2,
        }).format(valueChange)}) `
      : '';

  return includeNumber
    ? renderPercentageWithNumber(formattedValue, formattedValuePrice, color)
    : renderPercentage(formattedValue, color);
};

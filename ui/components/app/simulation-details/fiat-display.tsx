import React from 'react';
import {
  TextColor,
  TextVariant,
} from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { Text } from '../../component-library';
import { SizeNumber } from '../../component-library/box/box.types';
import { useFiatFormatter } from '../../../hooks/useFiatFormatter';
import { FIAT_UNAVAILABLE, FiatAmount } from './types';

const textStyle = {
  color: TextColor.textAlternative,
  variant: TextVariant.bodySm,
  paddingRight: 2 as SizeNumber,
};

const FiatNotAvailableDisplay: React.FC = () => {
  const t = useI18nContext();
  return <Text {...textStyle}>{t('simulationDetailsFiatNotAvailable')}</Text>;
};

/**
 * Displays the fiat value of a single balance change.
 *
 * @param props
 * @param props.fiatAmount
 */
export const IndividualFiatDisplay: React.FC<{ fiatAmount: FiatAmount }> = ({
  fiatAmount,
}) => {
  const fiatFormatter = useFiatFormatter();
  if (fiatAmount === FIAT_UNAVAILABLE) {
    return <FiatNotAvailableDisplay />;
  }
  const absFiat = Math.abs(fiatAmount);

  return <Text {...textStyle}>{fiatFormatter(absFiat)}</Text>;
};

/**
 * Displays the total fiat value of a list of balance changes.
 *
 * @param props
 * @param props.fiatAmounts
 */
export const TotalFiatDisplay: React.FC<{
  fiatAmounts: FiatAmount[];
}> = ({ fiatAmounts }) => {
  const t = useI18nContext();
  const fiatFormatter = useFiatFormatter();

  const totalFiat = fiatAmounts.reduce((total: number, fiat) => {
    return total + (fiat === FIAT_UNAVAILABLE ? 0 : fiat);
  }, 0);

  return totalFiat === 0 ? (
    <FiatNotAvailableDisplay />
  ) : (
    <Text {...textStyle}>
      {t('simulationDetailsTotalFiat', [fiatFormatter(Math.abs(totalFiat))])}
    </Text>
  );
};

import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import UnitInput from '../../ui/unit-input';
import CurrencyDisplay from '../../ui/currency-display';
import { I18nContext } from '../../../contexts/i18n';
import {
  getNativeCurrency,
  getProviderConfig,
} from '../../../ducks/metamask/metamask';
import {
  getCurrentChainId,
  getCurrentCurrency,
  getShouldShowFiat,
} from '../../../selectors';
import { EtherDenomination } from '../../../../shared/constants/common';
import { Numeric } from '../../../../shared/modules/Numeric';
import { useIsOriginalNativeTokenSymbol } from '../../../hooks/useIsOriginalNativeTokenSymbol';
import { formatCurrency } from '../../../helpers/utils/confirm-tx.util';
import useTokenExchangeRate from './hooks/useTokenExchangeRate';
import useProcessNewDecimalValue from './hooks/useProcessNewDecimalValue';

const NATIVE_CURRENCY_DECIMALS = 18;
const LARGE_SYMBOL_LENGTH = 7;

/**
 * Component that allows user to enter currency values as a number, and props receive a converted
 * hex value in WEI. props.value, used as a default or forced value, should be a hex value, which
 * gets converted into a decimal value depending on the currency (ETH or Fiat).
 *
 * @param options0
 * @param options0.hexValue
 * @param options0.isFiatPreferred
 * @param options0.onChange
 * @param options0.onPreferenceToggle
 * @param options0.swapIcon
 * @param options0.className
 * @param options0.asset
 */
export default function CurrencyInput({
  hexValue,
  isFiatPreferred,
  onChange,
  onPreferenceToggle,
  swapIcon,
  className = '',
  // if null, the asset is the native currency
  asset,
}) {
  const t = useContext(I18nContext);

  const assetDecimals = asset?.decimals || NATIVE_CURRENCY_DECIMALS;

  const preferredCurrency = useSelector(getNativeCurrency);
  const secondaryCurrency = useSelector(getCurrentCurrency);

  const primarySuffix =
    asset?.symbol || preferredCurrency || EtherDenomination.ETH;
  const secondarySuffix = secondaryCurrency.toUpperCase();
  const isLongSymbol = (primarySuffix?.length || 0) > LARGE_SYMBOL_LENGTH;

  const isFiatAvailable = useSelector(getShouldShowFiat);

  const shouldUseFiat = isFiatAvailable && isFiatPreferred;
  const isTokenPrimary = !shouldUseFiat;

  const [tokenDecimalValue, setTokenDecimalValue] = useState('0');
  const [fiatDecimalValue, setFiatDecimalValue] = useState('0');

  const chainId = useSelector(getCurrentChainId);
  const { ticker, type } = useSelector(getProviderConfig);
  const isOriginalNativeSymbol = useIsOriginalNativeTokenSymbol(
    chainId,
    ticker,
    type,
  );

  const tokenToFiatConversionRate = useTokenExchangeRate(asset?.address);

  const processNewDecimalValue = useProcessNewDecimalValue(
    assetDecimals,
    isTokenPrimary,
    tokenToFiatConversionRate,
  );

  const swap = async () => {
    await onPreferenceToggle();
  };

  // if the conversion rate is undefined, do not allow a fiat input
  useEffect(() => {
    if (isTokenPrimary) {
      return;
    }

    if (!tokenToFiatConversionRate) {
      onPreferenceToggle();
    }
  }, [tokenToFiatConversionRate, isTokenPrimary, onPreferenceToggle]);

  const handleChange = (newDecimalValue) => {
    const { newTokenDecimalValue, newFiatDecimalValue } =
      processNewDecimalValue(newDecimalValue);
    setTokenDecimalValue(newTokenDecimalValue);
    setFiatDecimalValue(newFiatDecimalValue);

    onChange(
      new Numeric(newTokenDecimalValue, 10)
        .times(Math.pow(10, assetDecimals), 10)
        .toPrefixedHexString(),
    );
  };

  // reset form when token is changed
  useEffect(() => {
    setTokenDecimalValue('0');
    setFiatDecimalValue('0');
  }, [asset?.address]);

  // align input to upstream value
  useEffect(() => {
    if (!isTokenPrimary) {
      return;
    }

    const decimalizedHexValue = new Numeric(hexValue, 16)
      .toBase(10)
      .shiftedBy(assetDecimals)
      .toString();

    if (Number(decimalizedHexValue) === Number(tokenDecimalValue)) {
      return;
    }

    const { newTokenDecimalValue, newFiatDecimalValue } =
      processNewDecimalValue(decimalizedHexValue, true);

    setTokenDecimalValue(newTokenDecimalValue);
    setFiatDecimalValue(newFiatDecimalValue);
    // tokenDecimalValue does not need to be in here, since this side effect is only for upstream updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hexValue,
    asset?.address,
    processNewDecimalValue,
    isTokenPrimary,
    assetDecimals,
  ]);

  const renderSwapButton = () => {
    if (swapIcon) {
      return swapIcon(swap);
    }

    if (!isOriginalNativeSymbol) {
      return null;
    }

    return (
      <button
        className="currency-input__swap-component"
        data-testid="currency-swap"
        onClick={swap}
      >
        <i className="fa fa-retweet fa-lg" />
      </button>
    );
  };

  const renderConversionComponent = () => {
    let suffix, displayValue;

    if (!isFiatAvailable || !tokenToFiatConversionRate) {
      return (
        <div className="currency-input__conversion-component">
          {t('noConversionRateAvailable')}
        </div>
      );
    }
    if (!isOriginalNativeSymbol) {
      return null;
    }

    if (isTokenPrimary) {
      // Display fiat; `displayValue` bypasses calculations
      displayValue = formatCurrency(
        new Numeric(fiatDecimalValue, 10).toString(),
        secondaryCurrency,
      );
    } else {
      // Display token
      suffix = primarySuffix;
      displayValue = new Numeric(tokenDecimalValue, 10).toString();
    }

    return (
      <CurrencyDisplay
        // hides the fiat suffix
        hideLabel={isTokenPrimary || isLongSymbol}
        suffix={suffix}
        className="currency-input__conversion-component"
        displayValue={displayValue}
      />
    );
  };

  return (
    <UnitInput
      hideSuffix={isTokenPrimary && isLongSymbol}
      dataTestId="currency-input"
      suffix={isTokenPrimary ? primarySuffix : secondarySuffix}
      onChange={handleChange}
      value={isTokenPrimary ? tokenDecimalValue : fiatDecimalValue}
      className={className}
      actionComponent={
        isFiatAvailable && tokenToFiatConversionRate
          ? renderSwapButton()
          : undefined
      }
    >
      {renderConversionComponent()}
    </UnitInput>
  );
}

CurrencyInput.propTypes = {
  hexValue: PropTypes.string,
  isFiatPreferred: PropTypes.bool,
  onChange: PropTypes.func,
  onPreferenceToggle: PropTypes.func,
  swapIcon: PropTypes.func,
  className: PropTypes.string,
  asset: PropTypes.shape({
    address: PropTypes.string,
    symbol: PropTypes.string,
    decimals: PropTypes.number,
    isERC721: PropTypes.bool,
  }),
};

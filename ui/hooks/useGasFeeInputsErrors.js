import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { GAS_ESTIMATE_TYPES, GAS_LIMITS } from '../../shared/constants/gas';
import {
  conversionLessThan,
  conversionGreaterThan,
} from '../../shared/modules/conversion.utils';
import {
  checkNetworkAndAccountSupports1559,
  getSelectedAccount,
} from '../selectors';
import { addHexes } from '../helpers/utils/conversions.util';
import {
  bnGreaterThan,
  bnLessThan,
  bnLessThanEqualTo,
} from '../helpers/utils/util';
import { GAS_FORM_ERRORS } from '../helpers/constants/gas';

import { useGasFeeEstimates } from './useGasFeeEstimates';

const HIGH_FEE_WARNING_MULTIPLIER = 1.5;

const validateGasLimit = (gasLimit, minimumGasLimit) => {
  const gasLimitTooLow = conversionLessThan(
    { value: gasLimit, fromNumericBase: 'dec' },
    { value: minimumGasLimit || GAS_LIMITS.SIMPLE, fromNumericBase: 'hex' },
  );

  if (gasLimitTooLow) return GAS_FORM_ERRORS.GAS_LIMIT_OUT_OF_BOUNDS;
  return undefined;
};

const validateMaxPriorityFee = (
  isFeeMarketGasEstimate,
  maxPriorityFeePerGasToUse,
  networkAndAccountSupports1559,
) => {
  if (
    (networkAndAccountSupports1559 || isFeeMarketGasEstimate) &&
    bnLessThanEqualTo(maxPriorityFeePerGasToUse, 0)
  )
    return GAS_FORM_ERRORS.MAX_PRIORITY_FEE_BELOW_MINIMUM;
  return undefined;
};

const validateMaxFee = (
  isFeeMarketGasEstimate,
  maxFeePerGasToUse,
  maxPriorityFeePerGasToUse,
  networkAndAccountSupports1559,
) => {
  if (
    (networkAndAccountSupports1559 || isFeeMarketGasEstimate) &&
    bnGreaterThan(maxPriorityFeePerGasToUse, maxFeePerGasToUse)
  )
    return GAS_FORM_ERRORS.MAX_FEE_IMBALANCE;
  return undefined;
};

const validateGasPrice = (
  isFeeMarketGasEstimate,
  gasPriceToUse,
  networkAndAccountSupports1559,
  transaction,
) => {
  if (
    (!networkAndAccountSupports1559 || transaction?.txParams?.gasPrice) &&
    !isFeeMarketGasEstimate &&
    bnLessThanEqualTo(gasPriceToUse, 0)
  )
    return GAS_FORM_ERRORS.GAS_PRICE_TOO_LOW;
  return undefined;
};

const getMaxPriorityFeeWarning = (
  gasFeeEstimates,
  isFeeMarketGasEstimate,
  isGasEstimatesLoading,
  maxPriorityFeeError,
  maxPriorityFeePerGasToUse,
) => {
  if (maxPriorityFeeError || !isFeeMarketGasEstimate) return undefined;
  if (
    !isGasEstimatesLoading &&
    bnLessThan(
      maxPriorityFeePerGasToUse,
      gasFeeEstimates?.low?.suggestedMaxPriorityFeePerGas,
    )
  )
    return GAS_FORM_ERRORS.MAX_PRIORITY_FEE_TOO_LOW;
  if (
    gasFeeEstimates?.high &&
    bnGreaterThan(
      maxPriorityFeePerGasToUse,
      gasFeeEstimates.high.suggestedMaxPriorityFeePerGas *
        HIGH_FEE_WARNING_MULTIPLIER,
    )
  )
    return GAS_FORM_ERRORS.MAX_PRIORITY_FEE_HIGH_WARNING;
  return undefined;
};

const getMaxFeeWarning = (
  gasFeeEstimates,
  isGasEstimatesLoading,
  isFeeMarketGasEstimate,
  maxFeeError,
  maxFeePerGasToUse,
) => {
  if (maxFeeError || !isFeeMarketGasEstimate) return undefined;
  if (
    !isGasEstimatesLoading &&
    bnLessThan(maxFeePerGasToUse, gasFeeEstimates?.low?.suggestedMaxFeePerGas)
  )
    return GAS_FORM_ERRORS.MAX_FEE_TOO_LOW;
  if (
    gasFeeEstimates?.high &&
    bnGreaterThan(
      maxFeePerGasToUse,
      gasFeeEstimates.high.suggestedMaxFeePerGas * HIGH_FEE_WARNING_MULTIPLIER,
    )
  ) {
    return GAS_FORM_ERRORS.MAX_FEE_HIGH_WARNING;
  }
  return undefined;
};

const getBalanceError = (minimumCostInHexWei, transaction, ethBalance) => {
  const minimumTxCostInHexWei = addHexes(
    minimumCostInHexWei,
    transaction?.txParams?.value || '0x0',
  );

  return conversionGreaterThan(
    { value: minimumTxCostInHexWei, fromNumericBase: 'hex' },
    { value: ethBalance, fromNumericBase: 'hex' },
  );
};

export function useGasFeeInputsErrors(
  transaction,
  gasLimit,
  gasPriceToUse,
  maxPriorityFeePerGasToUse,
  maxFeePerGasToUse,
  minimumCostInHexWei,
  minimumGasLimit,
) {
  const networkAndAccountSupports1559 = useSelector(
    checkNetworkAndAccountSupports1559,
  );
  const {
    gasEstimateType,
    gasFeeEstimates,
    isGasEstimatesLoading,
  } = useGasFeeEstimates();
  const isFeeMarketGasEstimate =
    gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET;

  // Get all errors
  const gasLimitError = validateGasLimit(gasLimit, minimumGasLimit);
  const maxPriorityFeeError = validateMaxPriorityFee(
    isFeeMarketGasEstimate,
    maxPriorityFeePerGasToUse,
    networkAndAccountSupports1559,
  );
  const maxFeeError = validateMaxFee(
    isFeeMarketGasEstimate,
    maxFeePerGasToUse,
    maxPriorityFeePerGasToUse,
    networkAndAccountSupports1559,
  );
  const gasPriceError = validateGasPrice(
    isFeeMarketGasEstimate,
    gasPriceToUse,
    networkAndAccountSupports1559,
    transaction,
  );

  // Get all warnings
  const maxPriorityFeeWarning = getMaxPriorityFeeWarning(
    gasFeeEstimates,
    isFeeMarketGasEstimate,
    isGasEstimatesLoading,
    maxPriorityFeeError,
    maxPriorityFeePerGasToUse,
  );
  const maxFeeWarning = getMaxFeeWarning(
    gasFeeEstimates,
    isGasEstimatesLoading,
    isFeeMarketGasEstimate,
    maxFeeError,
    maxFeePerGasToUse,
  );

  // Separating errors from warnings so we can know which value problems
  // are blocking or simply useful information for the users
  const gasErrors = useMemo(
    () => ({
      gasLimit: gasLimitError,
      maxPriorityFee: maxPriorityFeeError,
      maxFee: maxFeeError,
      gasPrice: gasPriceError,
    }),
    [gasLimitError, maxPriorityFeeError, maxFeeError, gasPriceError],
  );
  const gasWarnings = useMemo(
    () => ({
      maxPriorityFee: maxPriorityFeeWarning,
      maxFee: maxFeeWarning,
    }),
    [maxPriorityFeeWarning, maxFeeWarning],
  );
  const estimatesUnavailableWarning =
    networkAndAccountSupports1559 && !isFeeMarketGasEstimate;

  // Determine if we have any errors which should block submission
  const hasGasErrors = Boolean(Object.keys(gasErrors).length);

  // Combine the warnings and errors into one object for easier use within the UI.
  // This object should have no effect on whether or not the user can submit the form
  const errorsAndWarnings = useMemo(
    () => ({
      ...gasWarnings,
      ...gasErrors,
    }),
    [gasErrors, gasWarnings],
  );

  const { balance: ethBalance } = useSelector(getSelectedAccount);
  const balanceError = getBalanceError(
    minimumCostInHexWei,
    transaction,
    ethBalance,
  );

  return {
    gasErrors: errorsAndWarnings,
    hasGasErrors,
    gasWarnings,
    balanceError,
    estimatesUnavailableWarning,
  };
}

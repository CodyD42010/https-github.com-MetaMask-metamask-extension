import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { PRIORITY_LEVELS } from '../../../shared/constants/gas';
import {
  decGWEIToHexWEI,
  decimalToHex,
} from '../../helpers/utils/conversions.util';
import { updateTransaction as updateTransactionFn } from '../../store/actions';

export const useTransactionFunctions = ({
  defaultEstimateToUse,
  gasLimit,
  gasFeeEstimates,
  transaction,
}) => {
  const dispatch = useDispatch();

  const updateTransaction = useCallback(
    (estimateUsed, maxFeePerGas, maxPriorityFeePerGas) => {
      const newGasSettings = {
        gas: decimalToHex(gasLimit),
        gasLimit: decimalToHex(gasLimit),
        estimateSuggested: defaultEstimateToUse,
        estimateUsed,
        maxFeePerGas,
        maxPriorityFeePerGas,
      };

      const updatedTxMeta = {
        ...transaction,
        userFeeLevel: estimateUsed || 'custom',
        txParams: {
          ...transaction.txParams,
          ...newGasSettings,
        },
      };

      dispatch(updateTransactionFn(updatedTxMeta));
    },
    [defaultEstimateToUse, dispatch, gasLimit, transaction],
  );

  const updateTransactionUsingGasFeeEstimates = useCallback(
    (gasFeeEstimateToUse) => {
      if (gasFeeEstimateToUse === PRIORITY_LEVELS.DAPP_SUGGESTED) {
        const {
          maxFeePerGas,
          maxPriorityFeePerGas,
        } = transaction?.dappSuggestedGasFees;
        updateTransaction(
          PRIORITY_LEVELS.CUSTOM,
          maxFeePerGas,
          maxPriorityFeePerGas,
        );
      } else {
        const {
          suggestedMaxFeePerGas,
          suggestedMaxPriorityFeePerGas,
        } = gasFeeEstimates[gasFeeEstimateToUse];
        updateTransaction(
          gasFeeEstimateToUse,
          decGWEIToHexWEI(suggestedMaxFeePerGas),
          decGWEIToHexWEI(suggestedMaxPriorityFeePerGas),
        );
      }
    },
    [gasFeeEstimates, transaction?.dappSuggestedGasFees, updateTransaction],
  );

  return { updateTransactionUsingGasFeeEstimates };
};

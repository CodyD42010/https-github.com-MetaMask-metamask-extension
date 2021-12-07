import React from 'react';

import { PRIORITY_LEVELS } from '../../../../../shared/constants/gas';
import { useTransactionModalContext } from '../../../../contexts/transaction-modal';
import { useGasFeeContext } from '../../../../contexts/gasFee';
import Button from '../../../ui/button';
import I18nValue from '../../../ui/i18n-value';

import { useAdvancedGasFeePopoverContext } from '../context';
import { decGWEIToHexWEI } from '../../../../../shared/modules/conversion.utils';

const AdvancedGasFeeSaveButton = () => {
  const { closeModal } = useTransactionModalContext();
  const { updateTransaction } = useGasFeeContext();
  const {
    isDirty,
    gasLimit,
    hasError,
    maxFeePerGas,
    maxPriorityFeePerGas,
  } = useAdvancedGasFeePopoverContext();

  const onSave = () => {
    updateTransaction({
      estimateUsed: PRIORITY_LEVELS.CUSTOM,
      maxFeePerGas: decGWEIToHexWEI(maxFeePerGas),
      maxPriorityFeePerGas: decGWEIToHexWEI(maxPriorityFeePerGas),
      gasLimit,
    });
    closeModal('advancedGasFee');
  };

  return (
    <Button type="primary" disabled={!isDirty || hasError} onClick={onSave}>
      <I18nValue messageKey="save" />
    </Button>
  );
};

export default AdvancedGasFeeSaveButton;

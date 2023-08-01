import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { useTransactionEventFragment } from '../../../../hooks/useTransactionEventFragment';
import { EditGasModes } from '../../../../../shared/constants/gas';

import {
  Display,
  FlexDirection,
} from '../../../../helpers/constants/design-system';
import { getAdvancedGasFeeValues } from '../../../../selectors';
import { setAdvancedGasFee } from '../../../../store/actions';
import { useGasFeeContext } from '../../../../contexts/gasFee';
import { useAdvancedGasFeePopoverContext } from '../context';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import { Checkbox, Box } from '../../../component-library';

const AdvancedGasFeeDefaults = () => {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const { gasErrors, maxBaseFee, maxPriorityFeePerGas } =
    useAdvancedGasFeePopoverContext();
  const advancedGasFeeValues = useSelector(getAdvancedGasFeeValues);
  const { updateTransactionEventFragment } = useTransactionEventFragment();
  const { editGasMode } = useGasFeeContext();
  const [isDefaultSettingsSelected, setDefaultSettingsSelected] = useState(
    Boolean(advancedGasFeeValues) &&
      advancedGasFeeValues.maxBaseFee === maxBaseFee &&
      advancedGasFeeValues.priorityFee === maxPriorityFeePerGas,
  );

  useEffect(() => {
    setDefaultSettingsSelected(
      Boolean(advancedGasFeeValues) &&
        advancedGasFeeValues.maxBaseFee === maxBaseFee &&
        advancedGasFeeValues.priorityFee === maxPriorityFeePerGas,
    );
  }, [advancedGasFeeValues, maxBaseFee, maxPriorityFeePerGas]);

  const handleUpdateDefaultSettings = () => {
    if (isDefaultSettingsSelected) {
      dispatch(setAdvancedGasFee(null));
      setDefaultSettingsSelected(false);
      updateTransactionEventFragment({
        properties: {
          advanced_gas_defaults_updated_maxbasefee: null,
          advanced_gas_defaults_updated_priorityfee: null,
        },
      });
    } else {
      dispatch(
        setAdvancedGasFee({
          maxBaseFee,
          priorityFee: maxPriorityFeePerGas,
        }),
      );
      updateTransactionEventFragment({
        properties: {
          advanced_gas_defaults_updated_maxbasefee: maxBaseFee,
          advanced_gas_defaults_updated_priorityfee: maxPriorityFeePerGas,
        },
      });
    }
  };

  if (editGasMode === EditGasModes.swaps) {
    return null;
  }

  return (
    <Box
      display={Display.Flex}
      flexDirection={FlexDirection.Row}
      marginTop={4}
      marginLeft={2}
      marginRight={2}
      paddingTop={4}
      paddingBottom={4}
      className="advanced-gas-fee-defaults"
    >
      <Checkbox
        isChecked={isDefaultSettingsSelected}
        onChange={handleUpdateDefaultSettings}
        isDisabled={gasErrors.maxFeePerGas || gasErrors.maxPriorityFeePerGas}
        label={
          isDefaultSettingsSelected
            ? t('advancedGasFeeDefaultOptOut')
            : t('advancedGasFeeDefaultOptIn', [
                <strong key="default-value-change">{t('newValues')}</strong>,
              ])
        }
      />
    </Box>
  );
};

export default AdvancedGasFeeDefaults;

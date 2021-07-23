import React, { useCallback, useContext, useState } from 'react';
import PropTypes from 'prop-types';

import { useDispatch, useSelector } from 'react-redux';
import { useGasFeeInputs } from '../../../hooks/useGasFeeInputs';
import { useShouldAnimateGasEstimations } from '../../../hooks/useShouldAnimateGasEstimations';

import { isEIP1559Network } from '../../../ducks/metamask/metamask';
import {
  GAS_ESTIMATE_TYPES,
  EDIT_GAS_MODES,
} from '../../../../shared/constants/gas';

import {
  decGWEIToHexWEI,
  decimalToHex,
  hexToDecimal,
} from '../../../helpers/utils/conversions.util';

import Popover from '../../ui/popover';
import Button from '../../ui/button';
import EditGasDisplay from '../edit-gas-display';
import EditGasDisplayEducation from '../edit-gas-display-education';

import { I18nContext } from '../../../contexts/i18n';
import {
  createCancelTransaction,
  createSpeedUpTransaction,
  hideModal,
  hideSidebar,
  updateTransaction,
  updateCustomSwapsEIP1559GasParams,
} from '../../../store/actions';
import LoadingHeartBeat from '../../ui/loading-heartbeat';

export default function EditGasPopover({
  popoverTitle = '',
  confirmButtonText = '',
  editGasDisplayProps = {},
  defaultEstimateToUse = 'medium',
  transaction,
  mode,
  onClose,
  minimumGasLimit,
}) {
  const t = useContext(I18nContext);
  const dispatch = useDispatch();
  const showSidebar = useSelector((state) => state.appState.sidebar.isOpen);
  const networkSupports1559 = useSelector(isEIP1559Network);

  const shouldAnimate = useShouldAnimateGasEstimations();

  const showEducationButton =
    mode === EDIT_GAS_MODES.MODIFY_IN_PLACE && networkSupports1559;
  const [showEducationContent, setShowEducationContent] = useState(false);

  const [warning] = useState(null);

  const [
    dappSuggestedGasFeeAcknowledged,
    setDappSuggestedGasFeeAcknowledged,
  ] = useState(false);

  const minimumGasLimitDec = hexToDecimal(minimumGasLimit);

  const {
    maxPriorityFeePerGas,
    setMaxPriorityFeePerGas,
    maxPriorityFeePerGasFiat,
    maxFeePerGas,
    setMaxFeePerGas,
    maxFeePerGasFiat,
    estimatedMaximumNative,
    isGasEstimatesLoading,
    gasFeeEstimates,
    gasEstimateType,
    gasPrice,
    setGasPrice,
    gasLimit,
    setGasLimit,
    estimateToUse,
    setEstimateToUse,
    estimatedMinimumFiat,
    estimatedMaximumFiat,
    hasGasErrors,
    gasErrors,
    onManualChange,
  } = useGasFeeInputs(defaultEstimateToUse, transaction, minimumGasLimit, mode);

  const [showAdvancedForm, setShowAdvancedForm] = useState(
    !estimateToUse || hasGasErrors,
  );

  /**
   * Temporary placeholder, this should be managed by the parent component but
   * we will be extracting this component from the hard to maintain modal/
   * sidebar component. For now this is just to be able to appropriately close
   * the modal in testing
   */
  const closePopover = useCallback(() => {
    if (onClose) {
      onClose();
    } else if (showSidebar) {
      dispatch(hideSidebar());
    } else {
      dispatch(hideModal());
    }
  }, [showSidebar, onClose, dispatch]);

  const onSubmit = useCallback(() => {
    if (!transaction || !mode) {
      closePopover();
    }

    const newGasSettings =
      gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET
        ? {
            gas: decimalToHex(gasLimit),
            gasLimit: decimalToHex(gasLimit),
            maxFeePerGas: decGWEIToHexWEI(maxFeePerGas),
            maxPriorityFeePerGas: decGWEIToHexWEI(maxPriorityFeePerGas),
          }
        : {
            gas: decimalToHex(gasLimit),
            gasLimit: decimalToHex(gasLimit),
            gasPrice: decGWEIToHexWEI(gasPrice),
          };

    switch (mode) {
      case EDIT_GAS_MODES.CANCEL:
        dispatch(createCancelTransaction(transaction.id, newGasSettings));
        break;
      case EDIT_GAS_MODES.SPEED_UP:
        dispatch(createSpeedUpTransaction(transaction.id, newGasSettings));
        break;
      case EDIT_GAS_MODES.MODIFY_IN_PLACE:
        dispatch(
          updateTransaction({
            ...transaction,
            txParams: {
              ...transaction.txParams,
              ...newGasSettings,
            },
          }),
        );
        break;
      case EDIT_GAS_MODES.SWAPS:
        // This popover component should only be used for the "FEE_MARKET" type in Swaps.
        if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
          dispatch(updateCustomSwapsEIP1559GasParams(newGasSettings));
        }
        break;
      default:
        break;
    }

    closePopover();
  }, [
    transaction,
    mode,
    dispatch,
    closePopover,
    gasLimit,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasEstimateType,
  ]);

  let title = t('editGasTitle');
  if (popoverTitle) {
    title = popoverTitle;
  } else if (showEducationContent) {
    title = t('editGasEducationModalTitle');
  } else if (mode === EDIT_GAS_MODES.SPEED_UP) {
    title = t('speedUpPopoverTitle');
  } else if (mode === EDIT_GAS_MODES.CANCEL) {
    title = t('cancelPopoverTitle');
  }

  const footerButtonText = confirmButtonText || t('save');

  return (
    <Popover
      title={title}
      onClose={closePopover}
      onBack={
        showEducationContent ? () => setShowEducationContent(false) : undefined
      }
      footer={
        showEducationContent ? null : (
          <>
            <Button
              type="primary"
              onClick={onSubmit}
              disabled={hasGasErrors || isGasEstimatesLoading}
            >
              {footerButtonText}
            </Button>
          </>
        )
      }
    >
      <div style={{ padding: '0 20px 20px 20px', position: 'relative' }}>
        {showEducationContent ? (
          <EditGasDisplayEducation />
        ) : (
          <>
            <LoadingHeartBeat active={shouldAnimate} />
            <EditGasDisplay
              showEducationButton={showEducationButton}
              warning={warning}
              showAdvancedForm={showAdvancedForm}
              setShowAdvancedForm={setShowAdvancedForm}
              dappSuggestedGasFeeAcknowledged={dappSuggestedGasFeeAcknowledged}
              setDappSuggestedGasFeeAcknowledged={
                setDappSuggestedGasFeeAcknowledged
              }
              maxPriorityFeePerGas={maxPriorityFeePerGas}
              setMaxPriorityFeePerGas={setMaxPriorityFeePerGas}
              maxPriorityFeePerGasFiat={maxPriorityFeePerGasFiat}
              maxFeePerGas={maxFeePerGas}
              setMaxFeePerGas={setMaxFeePerGas}
              maxFeePerGasFiat={maxFeePerGasFiat}
              estimatedMaximumNative={estimatedMaximumNative}
              isGasEstimatesLoading={isGasEstimatesLoading}
              gasFeeEstimates={gasFeeEstimates}
              gasEstimateType={gasEstimateType}
              gasPrice={gasPrice}
              setGasPrice={setGasPrice}
              gasLimit={gasLimit}
              setGasLimit={setGasLimit}
              estimateToUse={estimateToUse}
              setEstimateToUse={setEstimateToUse}
              estimatedMinimumFiat={estimatedMinimumFiat}
              estimatedMaximumFiat={estimatedMaximumFiat}
              onEducationClick={() => setShowEducationContent(true)}
              mode={mode}
              transaction={transaction}
              gasErrors={gasErrors}
              onManualChange={onManualChange}
              minimumGasLimit={minimumGasLimitDec}
              {...editGasDisplayProps}
            />
          </>
        )}
      </div>
    </Popover>
  );
}

EditGasPopover.propTypes = {
  popoverTitle: PropTypes.string,
  editGasDisplayProps: PropTypes.object,
  confirmButtonText: PropTypes.string,
  onClose: PropTypes.func,
  transaction: PropTypes.object,
  mode: PropTypes.oneOf(Object.values(EDIT_GAS_MODES)),
  defaultEstimateToUse: PropTypes.string,
  minimumGasLimit: PropTypes.string,
};

import { ConfirmInfoRowType } from '../../../../../../components/app/confirm/info/info';

const personalSignInfoSelector = (state) => {
  const { currentConfirmation } = state.confirm;

  return [
    {
      label: 'request_from',
      type: ConfirmInfoRowType.UrlType,
      rowProps: {
        url: currentConfirmation.msgParams?.origin,
        tooltip: 'this is some dummy tooltip',
      },
    },
  ];
};

const contractDeploymentInfoSelector = (state) => {
  const { currentConfirmation } = state.confirm;

  return [
    {
      label: 'request_from',
      type: ConfirmInfoRowType.UrlType,
      rowProps: {
        url: currentConfirmation.origin,
        tooltip: 'this is some dummy tooltip',
      },
    },
    {
      label: 'sender',
      type: ConfirmInfoRowType.Text,
      rowProps: {
        text: currentConfirmation.txParams?.from,
      },
    },
    {
      label: 'default_gas_estimates',
      type: ConfirmInfoRowType.Text,
      rowProps: {
        text: currentConfirmation.defaultGasEstimates.estimateType,
      },
    },
    {
      label: 'maxFeePerGas',
      type: ConfirmInfoRowType.Text,
      rowProps: {
        text: currentConfirmation.txParams?.maxFeePerGas,
      },
    },
    {
      label: 'maxPriorityFeePerGas',
      type: ConfirmInfoRowType.Text,
      rowProps: {
        text: currentConfirmation.txParams?.maxPriorityFeePerGas,
      },
    },
  ];
};

const confirmTypeInfoSelectorMap = {
  personal_sign: personalSignInfoSelector,
  contractDeployment: contractDeploymentInfoSelector,
};

export const confirmationInfoSelector = (state) => {
  const { currentConfirmation } = state.confirm;

  if (!currentConfirmation) {
    return undefined;
  }

  return confirmTypeInfoSelectorMap[currentConfirmation.type](state);
};

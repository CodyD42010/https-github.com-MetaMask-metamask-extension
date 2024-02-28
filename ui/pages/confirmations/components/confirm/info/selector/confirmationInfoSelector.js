import { parseStandardTokenTransactionData } from '../../../../../../../shared/modules/transaction.utils';
import { ConfirmInfoRowType } from '../../../../../../components/app/confirm/info/info';
import { getSelectedAccountCachedBalance } from '../../../../../../selectors';

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

const simpleSendInfoSelector = (state) => {
  const { currentConfirmation } = state.confirm;
  const balance = getSelectedAccountCachedBalance(state);

  return [
    {
      label: 'Request From',
      type: ConfirmInfoRowType.UrlType,
      rowProps: {
        url: currentConfirmation.origin,
        tooltip: 'this is some dummy tooltip',
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
      label: 'User balance',
      type: ConfirmInfoRowType.Text,
      rowProps: {
        text: balance,
      },
    },
    {
      label: 'Amount',
      type: ConfirmInfoRowType.Text,
      rowProps: {
        text: currentConfirmation.txParams?.value,
      },
    },
  ];
};

const approveInfoSelector = (state) => {
  const { currentConfirmation } = state.confirm;
  const tokenData = parseStandardTokenTransactionData(
    currentConfirmation.txParams?.data,
  );

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
      label: 'Amount',
      type: ConfirmInfoRowType.Text,
      rowProps: {
        text: currentConfirmation.txParams?.value,
      },
    },
    {
      label: 'token',
      type: ConfirmInfoRowType.Text,
      rowProps: {
        text: JSON.stringify(tokenData),
      },
    },
  ];
};

const confirmTypeInfoSelectorMap = {
  personal_sign: personalSignInfoSelector,
  contractDeployment: contractDeploymentInfoSelector,
  simpleSend: simpleSendInfoSelector,
  approve: approveInfoSelector,
};

export const confirmationInfoSelector = (state) => {
  const { currentConfirmation } = state.confirm;

  if (!currentConfirmation) {
    return undefined;
  }

  return confirmTypeInfoSelectorMap[currentConfirmation.type]?.(state) ?? {};
};

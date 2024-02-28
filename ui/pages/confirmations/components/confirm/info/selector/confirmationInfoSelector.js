import React from 'react';
import { parseStandardTokenTransactionData } from '../../../../../../../shared/modules/transaction.utils';
import {
  ConfirmInfoRowText,
  ConfirmInfoRowUrl,
} from '../../../../../../components/app/confirm/info/row';
import { getSelectedAccountCachedBalance } from '../../../../../../selectors';

const personalSignInfoSelector = (state, t) => {
  const { currentConfirmation } = state.confirm;

  return [
    <ConfirmInfoRowUrl
      key="request_from"
      label={t('request_from')}
      url={currentConfirmation.msgParams?.origin}
      tooltip="this is some dummy tooltip"
    />,
  ];
};

const contractDeploymentInfoSelector = (state, t) => {
  const { currentConfirmation } = state.confirm;

  return [
    <ConfirmInfoRowUrl
      key="request_from"
      label={t('request_from')}
      url={currentConfirmation.origin}
      tooltip="this is some dummy tooltip"
    />,
    <ConfirmInfoRowText
      key="sender"
      label={t('sender')}
      text={currentConfirmation.txParams?.from}
    />,
    <ConfirmInfoRowText
      key="default_gas_estimates"
      label={t('default_gas_estimates')}
      text={currentConfirmation.defaultGasEstimates.estimateType}
    />,
    <ConfirmInfoRowText
      key="maxFeePerGas"
      label={t('maxFeePerGas')}
      text={currentConfirmation.txParams?.maxFeePerGas}
      confirmation_id={currentConfirmation.id}
    />,
    <ConfirmInfoRowText
      key="maxPriorityFeePerGas"
      label={t('maxPriorityFeePerGas')}
      text={currentConfirmation.txParams?.maxPriorityFeePerGas}
      confirmation_id={currentConfirmation.id}
    />,
  ];
};

const simpleSendInfoSelector = (state, t) => {
  const { currentConfirmation } = state.confirm;
  const balance = getSelectedAccountCachedBalance(state);

  return [
    <ConfirmInfoRowUrl
      key="request_from"
      label={t('request_from')}
      text={currentConfirmation.origin}
      tooltip="this is some dummy tooltip"
    />,
    <ConfirmInfoRowText
      key="maxFeePerGas"
      label={t('maxFeePerGas')}
      text={currentConfirmation.txParams?.maxFeePerGas}
      confirmation_id={currentConfirmation.id}
    />,
    <ConfirmInfoRowText
      key="sender"
      label={t('sender')}
      text={currentConfirmation.txParams?.from}
    />,
    <ConfirmInfoRowText
      key="default_gas_estimates"
      label={t('default_gas_estimates')}
      text={currentConfirmation.defaultGasEstimates.estimateType}
    />,
    <ConfirmInfoRowText
      key="user_balance"
      label={t('user_balance')}
      text={balance}
    />,
    <ConfirmInfoRowText
      key="amount"
      label={t('amount')}
      text={currentConfirmation.txParams?.value}
      confirmation_id={currentConfirmation.id}
    />,
  ];
};

const approveInfoSelector = (state, t) => {
  const { currentConfirmation } = state.confirm;
  const tokenData = parseStandardTokenTransactionData(
    currentConfirmation.txParams?.data,
  );

  return [
    <ConfirmInfoRowUrl
      key="request_from"
      label={t('request_from')}
      url={currentConfirmation.origin}
      tooltip="this is some dummy tooltip"
    />,
    <ConfirmInfoRowText
      key="sender"
      label={t('sender')}
      text={currentConfirmation.txParams?.from}
    />,
    <ConfirmInfoRowText
      key="amount"
      label={t('amount')}
      text={currentConfirmation.txParams?.value}
      confirmation_id={currentConfirmation.id}
    />,
    <ConfirmInfoRowText
      key="token"
      label={t('token')}
      text={JSON.stringify(tokenData)}
    />,
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

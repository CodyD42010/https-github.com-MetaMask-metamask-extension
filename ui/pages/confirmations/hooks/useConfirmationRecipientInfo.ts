import { useSelector } from 'react-redux';

import {
  accountsWithSendEtherInfoSelector,
  currentConfirmationSelector,
} from '../../../selectors';
import { getAccountByAddress } from '../../../helpers/utils/util';

function useConfirmationRecipientInfo() {
  const currentConfirmation = useSelector(currentConfirmationSelector);
  const allAccounts = useSelector(accountsWithSendEtherInfoSelector);

  let recipientAddress = '';
  let recipientName = '';

  if (currentConfirmation) {
    if (currentConfirmation.type === 'personal_sign') {
      const { msgParams } = currentConfirmation;
      // url for all signature requests
      if (msgParams) {
        recipientAddress = msgParams.from;
      }
    } else {
      const { txParams } = currentConfirmation as any;
      // url for rest of transactions
      if (txParams) {
        recipientAddress = txParams.from;
      }
    }

    if (recipientAddress) {
      const fromAccount = getAccountByAddress(allAccounts, recipientAddress);
      recipientName = fromAccount?.name;
    }
    // TODO: as we add support for more transaction code to find recipient address for different
    // transaction types will come here
  }

  return {
    recipientAddress,
    recipientName,
  };
}

export default useConfirmationRecipientInfo;

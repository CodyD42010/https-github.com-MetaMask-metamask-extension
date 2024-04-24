import { useSelector } from 'react-redux';
import { getAccountByAddress } from '../../../helpers/utils/util';
import {
  accountsWithSendEtherInfoSelector,
  currentConfirmationSelector,
} from '../../../selectors';
import { getConfirmationSender } from '../components/confirm/utils';
import { Confirmation } from '../types/confirm';

function useConfirmationRecipientInfo() {
  const currentConfirmation = useSelector(
    currentConfirmationSelector,
  ) as Confirmation;

  let senderAddress, senderName;
  if (currentConfirmation) {
    const { from } = getConfirmationSender(currentConfirmation);
    const allAccounts = useSelector(accountsWithSendEtherInfoSelector);
    const fromAccount = getAccountByAddress(allAccounts, senderAddress);

    senderAddress = from;
    senderName = fromAccount?.metadata?.name;
  }

  return {
    senderAddress: senderAddress || '',
    senderName: senderName || '',
  };
}

export default useConfirmationRecipientInfo;

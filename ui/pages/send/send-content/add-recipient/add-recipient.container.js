import { connect } from 'react-redux';
import {
  getAddressBook,
  getAddressBookEntry,
  getMetaMaskAccountsOrdered,
  getCurrentNetworkTransactions,
} from '../../../../selectors';

import {
  updateRecipient,
  updateRecipientUserInput,
  useMyAccountsForRecipientSearch,
  useContactListForRecipientSearch,
  getRecipientUserInput,
  getRecipient,
  addHistoryEntry,
} from '../../../../ducks/send';
import {
  getDomainResolution,
  getDomainError,
  getDomainWarning,
  ///: BEGIN:ONLY_INCLUDE_IN(build-flask)
  getResolvingSnap,
  getDomainType,
  ///: END:ONLY_INCLUDE_IN
} from '../../../../ducks/domains';
import AddRecipient from './add-recipient.component';

export default connect(mapStateToProps, mapDispatchToProps)(AddRecipient);

function mapStateToProps(state) {
  const domainResolution = getDomainResolution(state);
  ///: BEGIN:ONLY_INCLUDE_IN(build-flask)
  const resolvingSnap = getResolvingSnap(state);
  const domainType = getDomainType(state);
  ///: END:ONLY_INCLUDE_IN
  let addressBookEntryName = '';
  if (domainResolution) {
    const addressBookEntry = getAddressBookEntry(state, domainResolution) || {};
    addressBookEntryName = addressBookEntry.name;
  }

  const addressBook = getAddressBook(state);

  const txList = [...getCurrentNetworkTransactions(state)].reverse();

  const nonContacts = addressBook
    .filter(({ name }) => !name)
    .map((nonContact) => {
      const nonContactTx = txList.find(
        (transaction) =>
          transaction.txParams.to === nonContact.address.toLowerCase(),
      );
      return { ...nonContact, timestamp: nonContactTx?.time };
    });

  nonContacts.sort((a, b) => {
    return b.timestamp - a.timestamp;
  });

  const ownedAccounts = getMetaMaskAccountsOrdered(state);

  return {
    addressBook,
    addressBookEntryName,
    contacts: addressBook.filter(({ name }) => Boolean(name)),
    domainResolution,
    domainError: getDomainError(state),
    domainWarning: getDomainWarning(state),
    nonContacts,
    ownedAccounts,
    userInput: getRecipientUserInput(state),
    recipient: getRecipient(state),
    ///: BEGIN:ONLY_INCLUDE_IN(build-flask)
    resolvingSnap,
    domainType,
    ///: END:ONLY_INCLUDE_IN
  };
}

function mapDispatchToProps(dispatch) {
  return {
    addHistoryEntry: (entry) => dispatch(addHistoryEntry(entry)),
    updateRecipient: ({ address, nickname }) =>
      dispatch(updateRecipient({ address, nickname })),
    updateRecipientUserInput: (newInput) =>
      dispatch(updateRecipientUserInput(newInput)),
    useMyAccountsForRecipientSearch: () =>
      dispatch(useMyAccountsForRecipientSearch()),
    useContactListForRecipientSearch: () =>
      dispatch(useContactListForRecipientSearch()),
  };
}

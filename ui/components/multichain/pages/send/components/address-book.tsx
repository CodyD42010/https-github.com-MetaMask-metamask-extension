import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Fuse from 'fuse.js';
import { Box, Text } from '../../../../component-library';
import { I18nContext } from '../../../../../contexts/i18n';
import ContactList from '../../../../app/contact-list';
import {
  getAddressBook,
  getCurrentNetworkTransactions,
} from '../../../../../selectors';
import {
  addHistoryEntry,
  getRecipientUserInput,
  updateRecipient,
  updateRecipientUserInput,
} from '../../../../../ducks/send';
import {
  FontWeight,
  TextAlign,
  TextColor,
} from '../../../../../helpers/constants/design-system';
import { CONTACT_LIST_ROUTE } from '../../../../../helpers/constants/routes';
import { SendPageRow } from '.';

export const SendPageAddressBook = () => {
  const t = useContext(I18nContext);
  const dispatch = useDispatch();

  const addressBook = useSelector(getAddressBook);
  const contacts = addressBook.filter(({ name }) => Boolean(name));
  const currentNetworkTransactions = useSelector(getCurrentNetworkTransactions);

  const txList = [...currentNetworkTransactions].reverse();
  const nonContacts = addressBook
    .filter(({ name }) => !name)
    .map((nonContact) => {
      const nonContactTx = txList.find(
        (transaction) =>
          transaction.txParams.to === nonContact.address.toLowerCase(),
      );
      return { ...nonContact, timestamp: nonContactTx?.time };
    });

  const userInput = useSelector(getRecipientUserInput);
  const contactFuse = new Fuse(contacts, {
    shouldSort: true,
    threshold: 0.45,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 1,
    keys: [
      { name: 'name', weight: 0.5 },
      { name: 'address', weight: 0.5 },
    ],
  });

  const recentFuse = new Fuse(nonContacts, {
    shouldSort: true,
    threshold: 0.45,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 1,
    keys: [{ name: 'address', weight: 0.5 }],
  });

  const searchForContacts = () => {
    if (userInput) {
      contactFuse.setCollection(contacts);
      return contactFuse.search(userInput);
    }

    return contacts;
  };

  const searchForRecents = () => {
    if (userInput) {
      recentFuse.setCollection(nonContacts);
      return recentFuse.search(userInput);
    }

    return nonContacts;
  };

  const noContactsLink = (
    <a href={`#${CONTACT_LIST_ROUTE}`}>{t('sendNoContactsConversionText')}</a>
  );

  const selectRecipient = (
    address = '',
    nickname = '',
    type = 'user input',
  ) => {
    dispatch(
      addHistoryEntry(
        `sendFlow - User clicked recipient from ${type}. address: ${address}, nickname ${nickname}`,
      ),
    );
    dispatch(updateRecipient({ address, nickname }));
    dispatch(updateRecipientUserInput(address));
  };

  return (
    <SendPageRow>
      {addressBook.length ? (
        <>
          <ContactList
            addressBook={addressBook}
            searchForContacts={searchForContacts}
            searchForRecents={searchForRecents}
            selectRecipient={(address = '', name = '') => {
              selectRecipient(
                address,
                name,
                `${name ? 'contact' : 'recent'} list`,
              );
            }}
          />
        </>
      ) : (
        <Box padding={6} textAlign={TextAlign.Center}>
          <Text marginBottom={4} fontWeight={FontWeight.Bold}>
            {t('sendNoContactsTitle')}
          </Text>
          <Text color={TextColor.textAlternative}>
            {t('sendNoContactsDescription', [noContactsLink])}
          </Text>
        </Box>
      )}
    </SendPageRow>
  );
};

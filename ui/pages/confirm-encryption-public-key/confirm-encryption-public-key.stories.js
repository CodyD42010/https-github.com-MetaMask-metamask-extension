import React, { useEffect } from 'react';
import { select } from '@storybook/addon-knobs';

import { store } from '../../../.storybook/preview';
import { updateMetamaskState } from '../../store/actions';
import ConfirmEncryptionPublicKey from '.';

export default {
  title: 'Confirmation Screens',
};

const PageSet = ({ children }) => {
  const state = store.getState();
  const options = [];
  const { identities, unapprovedEncryptionPublicKeyMsgs } = state.metamask;
  Object.keys(identities).forEach(function (key) {
    options.push({
      label: identities[key].name,
      name: identities[key].name,
      address: key,
    });
  });
  const account = select('Account', options, options[0]);

  useEffect(() => {
    unapprovedEncryptionPublicKeyMsgs['7786962153682822'].msgParams =
      account.address;
    const state = store.getState();
    const newState = Object.assign(state.metamask, { unapprovedEncryptionPublicKeyMsgs })
    store.dispatch(
      updateMetamaskState(newState),
    );

  }, [account, unapprovedEncryptionPublicKeyMsgs]);

  return children;
};

export const ConfirmEncryption = () => {
  return (
    <PageSet>
      <ConfirmEncryptionPublicKey />
    </PageSet>
  );
};

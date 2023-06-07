/* eslint-disable react/prop-types */
import React from 'react';
import { Provider } from 'react-redux';
import { pendingAssetApprovals as mockPendingAssetApprovals } from '../../../.storybook/initial-states/approval-screens/add-suggested-token';

import configureStore from '../../store/store';

import mockState from '../../../.storybook/test-data';

import ConfirmAddSuggestedToken from '.';

const store = configureStore({
  metamask: {
    ...mockState.metamask,
    pendingApprovals: [...mockPendingAssetApprovals],
    tokens: [],
  },
});

export default {
  title: 'Pages/ConfirmAddSuggestedToken',
  decorators: [(story) => <Provider store={store}>{story()}</Provider>],
};

export const DefaultStory = () => <ConfirmAddSuggestedToken />;
DefaultStory.storyName = 'Default';

export const WithDuplicateAddress = () => <ConfirmAddSuggestedToken />;
const WithDuplicateAddressStore = configureStore({
  metamask: {
    ...mockState.metamask,
    pendingApprovals: [...mockPendingAssetApprovals],
    tokens: [
      {
        ...mockPendingAssetApprovals[0].requestData.asset,
      },
    ],
  },
});
WithDuplicateAddress.decorators = [
  (story) => <Provider store={WithDuplicateAddressStore}>{story()}</Provider>,
];

export const WithDuplicateSymbolAndDifferentAddress = () => (
  <ConfirmAddSuggestedToken />
);
const WithDuplicateSymbolAndDifferentAddressStore = configureStore({
  metamask: {
    ...mockState.metamask,
    pendingApprovals: [...mockPendingAssetApprovals],
    tokens: [
      {
        ...mockPendingAssetApprovals[0].requestData.asset,
        address: '0xNonSuggestedAddress',
      },
    ],
  },
});
WithDuplicateSymbolAndDifferentAddress.decorators = [
  (story) => (
    <Provider store={WithDuplicateSymbolAndDifferentAddressStore}>
      {story()}
    </Provider>
  ),
];

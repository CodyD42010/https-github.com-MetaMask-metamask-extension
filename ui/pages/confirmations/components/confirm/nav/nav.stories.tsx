import React from 'react';
import { Provider } from 'react-redux';

import mockState from '../../../../../../test/data/mock-state.json';
import configureStore from '../../../../../store/store';

import Nav from './nav';

const store = configureStore({
  metamask: {
    ...mockState.metamask,
    pendingApprovals: {
      testApprovalId: {
        id: 'testApprovalId',
        time: 1528133319641,
        origin: 'metamask',
        type: 'personal_sign',
        requestData: {
          txId: 'testTransactionId',
        },
        requestState: {
          test: 'value',
        },
      },
      testApprovalId2: {
        id: 'testApprovalId2',
        time: 1528133319641,
        origin: 'metamask',
        type: 'personal_sign',
        requestData: {
          txId: 'testTransactionId',
        },
        requestState: {
          test: 'value',
        },
      },
    },
  },
});

const Story = {
  title: 'Components/App/Confirm/Nav',
  component: Nav,
  decorators: [(story: any) => <Provider store={store}>{story()}</Provider>],
};

export default Story;

export const DefaultStory = () => <Nav />;

DefaultStory.storyName = 'Default';

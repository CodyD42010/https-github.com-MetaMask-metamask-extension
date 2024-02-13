import React from 'react';

import mockState from '../../../../../../test/data/mock-state.json';
import { fireEvent, renderWithProvider } from '../../../../../../test/jest';
import * as Actions from '../../../../../store/actions';
import configureStore from '../../../../../store/store';

import Nav from './nav';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
}));

const render = () => {
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

  return renderWithProvider(<Nav />, store);
};

describe('ConfirmNav', () => {
  it('should match snapshot', () => {
    const { container } = render();
    expect(container).toMatchSnapshot();
  });

  it('renders the "Reject all" Button', () => {
    const { getAllByRole, getByText } = render();
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(getByText('Reject all')).toBeInTheDocument();
  });

  it('invoke action rejectPendingApproval for all pending approvals when "Reject all" button is clicked', () => {
    const { getByRole } = render();
    const rejectAllButton = getByRole('button');
    const rejectSpy = jest
      .spyOn(Actions, 'rejectPendingApproval')
      .mockImplementation(() => ({} as any));
    fireEvent.click(rejectAllButton);
    expect(rejectSpy).toHaveBeenCalledTimes(2);
  });
});

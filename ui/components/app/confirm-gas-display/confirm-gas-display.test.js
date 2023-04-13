import React from 'react';
import { screen } from '@testing-library/react';

import { GasEstimateTypes } from '../../../../shared/constants/gas';
import mockEstimates from '../../../../test/data/mock-estimates.json';
import mockState from '../../../../test/data/mock-state.json';
import { renderWithProvider } from '../../../../test/jest';
import configureStore from '../../../store/store';

import { GasFeeContextProvider } from '../../../contexts/gasFee';
import ConfirmGasDisplay from './confirm-gas-display';

jest.mock('../../../store/actions', () => ({
  disconnectGasFeeEstimatePoller: jest.fn(),
  getGasFeeEstimatesAndStartPolling: jest
    .fn()
    .mockImplementation(() => Promise.resolve()),
  addPollingTokenToAppState: jest.fn(),
  getGasFeeTimeEstimate: jest.fn().mockImplementation(() => Promise.resolve()),
}));

const render = ({ transactionProp = {}, contextProps = {} } = {}) => {
  const store = configureStore({
    ...mockState,
    ...contextProps,
    metamask: {
      ...mockState.metamask,
      accounts: {
        [mockState.metamask.selectedAddress]: {
          address: mockState.metamask.selectedAddress,
          balance: '0x1F4',
        },
      },
      preferences: {
        useNativeCurrencyAsPrimaryCurrency: true,
      },
      gasFeeEstimates: mockEstimates[GasEstimateTypes.feeMarket],
    },
  });

  return renderWithProvider(
    <GasFeeContextProvider transaction={transactionProp}>
      <ConfirmGasDisplay />
    </GasFeeContextProvider>,
    store,
  );
};

describe('ConfirmGasDisplay', () => {
  it('should match snapshot', async () => {
    const { container } = render();
    expect(container).toMatchSnapshot();
  });
  it('should render gas display labels for EIP1559 transcations', () => {
    render({
      transactionProp: {
        txParams: {
          gas: '0x5208',
          maxFeePerGas: '0x59682f10',
          maxPriorityFeePerGas: '0x59682f00',
        },
        userFeeLevel: 'medium',
      },
    });
    expect(screen.queryByText('Gas')).toBeInTheDocument();
    expect(screen.queryByText('(estimated)')).toBeInTheDocument();
    expect(screen.queryByText('Max fee:')).toBeInTheDocument();
    expect(screen.queryAllByText('ETH').length).toBeGreaterThan(0);
  });
  it('should render gas display labels for legacy transcations', () => {
    render({
      contextProps: {
        metamask: {
          networkDetails: {
            EIPS: {
              1559: false,
            },
          },
        },
        confirmTransaction: {
          txData: {
            id: 8393540981007587,
            status: 'unapproved',
            chainId: '0x5',
            txParams: {
              from: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
              to: '0xc42edfcc21ed14dda456aa0756c153f7985d8813',
              value: '0x0',
              gas: '0x5208',
              gasPrice: '0x3b9aca00',
              type: '0x0',
            },
          },
        },
      },
    });
    expect(screen.queryByText('Estimated gas fee')).toBeInTheDocument();
    expect(screen.queryByText('Max fee:')).toBeInTheDocument();
    expect(screen.queryAllByText('ETH').length).toBeGreaterThan(0);
  });
});

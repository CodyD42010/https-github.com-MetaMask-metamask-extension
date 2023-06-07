import React from 'react';
import { act } from 'react-dom/test-utils';
import { ApprovalType } from '@metamask/controller-utils';
import { fireEvent, screen } from '@testing-library/react';
import {
  resolvePendingApproval,
  rejectPendingApproval,
} from '../../store/actions';
import configureStore from '../../store/store';
import { renderWithProvider } from '../../../test/jest/rendering';
import ConfirmAddSuggestedToken from '.';

const MOCK_SUGGESTED_ASSETS = [
  {
    id: 1,
    asset: {
      address: '0x8b175474e89094c44da98b954eedeac495271d0a',
      symbol: 'NEW',
      decimals: 18,
      image: 'metamark.svg',
      unlisted: false,
    },
  },
  {
    id: 2,
    asset: {
      address: '0xC8c77482e45F1F44dE1745F52C74426C631bDD51',
      symbol: '0XYX',
      decimals: 18,
      image: '0x.svg',
      unlisted: false,
    },
  },
];

const MOCK_PENDING_ASSET_APPROVALS = MOCK_SUGGESTED_ASSETS.map(
  (requestData) => {
    return {
      type: ApprovalType.WatchAsset,
      requestData,
    };
  },
);

const MOCK_TOKEN = {
  address: '0x108cf70c7d384c552f42c07c41c0e1e46d77ea0d',
  symbol: 'TEST',
  decimals: '0',
};

jest.mock('../../store/actions', () => ({
  resolvePendingApproval: jest.fn().mockReturnValue({ type: 'test' }),
  rejectPendingApproval: jest.fn().mockReturnValue({ type: 'test' }),
}));

const renderComponent = (tokens = []) => {
  const store = configureStore({
    metamask: {
      pendingApprovals: [...MOCK_PENDING_ASSET_APPROVALS],
      tokens,
      providerConfig: { chainId: '0x1' },
    },
    history: {
      mostRecentOverviewPage: '/',
    },
  });
  return renderWithProvider(<ConfirmAddSuggestedToken />, store);
};

describe('ConfirmAddSuggestedToken Component', () => {
  it('should render', () => {
    renderComponent();

    expect(screen.getByText('Add suggested tokens')).toBeInTheDocument();
    expect(
      screen.getByText('Would you like to import these tokens?'),
    ).toBeInTheDocument();
    expect(screen.getByText('Token')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add token' }),
    ).toBeInTheDocument();
  });

  it('should render the list of suggested tokens', () => {
    renderComponent();

    for (const { asset } of MOCK_SUGGESTED_ASSETS) {
      expect(screen.getByText(asset.symbol)).toBeInTheDocument();
    }
    expect(screen.getAllByRole('img')).toHaveLength(
      MOCK_SUGGESTED_ASSETS.length,
    );
  });

  it('should dispatch resolvePendingApproval when clicking the "Add token" button', async () => {
    renderComponent();
    const addTokenBtn = screen.getByRole('button', { name: 'Add token' });

    await act(async () => {
      fireEvent.click(addTokenBtn);
    });

    expect(resolvePendingApproval).toHaveBeenCalledTimes(
      MOCK_SUGGESTED_ASSETS.length,
    );

    MOCK_SUGGESTED_ASSETS.forEach(({ id }) => {
      expect(resolvePendingApproval).toHaveBeenCalledWith(id, null);
    });
  });

  it('should dispatch rejectPendingApproval when clicking the "Cancel" button', async () => {
    renderComponent();
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });

    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(rejectPendingApproval).toHaveBeenCalledTimes(
      MOCK_SUGGESTED_ASSETS.length,
    );

    MOCK_SUGGESTED_ASSETS.forEach(({ id }) => {
      expect(rejectPendingApproval).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          code: 4001,
          message: 'User rejected the request.',
          stack: expect.any(String),
        }),
      );
    });
  });

  describe('when the suggested token address matches an existing token address', () => {
    it('should show "already listed" warning', () => {
      const mockTokens = [
        {
          ...MOCK_TOKEN,
          address: MOCK_SUGGESTED_ASSETS[0].asset.address,
        },
      ];
      renderComponent(mockTokens);

      expect(
        screen.getByText(
          'This action will edit tokens that are already listed in your wallet, which can be used' +
            ' to phish you. Only approve if you are certain that you mean to change what these' +
            ' tokens represent. Learn more about',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'scams and security risks.' }),
      ).toBeInTheDocument();
    });
  });

  describe('when the suggested token symbol matches an existing token symbol and has a different address', () => {
    it('should show "reuses a symbol" warning', () => {
      const mockTokens = [
        {
          ...MOCK_TOKEN,
          symbol: MOCK_SUGGESTED_ASSETS[0].asset.symbol,
        },
      ];
      renderComponent(mockTokens);

      expect(
        screen.getByText(
          'A token here reuses a symbol from another token you watch, this can be confusing or deceptive.',
        ),
      ).toBeInTheDocument();
    });
  });
});

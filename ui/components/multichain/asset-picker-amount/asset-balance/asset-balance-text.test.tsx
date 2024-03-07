import React from 'react';
import { render } from '@testing-library/react';
import { AssetBalanceText } from './asset-balance-text';
import { AssetType } from '../../../../../shared/constants/transaction';
import mockSendState from '../../../../../test/data/mock-send-state.json';
import { Provider } from 'react-redux';
import configureStore from '../../../../store/store';

const store = configureStore({
  ...mockSendState,
  metamask: {
    ...mockSendState.metamask,
    preferences: { useNativeCurrencyAsPrimaryCurrency: true },
  },
  appState: { ...mockSendState.appState, sendInputCurrencySwitched: false },
});

const mockUseTokenTracker = jest.fn();
const mockUseCurrencyDisplay = jest.fn();
const mockUseTokenFiatAmount = jest.fn();
const mockUseIsOriginalTokenSymbol = jest.fn();
const mockGetIsFiatPrimary = jest.fn();

jest.mock('../../../../hooks/useTokenTracker', () => ({
  useTokenTracker: () => mockUseTokenTracker(),
}));

jest.mock('../../../../hooks/useCurrencyDisplay', () => ({
  useCurrencyDisplay: () => mockUseCurrencyDisplay(),
}));

jest.mock('../../../../hooks/useTokenFiatAmount', () => ({
  useTokenFiatAmount: () => mockUseTokenFiatAmount(),
}));

jest.mock('../../../../hooks/useIsOriginalTokenSymbol', () => ({
  useIsOriginalTokenSymbol: () => mockUseIsOriginalTokenSymbol(),
}));

jest.mock('../utils', () => ({
  getIsFiatPrimary: () => mockGetIsFiatPrimary(),
}));

describe('AssetBalanceText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot', () => {
    mockUseTokenTracker.mockReturnValue({
      tokensWithBalances: [
        { string: "doesn't matter", symbol: "doesn't matter", address: '0x01' },
      ],
    });
    mockUseCurrencyDisplay.mockReturnValue([
      'undefined',
      { value: 'fiat value', suffix: 'suffix', prefix: 'prefix-' },
    ]);
    mockUseTokenFiatAmount.mockReturnValue('Token Fiat Value');
    mockUseIsOriginalTokenSymbol.mockReturnValue(false);
    mockGetIsFiatPrimary.mockReturnValue(true);

    const asset = {
      type: AssetType.native,
      balance: '1000000',
    };
    const { asFragment } = render(
      <Provider store={store}>
        <AssetBalanceText asset={asset} balanceColor={'textColor' as any} />
      </Provider>,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders fiat primary correctly', () => {
    mockUseTokenTracker.mockReturnValue({
      tokensWithBalances: [{ string: "doesn't matter", address: '0x01' }],
    });
    mockUseCurrencyDisplay.mockReturnValue([
      'title',
      { value: '$1.23', symbol: "doesn't matter" },
    ]);
    mockUseTokenFiatAmount.mockReturnValue("doesn't matter");
    mockUseIsOriginalTokenSymbol.mockReturnValue(true);
    mockGetIsFiatPrimary.mockReturnValue(true);

    const asset = {
      type: AssetType.token,
      details: { address: '0x01', decimals: 2 },
      balance: '100',
    };
    const { getByText } = render(
      <Provider store={store}>
        <AssetBalanceText asset={asset} balanceColor={'textColor' as any} />
      </Provider>,
    );
    expect(getByText('$1.23')).toBeInTheDocument();
  });

  it('renders native asset type correctly', () => {
    mockUseTokenTracker.mockReturnValue({
      tokensWithBalances: [{ string: '100', address: '0x01' }],
    });
    mockUseCurrencyDisplay.mockReturnValue([
      'title',
      { value: 'test_balance' },
    ]);
    mockUseTokenFiatAmount.mockReturnValue('$1.00');
    mockUseIsOriginalTokenSymbol.mockReturnValue(false);
    mockGetIsFiatPrimary.mockReturnValue(false);

    const asset = {
      type: AssetType.native,
      balance: '10000',
    };

    const { getByText } = render(
      <Provider store={store}>
        <AssetBalanceText asset={asset} balanceColor={'textColor' as any} />
      </Provider>,
    );

    expect(getByText('test_balance')).toBeInTheDocument();
  });
});

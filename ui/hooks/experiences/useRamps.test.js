import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useRamps from './useRamps';

jest.mock('react-redux');

jest.mock('./../../selectors', () => ({
  getCurrentChainId: jest.fn(),
}));

jest.mock('../../../shared/constants/network', () => ({
  CHAIN_IDS: {
    GOERLI: '5',
    SEPOLIA: '10',
    MAINNET: '1',
  },
}));

describe('useRamps', () => {
  beforeAll(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, 'platform', {
      value: {
        openTab: jest.fn(),
      },
    });
  });

  it('should open the buy crypto URL for GOERLI chain ID', () => {
    const mockChainId = '5';
    const mockBuyURI = 'https://goerli-faucet.slock.it/';

    useSelector.mockReturnValue(mockChainId);
    const openTabSpy = jest.spyOn(global.platform, 'openTab');

    const { result } = renderHook(() => useRamps());

    expect(typeof result.current.openBuyCryptoInPdapp).toBe('function');

    result.current.openBuyCryptoInPdapp();

    expect(openTabSpy).toHaveBeenCalledWith({
      url: mockBuyURI,
    });
  });

  it('should open the buy crypto URL for SEPOLIA chain ID', () => {
    const mockChainId = '10';
    const mockBuyURI = 'https://faucet.sepolia.dev/';

    useSelector.mockReturnValue(mockChainId);
    const openTabSpy = jest.spyOn(global.platform, 'openTab');

    const { result } = renderHook(() => useRamps());

    expect(typeof result.current.openBuyCryptoInPdapp).toBe('function');

    result.current.openBuyCryptoInPdapp();

    expect(openTabSpy).toHaveBeenCalledWith({
      url: mockBuyURI,
    });
  });

  it('should open the buy crypto URL for MAINNET chain ID', () => {
    const mockChainId = '1';
    const mockBuyURI = `${process.env.PORTFOLIO_URL}/buy?metamaskEntry=ext_buy_button`;

    useSelector.mockReturnValue(mockChainId);
    const openTabSpy = jest.spyOn(global.platform, 'openTab');

    const { result } = renderHook(() => useRamps());

    expect(typeof result.current.openBuyCryptoInPdapp).toBe('function');

    result.current.openBuyCryptoInPdapp();

    expect(openTabSpy).toHaveBeenCalledWith({
      url: mockBuyURI,
    });
  });
});

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { ChainId, CHAIN_IDS } from '../../../shared/constants/network';
import { getCurrentChainId, getMetaMetricsId } from '../../selectors';

interface IUseRamps {
  openBuyCryptoInPdapp: VoidFunction;
  getBuyURI: (chainId: ChainId) => string;
}

const portfolioUrl = process.env.PORTFOLIO_URL;

const useRamps = (): IUseRamps => {
  const chainId = useSelector(getCurrentChainId);
  const metaMetricsId = useSelector(getMetaMetricsId);

  const getBuyURI = useCallback((_chainId: Hex) => {
    switch (_chainId) {
      case CHAIN_IDS.SEPOLIA:
        return 'https://faucet.sepolia.dev/';
      default: {
        const params = new URLSearchParams();
        params.set('metamaskEntry', 'ext_buy_button');
        if (metaMetricsId) {
          params.set('metametricsId', metaMetricsId);
        }
        return `${portfolioUrl}/buy?${params.toString()}`;
      }
    }
  }, []);

  const openBuyCryptoInPdapp = useCallback(() => {
    const buyUrl = getBuyURI(chainId);
    global.platform.openTab({
      url: buyUrl,
    });
  }, []);

  return { openBuyCryptoInPdapp, getBuyURI };
};

export default useRamps;

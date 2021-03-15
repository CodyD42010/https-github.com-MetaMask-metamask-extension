import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import contractMap from '@metamask/contract-metadata';
import BigNumber from 'bignumber.js';
import { isEqual, shuffle } from 'lodash';
import { checksumAddress } from '../helpers/utils/util';
import { getTokenFiatAmount } from '../helpers/utils/token-util';
import {
  getTokenExchangeRates,
  getConversionRate,
  getCurrentCurrency,
  getSwapsEthToken,
} from '../selectors';
import { getSwapsTokens } from '../ducks/swaps/swaps';
import { useEqualityCheck } from './useEqualityCheck';

const tokenList = shuffle(
  Object.entries(contractMap)
    .map(([address, tokenData]) => ({
      ...tokenData,
      address: address.toLowerCase(),
    }))
    .filter((tokenData) => Boolean(tokenData.erc20)),
);

export function getRenderableTokenData(
  token,
  contractExchangeRates,
  conversionRate,
  currentCurrency,
) {
  const { symbol, name, address, iconUrl, string, balance, decimals } = token;

  const formattedFiat =
    getTokenFiatAmount(
      symbol === 'ETH' ? 1 : contractExchangeRates[address],
      conversionRate,
      currentCurrency,
      string,
      symbol,
      true,
    ) || '';
  const rawFiat =
    getTokenFiatAmount(
      symbol === 'ETH' ? 1 : contractExchangeRates[address],
      conversionRate,
      currentCurrency,
      string,
      symbol,
      false,
    ) || '';
  const usedIconUrl =
    iconUrl ||
    (contractMap[checksumAddress(address)] &&
      `images/contract/${contractMap[checksumAddress(address)].logo}`);
  return {
    ...token,
    primaryLabel: symbol,
    secondaryLabel: name || contractMap[checksumAddress(address)]?.name,
    rightPrimaryLabel:
      string && `${new BigNumber(string).round(6).toString()} ${symbol}`,
    rightSecondaryLabel: formattedFiat,
    iconUrl: usedIconUrl,
    identiconAddress: usedIconUrl ? null : address,
    balance,
    decimals,
    name: name || contractMap[checksumAddress(address)]?.name,
    rawFiat,
  };
}

export function useTokensToSearch({ usersTokens = [], topTokens = {} }) {
  const tokenConversionRates = useSelector(getTokenExchangeRates, isEqual);
  const conversionRate = useSelector(getConversionRate);
  const currentCurrency = useSelector(getCurrentCurrency);
  const swapsEthToken = useSelector(getSwapsEthToken);

  const memoizedTopTokens = useEqualityCheck(topTokens);
  const memoizedUsersToken = useEqualityCheck(usersTokens);

  const ethToken = getRenderableTokenData(
    swapsEthToken,
    tokenConversionRates,
    conversionRate,
    currentCurrency,
  );
  const memoizedEthToken = useEqualityCheck(ethToken);

  const swapsTokens = useSelector(getSwapsTokens) || [];

  const tokensToSearch = swapsTokens.length
    ? swapsTokens
    : [
        memoizedEthToken,
        ...tokenList.filter(
          (token) => token.symbol !== memoizedEthToken.symbol,
        ),
      ];

  const memoizedTokensToSearch = useEqualityCheck(tokensToSearch);
  return useMemo(() => {
    const usersTokensAddressMap = memoizedUsersToken.reduce(
      (acc, token) => ({ ...acc, [token.address]: token }),
      {},
    );

    const tokensToSearchBuckets = {
      owned: [],
      top: [],
      others: [],
    };

    memoizedTokensToSearch.forEach((token) => {
      const renderableDataToken = getRenderableTokenData(
        { ...usersTokensAddressMap[token.address], ...token },
        tokenConversionRates,
        conversionRate,
        currentCurrency,
      );
      if (
        renderableDataToken.symbol === 'ETH' ||
        (usersTokensAddressMap[token.address] &&
          Number(renderableDataToken.balance ?? 0) !== 0)
      ) {
        tokensToSearchBuckets.owned.push(renderableDataToken);
      } else if (memoizedTopTokens[token.address]) {
        tokensToSearchBuckets.top[
          memoizedTopTokens[token.address].index
        ] = renderableDataToken;
      } else {
        tokensToSearchBuckets.others.push(renderableDataToken);
      }
    });

    tokensToSearchBuckets.owned = tokensToSearchBuckets.owned.sort(
      ({ rawFiat }, { rawFiat: secondRawFiat }) => {
        return new BigNumber(rawFiat || 0).gt(secondRawFiat || 0) ? -1 : 1;
      },
    );
    tokensToSearchBuckets.top = tokensToSearchBuckets.top.filter(Boolean);
    return [
      ...tokensToSearchBuckets.owned,
      ...tokensToSearchBuckets.top,
      ...tokensToSearchBuckets.others,
    ];
  }, [
    memoizedTokensToSearch,
    memoizedUsersToken,
    tokenConversionRates,
    conversionRate,
    currentCurrency,
    memoizedTopTokens,
  ]);
}

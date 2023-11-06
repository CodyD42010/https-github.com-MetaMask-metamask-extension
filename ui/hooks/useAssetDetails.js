import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getCollectibles } from '../ducks/metamask/metamask';
import { ERC1155, ERC20, ERC721 } from '../../shared/constants/transaction';
import { getTokenValueParam } from '../../app/scripts/constants/metamask-controller-utils';
import { calcTokenAmount } from '../../app/scripts/constants/transactions-controller-utils';
import { parseStandardTokenTransactionData } from '../../shared/modules/transaction.utils';
import { getCollectibles } from '../ducks/metamask/metamask';
import {
  getAssetDetails,
  getTokenAddressParam,
} from '../helpers/utils/token-util';
import { hideLoadingIndication, showLoadingIndication } from '../store/actions';
import { usePrevious } from './usePrevious';

export function useAssetDetails(tokenAddress, userAddress, transactionData) {
  const dispatch = useDispatch();
  // state selectors
  const collectibles = useSelector(getCollectibles);

  // in-hook state
  const [currentAsset, setCurrentAsset] = useState(null);
<<<<<<< HEAD
=======
  const { tokensWithBalances } = useTokenTracker({
    tokens: currentToken ? [currentToken] : [],
  });
>>>>>>> upstream/multichain-swaps-controller

  // previous state checkers
  const prevTokenAddress = usePrevious(tokenAddress);
  const prevUserAddress = usePrevious(userAddress);
  const prevTransactionData = usePrevious(transactionData);

  useEffect(() => {
    async function getAndSetAssetDetails() {
      dispatch(showLoadingIndication());
      const assetDetails = await getAssetDetails(
        tokenAddress,
        userAddress,
        transactionData,
        collectibles,
      );
      setCurrentAsset(assetDetails);
      dispatch(hideLoadingIndication());
    }
    if (
      tokenAddress !== prevTokenAddress ||
      userAddress !== prevUserAddress ||
      transactionData !== prevTransactionData
    ) {
      getAndSetAssetDetails();
    }
  }, [
    dispatch,
    prevTokenAddress,
    prevTransactionData,
    prevUserAddress,
    tokenAddress,
    userAddress,
    transactionData,
    collectibles,
  ]);

  if (currentAsset) {
    const {
      standard,
      symbol,
      image,
      name,
      balance,
      tokenId,
      toAddress,
      tokenAmount,
      decimals,
    } = currentAsset;

    return {
      toAddress,
      tokenId,
      decimals,
      tokenAmount,
      assetAddress: tokenAddress,
      assetStandard: standard,
      tokenSymbol: symbol ?? '',
      tokenImage: image,
      userBalance: balance,
      assetName: name,
    };
  }

  return {};
}

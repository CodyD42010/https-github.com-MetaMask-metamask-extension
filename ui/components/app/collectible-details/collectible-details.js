import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { createCustomTokenTrackerLink } from '@metamask/etherscan-link';
import Box from '../../ui/box';
import Typography from '../../ui/typography/typography';
import {
  COLORS,
  TYPOGRAPHY,
  BLOCK_SIZES,
  FONT_WEIGHT,
  JUSTIFY_CONTENT,
  FLEX_DIRECTION,
  ALIGN_ITEMS,
  OVERFLOW_WRAP,
} from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  getAssetImageURL,
  isEqualCaseInsensitive,
  shortenAddress,
} from '../../../helpers/utils/util';
import {
  getCurrentChainId,
  getIpfsGateway,
  getRpcPrefsForCurrentProvider,
  getSelectedIdentity,
} from '../../../selectors';
import AssetNavigation from '../../../pages/asset/components/asset-navigation';
import { getCollectibleContracts } from '../../../ducks/metamask/metamask';
import { DEFAULT_ROUTE } from '../../../helpers/constants/routes';
import { removeAndIgnoreCollectible } from '../../../store/actions';
import {
  GOERLI_CHAIN_ID,
  KOVAN_CHAIN_ID,
  MAINNET,
  POLYGON_CHAIN_ID,
  RINKEBY_CHAIN_ID,
  ROPSTEN_CHAIN_ID,
} from '../../../../shared/constants/network';
import CollectibleOptions from './collectible-options';

export default function CollectibleDetails({ collectible }) {
  const { image, name, description, address, tokenId } = collectible;
  const t = useI18nContext();
  const history = useHistory();
  const rpcPrefs = useSelector(getRpcPrefsForCurrentProvider);
  const ipfsGateway = useSelector(getIpfsGateway);
  const collectibleContracts = useSelector(getCollectibleContracts);
  const currentNetwork = useSelector(getCurrentChainId);

  const collectibleContractName = collectibleContracts.find(
    ({ address: contractAddress }) =>
      isEqualCaseInsensitive(contractAddress, address),
  )?.name;
  const selectedAccountName = useSelector(
    (state) => getSelectedIdentity(state).name,
  );
  const collectibleImageURL = getAssetImageURL(image, ipfsGateway);
  const dispatch = useDispatch();

  const onRemove = () => {
    dispatch(removeAndIgnoreCollectible(address, tokenId));
    history.push(DEFAULT_ROUTE);
  };

  const getOpenSeaLink = () => {
    switch (currentNetwork) {
      case MAINNET:
        return `https://opensea.io/assets/${address}/${tokenId}`;
      case POLYGON_CHAIN_ID:
        return `https://opensea.io/assets/matic/${address}/${tokenId}`;
      case GOERLI_CHAIN_ID:
      case KOVAN_CHAIN_ID:
      case ROPSTEN_CHAIN_ID:
      case RINKEBY_CHAIN_ID:
        return `https://testnets.opensea.io/assets/${address}/${tokenId}`;
      default:
        return null;
    }
  };

  const openSeaLink = getOpenSeaLink();

  return (
    <>
      <AssetNavigation
        accountName={selectedAccountName}
        assetName={collectibleContractName}
        onBack={() => history.push(DEFAULT_ROUTE)}
        optionsButton={
          <CollectibleOptions
            onViewOnOpensea={
              openSeaLink
                ? () => global.platform.openTab({ url: openSeaLink })
                : null
            }
            onRemove={onRemove}
          />
        }
      />
      <Box padding={[4, 2, 4, 2]}>
        <div className="collectible-details">
          <Box margin={3} padding={2} justifyContent={JUSTIFY_CONTENT.CENTER}>
            <img style={{ width: '14rem' }} src={collectibleImageURL} />
          </Box>
          <Box margin={3} flexDirection={FLEX_DIRECTION.COLUMN}>
            <Typography
              color={COLORS.BLACK}
              variant={TYPOGRAPHY.H4}
              fontWeight={FONT_WEIGHT.BOLD}
            >
              {name}
            </Typography>
            <Typography
              color={COLORS.UI3}
              variant={TYPOGRAPHY.H5}
              boxProps={{ marginTop: 2, marginBottom: 3 }}
            >
              {`#${tokenId}`}
            </Typography>
            <Typography
              color={COLORS.BLACK}
              variant={TYPOGRAPHY.H6}
              fontWeight={FONT_WEIGHT.BOLD}
              className="collectible-details__description"
            >
              {t('description')}
            </Typography>
            <Typography color={COLORS.UI3} variant={TYPOGRAPHY.H6}>
              {description}
            </Typography>
          </Box>
        </div>
        <Box margin={4} alignItems={ALIGN_ITEMS.FLEX_START}>
          <Box width={BLOCK_SIZES.ONE_THIRD}>
            <Typography
              color={COLORS.BLACK}
              variant={TYPOGRAPHY.H6}
              fontWeight={FONT_WEIGHT.BOLD}
              boxProps={{ marginBottom: 3 }}
            >
              {t('source')}
            </Typography>
            <Typography
              color={COLORS.BLACK}
              variant={TYPOGRAPHY.H6}
              fontWeight={FONT_WEIGHT.BOLD}
            >
              {t('contractAddress')}
            </Typography>
          </Box>
          <Box width={BLOCK_SIZES.TWO_THIRDS}>
            <Typography
              color={COLORS.PRIMARY1}
              variant={TYPOGRAPHY.H6}
              boxProps={{ marginBottom: 3 }}
              overflowWrap={OVERFLOW_WRAP.BREAK_WORD}
            >
              <a
                target="_blank"
                href={collectibleImageURL}
                rel="noopener noreferrer"
              >
                {image}
              </a>
            </Typography>
            <Typography
              color={COLORS.UI3}
              variant={TYPOGRAPHY.H6}
              overflowWrap={OVERFLOW_WRAP.BREAK_WORD}
            >
              <a
                target="_blank"
                href={
                  rpcPrefs?.blockExplorerUrl
                    ? createCustomTokenTrackerLink(
                        address,
                        rpcPrefs.blockExplorerUrl,
                      )
                    : null
                }
                rel="noopener noreferrer"
              >
                {shortenAddress(address)}
              </a>
            </Typography>
          </Box>
        </Box>
      </Box>
    </>
  );
}

CollectibleDetails.propTypes = {
  collectible: PropTypes.object,
};

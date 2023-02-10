import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { isEqual } from 'lodash';
import Box from '../../ui/box';
import Card from '../../ui/card';
import Typography from '../../ui/typography/typography';
import {
  TextColor,
  IconColor,
  TypographyVariant,
  FONT_WEIGHT,
  JustifyContent,
  FLEX_DIRECTION,
  OVERFLOW_WRAP,
  DISPLAY,
  BLOCK_SIZES,
} from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  formatDate,
  getAssetImageURL,
  shortenAddress,
} from '../../../helpers/utils/util';
import { getCollectibleImageAlt } from '../../../helpers/utils/nfts';
import {
  getCurrentChainId,
  getIpfsGateway,
  getSelectedIdentity,
} from '../../../selectors';
import AssetNavigation from '../../../pages/asset/components/asset-navigation';
import { getCollectibleContracts } from '../../../ducks/metamask/metamask';
import { DEFAULT_ROUTE, SEND_ROUTE } from '../../../helpers/constants/routes';
import {
  checkAndUpdateSingleNftOwnershipStatus,
  removeAndIgnoreNft,
  setRemoveCollectibleMessage,
} from '../../../store/actions';
import { CHAIN_IDS } from '../../../../shared/constants/network';
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import { ENVIRONMENT_TYPE_POPUP } from '../../../../shared/constants/app';
import CollectibleOptions from '../nft-options/nft-options';
import Button from '../../ui/button';
import { startNewDraftTransaction } from '../../../ducks/send';
import InfoTooltip from '../../ui/info-tooltip';
import { usePrevious } from '../../../hooks/usePrevious';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { isEqualCaseInsensitive } from '../../../../shared/modules/string-utils';
import {
  AssetType,
  TokenStandard,
} from '../../../../shared/constants/transaction';
import CollectibleDefaultImage from '../nft-default-image';
import { ButtonIcon, ICON_NAMES } from '../../component-library';
import Tooltip from '../../ui/tooltip';

export default function CollectibleDetails({ collectible }) {
  const {
    image,
    imageOriginal,
    name,
    description,
    address,
    tokenId,
    standard,
    isCurrentlyOwned,
    lastSale,
    imageThumbnail,
  } = collectible;
  const t = useI18nContext();
  const history = useHistory();
  const dispatch = useDispatch();
  const ipfsGateway = useSelector(getIpfsGateway);
  const collectibleContracts = useSelector(getCollectibleContracts);
  const currentNetwork = useSelector(getCurrentChainId);
  const [addressCopied, handleAddressCopy] = useCopyToClipboard();

  const collectibleContractName = collectibleContracts.find(
    ({ address: contractAddress }) =>
      isEqualCaseInsensitive(contractAddress, address),
  )?.name;
  const selectedAccountName = useSelector(
    (state) => getSelectedIdentity(state).name,
  );
  const collectibleImageAlt = getCollectibleImageAlt(collectible);
  const collectibleImageURL = getAssetImageURL(
    imageOriginal ?? image,
    ipfsGateway,
  );
  const isDataURI = collectibleImageURL.startsWith('data:');
  const formattedTimestamp = formatDate(
    new Date(lastSale?.event_timestamp).getTime(),
    'M/d/y',
  );

  const onRemove = () => {
    dispatch(removeAndIgnoreNft(address, tokenId));
    dispatch(setRemoveCollectibleMessage('success'));
    history.push(DEFAULT_ROUTE);
  };

  const prevCollectible = usePrevious(collectible);
  useEffect(() => {
    if (!isEqual(prevCollectible, collectible)) {
      checkAndUpdateSingleNftOwnershipStatus(collectible);
    }
  }, [collectible, prevCollectible]);

  const getOpenSeaLink = () => {
    switch (currentNetwork) {
      case CHAIN_IDS.MAINNET:
        return `https://opensea.io/assets/${address}/${tokenId}`;
      case CHAIN_IDS.POLYGON:
        return `https://opensea.io/assets/matic/${address}/${tokenId}`;
      case CHAIN_IDS.GOERLI:
      case CHAIN_IDS.SEPOLIA:
        return `https://testnets.opensea.io/assets/${address}/${tokenId}`;
      default:
        return null;
    }
  };

  const openSeaLink = getOpenSeaLink();
  const sendDisabled = standard !== TokenStandard.ERC721;
  const inPopUp = getEnvironmentType() === ENVIRONMENT_TYPE_POPUP;

  const onSend = async () => {
    await dispatch(
      startNewDraftTransaction({
        type: AssetType.NFT,
        details: collectible,
      }),
    );
    history.push(SEND_ROUTE);
  };

  const renderSendButton = () => {
    if (isCurrentlyOwned === false) {
      return <div style={{ height: '30px' }} />;
    }
    return (
      <Box
        display={DISPLAY.FLEX}
        width={inPopUp ? BLOCK_SIZES.FULL : BLOCK_SIZES.HALF}
        margin={inPopUp ? [4, 0] : null}
      >
        <Button
          type="primary"
          onClick={onSend}
          disabled={sendDisabled}
          className="collectible-details__send-button"
          data-testid="collectible-send-button"
        >
          {t('send')}
        </Button>
        {sendDisabled ? (
          <InfoTooltip position="top" contentText={t('sendingDisabled')} />
        ) : null}
      </Box>
    );
  };

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
      <Box className="collectible-details">
        <div className="collectible-details__top-section">
          <Card
            padding={0}
            justifyContent={JustifyContent.center}
            className="collectible-details__card"
          >
            {image ? (
              <img
                className="collectible-details__image"
                src={collectibleImageURL}
                alt={collectibleImageAlt}
              />
            ) : (
              <CollectibleDefaultImage name={name} tokenId={tokenId} />
            )}
          </Card>
          <Box
            flexDirection={FLEX_DIRECTION.COLUMN}
            className="collectible-details__info"
            justifyContent={JustifyContent.spaceBetween}
          >
            <div>
              <Typography
                color={TextColor.textDefault}
                variant={TypographyVariant.H4}
                fontWeight={FONT_WEIGHT.BOLD}
                boxProps={{ margin: 0, marginBottom: 2 }}
              >
                {name}
              </Typography>
              <Typography
                color={TextColor.textMuted}
                variant={TypographyVariant.H5}
                boxProps={{ margin: 0, marginBottom: 4 }}
                overflowWrap={OVERFLOW_WRAP.BREAK_WORD}
              >
                #{tokenId}
              </Typography>
            </div>
            {description ? (
              <div>
                <Typography
                  color={TextColor.textDefault}
                  variant={TypographyVariant.H6}
                  fontWeight={FONT_WEIGHT.BOLD}
                  className="collectible-details__description"
                  boxProps={{ margin: 0, marginBottom: 2 }}
                >
                  {t('description')}
                </Typography>
                <Typography
                  color={TextColor.textAlternative}
                  variant={TypographyVariant.H6}
                  overflowWrap={OVERFLOW_WRAP.BREAK_WORD}
                  boxProps={{ margin: 0, marginBottom: 4 }}
                >
                  {description}
                </Typography>
              </div>
            ) : null}
            {inPopUp ? null : renderSendButton()}
          </Box>
        </div>
        <Box marginBottom={2}>
          {lastSale ? (
            <>
              <Box display={DISPLAY.FLEX} flexDirection={FLEX_DIRECTION.ROW}>
                <Typography
                  color={TextColor.textDefault}
                  variant={TypographyVariant.H6}
                  fontWeight={FONT_WEIGHT.BOLD}
                  boxProps={{
                    margin: 0,
                    marginBottom: 4,
                    marginRight: 2,
                  }}
                  className="collectible-details__link-title"
                >
                  {t('lastSold')}
                </Typography>
                <Box
                  display={DISPLAY.FLEX}
                  flexDirection={FLEX_DIRECTION.ROW}
                  className="collectible-details__contract-wrapper"
                >
                  <Typography
                    color={TextColor.textAlternative}
                    variant={TypographyVariant.H6}
                    overflowWrap={OVERFLOW_WRAP.BREAK_WORD}
                    boxProps={{ margin: 0, marginBottom: 4 }}
                  >
                    {formattedTimestamp}
                  </Typography>
                </Box>
              </Box>
              <Box display={DISPLAY.FLEX} flexDirection={FLEX_DIRECTION.ROW}>
                <Typography
                  color={TextColor.textDefault}
                  variant={TypographyVariant.H6}
                  fontWeight={FONT_WEIGHT.BOLD}
                  boxProps={{
                    margin: 0,
                    marginBottom: 4,
                    marginRight: 2,
                  }}
                  className="collectible-details__link-title"
                >
                  {t('lastPriceSold')}
                </Typography>
                <Box
                  display={DISPLAY.FLEX}
                  flexDirection={FLEX_DIRECTION.ROW}
                  className="collectible-details__contract-wrapper"
                >
                  <Typography
                    color={TextColor.textAlternative}
                    variant={TypographyVariant.H6}
                    overflowWrap={OVERFLOW_WRAP.BREAK_WORD}
                    boxProps={{ margin: 0, marginBottom: 4 }}
                  >
                    {lastSale.total_price}
                  </Typography>
                </Box>
              </Box>
            </>
          ) : null}
          <Box display={DISPLAY.FLEX} flexDirection={FLEX_DIRECTION.ROW}>
            <Typography
              color={TextColor.textDefault}
              variant={TypographyVariant.H6}
              fontWeight={FONT_WEIGHT.BOLD}
              boxProps={{
                margin: 0,
                marginBottom: 4,
                marginRight: 2,
              }}
              className="collectible-details__link-title"
            >
              {t('source')}
            </Typography>
            <Typography
              variant={TypographyVariant.H6}
              boxProps={{
                margin: 0,
                marginBottom: 4,
              }}
              className="collectible-details__image-source"
              color={
                isDataURI ? TextColor.textDefault : TextColor.primaryDefault
              }
            >
              {isDataURI ? (
                <>{collectibleImageURL}</>
              ) : (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={collectibleImageURL}
                  title={collectibleImageURL}
                >
                  {collectibleImageURL}
                </a>
              )}
            </Typography>
          </Box>
          {imageThumbnail ? (
            <Box display={DISPLAY.FLEX} flexDirection={FLEX_DIRECTION.ROW}>
              <Typography
                color={TextColor.textDefault}
                variant={TypographyVariant.H6}
                fontWeight={FONT_WEIGHT.BOLD}
                boxProps={{
                  margin: 0,
                  marginBottom: 4,
                  marginRight: 2,
                }}
                className="collectible-details__link-title"
              >
                {t('link')}
              </Typography>
              <Typography
                variant={TypographyVariant.H6}
                boxProps={{
                  margin: 0,
                  marginBottom: 4,
                }}
                className="collectible-details__image-source"
                color={
                  isDataURI ? TextColor.textDefault : TextColor.primaryDefault
                }
              >
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={collectibleImageURL}
                  title={collectibleImageURL}
                >
                  {imageThumbnail}
                </a>
              </Typography>
            </Box>
          ) : null}
          <Box display={DISPLAY.FLEX} flexDirection={FLEX_DIRECTION.ROW}>
            <Typography
              color={TextColor.textDefault}
              variant={TypographyVariant.H6}
              fontWeight={FONT_WEIGHT.BOLD}
              boxProps={{
                margin: 0,
                marginBottom: 4,
                marginRight: 2,
              }}
              className="collectible-details__link-title"
            >
              {t('contractAddress')}
            </Typography>
            <Box
              display={DISPLAY.FLEX}
              flexDirection={FLEX_DIRECTION.ROW}
              className="collectible-details__contract-wrapper"
            >
              <Typography
                color={TextColor.textAlternative}
                variant={TypographyVariant.H6}
                overflowWrap={OVERFLOW_WRAP.BREAK_WORD}
                boxProps={{ margin: 0, marginBottom: 4 }}
              >
                {shortenAddress(address)}
              </Typography>
              <Tooltip
                wrapperClassName="collectible-details__tooltip-wrapper"
                position="bottom"
                title={
                  addressCopied ? t('copiedExclamation') : t('copyToClipboard')
                }
              >
                <ButtonIcon
                  ariaLabel="copy"
                  color={IconColor.iconAlternative}
                  className="collectible-details__contract-copy-button"
                  data-testid="collectible-address-copy"
                  onClick={() => {
                    handleAddressCopy(address);
                  }}
                  iconName={
                    addressCopied ? ICON_NAMES.COPY_SUCCESS : ICON_NAMES.COPY
                  }
                />
              </Tooltip>
            </Box>
          </Box>
          {inPopUp ? renderSendButton() : null}
          <Typography
            color={TextColor.textAlternative}
            variant={TypographyVariant.H7}
          >
            {t('nftDisclaimer')}
          </Typography>
        </Box>
      </Box>
    </>
  );
}

CollectibleDetails.propTypes = {
  collectible: PropTypes.shape({
    address: PropTypes.string.isRequired,
    tokenId: PropTypes.string.isRequired,
    isCurrentlyOwned: PropTypes.bool,
    name: PropTypes.string,
    description: PropTypes.string,
    image: PropTypes.string,
    standard: PropTypes.string,
    imageThumbnail: PropTypes.string,
    imagePreview: PropTypes.string,
    imageOriginal: PropTypes.string,
    creator: PropTypes.shape({
      address: PropTypes.string,
      config: PropTypes.string,
      profile_img_url: PropTypes.string,
    }),
    lastSale: PropTypes.shape({
      event_timestamp: PropTypes.string,
      total_price: PropTypes.string,
    }),
  }),
};

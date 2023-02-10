import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { isEqual } from 'lodash';
import Box from '../../ui/box';
import Typography from '../../ui/typography/typography';
import Card from '../../ui/card';
import {
  Color,
  TypographyVariant,
  JustifyContent,
  FLEX_DIRECTION,
  AlignItems,
  DISPLAY,
  BLOCK_SIZES,
  FLEX_WRAP,
} from '../../../helpers/constants/design-system';
import { ENVIRONMENT_TYPE_POPUP } from '../../../../shared/constants/app';
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import {
  getCurrentChainId,
  getIpfsGateway,
  getSelectedAddress,
} from '../../../selectors';
import { ASSET_ROUTE } from '../../../helpers/constants/routes';
import { getAssetImageURL } from '../../../helpers/utils/util';
import { getCollectibleImageAlt } from '../../../helpers/utils/nfts';
import { updateCollectibleDropDownState } from '../../../store/actions';
import { usePrevious } from '../../../hooks/usePrevious';
import { getCollectiblesDropdownState } from '../../../ducks/metamask/metamask';
import { useI18nContext } from '../../../hooks/useI18nContext';
import CollectibleDefaultImage from '../nft-default-image';

const width =
  getEnvironmentType() === ENVIRONMENT_TYPE_POPUP
    ? BLOCK_SIZES.ONE_THIRD
    : BLOCK_SIZES.ONE_SIXTH;

const PREVIOUSLY_OWNED_KEY = 'previouslyOwned';

export default function CollectiblesItems({
  collections = {},
  previouslyOwnedCollection = {},
}) {
  const dispatch = useDispatch();
  const collectionsKeys = Object.keys(collections);
  const collectiblesDropdownState = useSelector(getCollectiblesDropdownState);
  const previousCollectionKeys = usePrevious(collectionsKeys);
  const selectedAddress = useSelector(getSelectedAddress);
  const chainId = useSelector(getCurrentChainId);
  const t = useI18nContext();

  useEffect(() => {
    if (
      chainId !== undefined &&
      selectedAddress !== undefined &&
      !isEqual(previousCollectionKeys, collectionsKeys) &&
      (collectiblesDropdownState?.[selectedAddress]?.[chainId] === undefined ||
        Object.keys(collectiblesDropdownState?.[selectedAddress]?.[chainId])
          .length === 0)
    ) {
      const initState = {};
      collectionsKeys.forEach((key) => {
        initState[key] = true;
      });

      const newCollectibleDropdownState = {
        ...collectiblesDropdownState,
        [selectedAddress]: {
          ...collectiblesDropdownState?.[selectedAddress],
          [chainId]: initState,
        },
      };

      dispatch(updateCollectibleDropDownState(newCollectibleDropdownState));
    }
  }, [
    collectionsKeys,
    previousCollectionKeys,
    collectiblesDropdownState,
    selectedAddress,
    chainId,
    dispatch,
  ]);

  const ipfsGateway = useSelector(getIpfsGateway);
  const history = useHistory();

  const renderCollectionImage = (collectionImage, collectionName) => {
    if (collectionImage) {
      return (
        <img
          alt={collectionName}
          src={getAssetImageURL(collectionImage, ipfsGateway)}
          className="collectibles-items__collection-image"
        />
      );
    }
    return (
      <div className="collectibles-items__collection-image-alt">
        {collectionName?.[0]?.toUpperCase() ?? null}
      </div>
    );
  };

  const updateCollectibleDropDownStateKey = (key, isExpanded) => {
    const currentAccountCollectibleDropdownState =
      collectiblesDropdownState[selectedAddress][chainId];

    const newCurrentAccountState = {
      ...currentAccountCollectibleDropdownState,
      [key]: !isExpanded,
    };

    collectiblesDropdownState[selectedAddress][chainId] =
      newCurrentAccountState;

    dispatch(updateCollectibleDropDownState(collectiblesDropdownState));
  };

  const renderCollection = ({
    collectibles,
    collectionName,
    collectionImage,
    key,
  }) => {
    if (!collectibles.length) {
      return null;
    }

    const isExpanded =
      collectiblesDropdownState[selectedAddress]?.[chainId]?.[key];
    return (
      <div className="collectibles-items__collection" key={`collection-${key}`}>
        <button
          className="collectibles-items__collection-wrapper"
          data-testid="collection-expander-button"
          onClick={() => {
            updateCollectibleDropDownStateKey(key, isExpanded);
          }}
        >
          <Box
            marginBottom={2}
            display={DISPLAY.FLEX}
            alignItems={AlignItems.center}
            justifyContent={JustifyContent.spaceBetween}
            className="collectibles-items__collection-accordion-title"
          >
            <Box
              alignItems={AlignItems.center}
              className="collectibles-items__collection-header"
            >
              {renderCollectionImage(collectionImage, collectionName)}
              <Typography
                color={Color.textDefault}
                variant={TypographyVariant.H5}
                margin={2}
              >
                {`${collectionName ?? t('unknownCollection')} (${
                  collectibles.length
                })`}
              </Typography>
            </Box>
            <Box alignItems={AlignItems.flexEnd}>
              <i
                className={`collectibles-items__collection__icon-chevron fa fa-chevron-${
                  isExpanded ? 'down' : 'right'
                }`}
              />
            </Box>
          </Box>
        </button>

        {isExpanded ? (
          <Box display={DISPLAY.FLEX} flexWrap={FLEX_WRAP.WRAP} gap={4}>
            {collectibles.map((collectible, i) => {
              const { image, address, tokenId, backgroundColor, name } =
                collectible;
              const collectibleImage = getAssetImageURL(image, ipfsGateway);
              const collectibleImageAlt = getCollectibleImageAlt(collectible);
              const handleImageClick = () =>
                history.push(`${ASSET_ROUTE}/${address}/${tokenId}`);

              return (
                <Box
                  data-testid="collectible-wrapper"
                  width={width}
                  key={`collectible-${i}`}
                  className="collectibles-items__item-wrapper"
                >
                  <Card
                    padding={0}
                    justifyContent={JustifyContent.center}
                    className="collectibles-items__item-wrapper__card"
                  >
                    {collectibleImage ? (
                      <button
                        className="collectibles-items__item"
                        style={{
                          backgroundColor,
                        }}
                        onClick={handleImageClick}
                      >
                        <img
                          className="collectibles-items__item-image"
                          data-testid="collectible-image"
                          src={collectibleImage}
                          alt={collectibleImageAlt}
                        />
                      </button>
                    ) : (
                      <CollectibleDefaultImage
                        name={name}
                        tokenId={tokenId}
                        handleImageClick={handleImageClick}
                      />
                    )}
                  </Card>
                </Box>
              );
            })}
          </Box>
        ) : null}
      </div>
    );
  };

  return (
    <div className="collectibles-items">
      <Box
        paddingTop={6}
        paddingBottom={6}
        paddingLeft={4}
        paddingRight={4}
        flexDirection={FLEX_DIRECTION.COLUMN}
      >
        <>
          {collectionsKeys.map((key) => {
            const { collectibles, collectionName, collectionImage } =
              collections[key];

            return renderCollection({
              collectibles,
              collectionName,
              collectionImage,
              key,
              isPreviouslyOwnedCollection: false,
            });
          })}
          {renderCollection({
            collectibles: previouslyOwnedCollection.collectibles,
            collectionName: previouslyOwnedCollection.collectionName,
            collectionImage: previouslyOwnedCollection.collectibles[0]?.image,
            isPreviouslyOwnedCollection: true,
            key: PREVIOUSLY_OWNED_KEY,
          })}
        </>
      </Box>
    </div>
  );
}

CollectiblesItems.propTypes = {
  previouslyOwnedCollection: PropTypes.shape({
    collectibles: PropTypes.arrayOf(
      PropTypes.shape({
        address: PropTypes.string.isRequired,
        tokenId: PropTypes.string.isRequired,
        name: PropTypes.string,
        description: PropTypes.string,
        image: PropTypes.string,
        standard: PropTypes.string,
        imageThumbnail: PropTypes.string,
        imagePreview: PropTypes.string,
        creator: PropTypes.shape({
          address: PropTypes.string,
          config: PropTypes.string,
          profile_img_url: PropTypes.string,
        }),
      }),
    ),
    collectionName: PropTypes.string,
    collectionImage: PropTypes.string,
  }),
  collections: PropTypes.shape({
    collectibles: PropTypes.arrayOf(
      PropTypes.shape({
        address: PropTypes.string.isRequired,
        tokenId: PropTypes.string.isRequired,
        name: PropTypes.string,
        description: PropTypes.string,
        image: PropTypes.string,
        standard: PropTypes.string,
        imageThumbnail: PropTypes.string,
        imagePreview: PropTypes.string,
        creator: PropTypes.shape({
          address: PropTypes.string,
          config: PropTypes.string,
          profile_img_url: PropTypes.string,
        }),
      }),
    ),
    collectionImage: PropTypes.string,
    collectionName: PropTypes.string,
  }),
};

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import Box from '../../ui/box';
import Typography from '../../ui/typography/typography';
import {
  COLORS,
  TYPOGRAPHY,
  JUSTIFY_CONTENT,
  FLEX_DIRECTION,
  ALIGN_ITEMS,
  DISPLAY,
  BLOCK_SIZES,
  FLEX_WRAP,
} from '../../../helpers/constants/design-system';
import { ENVIRONMENT_TYPE_POPUP } from '../../../../shared/constants/app';
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import { getIpfsGateway } from '../../../selectors';
import { ASSET_ROUTE } from '../../../helpers/constants/routes';
import { getAssetImageURL } from '../../../helpers/utils/util';

const width =
  getEnvironmentType() === ENVIRONMENT_TYPE_POPUP
    ? BLOCK_SIZES.ONE_THIRD
    : BLOCK_SIZES.ONE_SIXTH;

const PREVIOUSLY_OWNED_KEY = 'previouslyOwned';

export default function CollectiblesItems({
  collections = {},
  previouslyOwnedCollection = {},
}) {
  const collectionsKeys = Object.keys(collections);

  // if there is only one collection present set it to open when component mounts
  const [dropdownState, setDropdownState] = useState(() => {
    return collectionsKeys.length === 1
      ? {
          [PREVIOUSLY_OWNED_KEY]: false,
          [collectionsKeys[0]]: true,
        }
      : { [PREVIOUSLY_OWNED_KEY]: false };
  });

  const ipfsGateway = useSelector(getIpfsGateway);

  const history = useHistory();

  const renderCollectionImage = (
    isPreviouslyOwnedCollection,
    collectionImage,
    collectionName,
  ) => {
    if (isPreviouslyOwnedCollection) {
      return null;
    }
    if (collectionImage) {
      return (
        <img
          src={collectionImage}
          className="collectibles-items__collection-image"
        />
      );
    }
    return (
      <div className="collectibles-items__collection-image-alt">
        {collectionName[0]}
      </div>
    );
  };

  const renderCollection = ({
    collectibles,
    collectionName,
    collectionImage,
    key,
    isPreviouslyOwnedCollection,
  }) => {
    if (!collectibles.length) {
      return null;
    }

    const isExpanded = dropdownState[key];
    return (
      <div
        className="collectibles-items__collection"
        key={`collection-${key}`}
        onClick={() => {
          setDropdownState((_dropdownState) => ({
            ..._dropdownState,
            [key]: !isExpanded,
          }));
        }}
      >
        <Box
          marginBottom={2}
          display={DISPLAY.FLEX}
          alignItems={ALIGN_ITEMS.CENTER}
          justifyContent={JUSTIFY_CONTENT.SPACE_BETWEEN}
          className="collectibles-items__collection-accordion-title"
        >
          <Box
            alignItems={ALIGN_ITEMS.CENTER}
            className="collectibles-items__collection-header"
          >
            {renderCollectionImage(
              isPreviouslyOwnedCollection,
              collectionImage,
              collectionName,
            )}
            <Typography
              color={COLORS.BLACK}
              variant={TYPOGRAPHY.H5}
              margin={[0, 0, 0, 2]}
            >
              {`${collectionName} (${collectibles.length})`}
            </Typography>
          </Box>
          <Box alignItems={ALIGN_ITEMS.FLEX_END}>
            <i className={`fa fa-chevron-${isExpanded ? 'down' : 'right'}`} />
          </Box>
        </Box>
        {isExpanded ? (
          <Box display={DISPLAY.FLEX} flexWrap={FLEX_WRAP.WRAP} gap={4}>
            {collectibles.map((collectible, i) => {
              const { image, address, tokenId, backgroundColor } = collectible;
              const collectibleImage = getAssetImageURL(image, ipfsGateway);
              return (
                <Box
                  width={width}
                  key={`collectible-${i}`}
                  className="collectibles-items__collection-item-wrapper"
                >
                  <div
                    className="collectibles-items__collection-item"
                    style={{
                      backgroundColor,
                    }}
                  >
                    <img
                      onClick={() =>
                        history.push(`${ASSET_ROUTE}/${address}/${tokenId}`)
                      }
                      className="collectibles-items__collection-item-image"
                      src={collectibleImage}
                    />
                  </div>
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
      <Box padding={[6, 4]} flexDirection={FLEX_DIRECTION.COLUMN}>
        <>
          {collectionsKeys.map((key) => {
            const {
              collectibles,
              collectionName,
              collectionImage,
            } = collections[key];

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

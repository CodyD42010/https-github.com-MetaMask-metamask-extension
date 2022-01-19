import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { isEqual } from 'lodash';
import Box from '../../ui/box';
import Button from '../../ui/button';
import Typography from '../../ui/typography/typography';
import CollectiblesDetectionNotice from '../collectibles-detection-notice';
import CollectiblesItems from '../collectibles-items';
import {
  COLORS,
  TYPOGRAPHY,
  TEXT_ALIGN,
  JUSTIFY_CONTENT,
  FLEX_DIRECTION,
  FONT_WEIGHT,
  ALIGN_ITEMS,
} from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  getCollectibles,
  getCollectibleContracts,
  getCollectiblesDetectionNoticeDismissed,
} from '../../../ducks/metamask/metamask';
import { getIsMainnet, getUseCollectibleDetection } from '../../../selectors';
import { EXPERIMENTAL_ROUTE } from '../../../helpers/constants/routes';
import {
  checkAndUpdateAllCollectiblesOwnershipStatus,
  detectCollectibles,
} from '../../../store/actions';
import { usePrevious } from '../../../hooks/usePrevious';

export default function CollectiblesTab({ onAddNFT }) {
  const collectibles = useSelector(getCollectibles);
  const collectibleContracts = useSelector(getCollectibleContracts);
  const useCollectibleDetection = useSelector(getUseCollectibleDetection);
  const isMainnet = useSelector(getIsMainnet);
  const collectibleDetectionNoticeDismissed = useSelector(
    getCollectiblesDetectionNoticeDismissed,
  );
  const history = useHistory();
  const t = useI18nContext();
  const dispatch = useDispatch();
  const [collections, setCollections] = useState({});
  const [previouslyOwnedCollection, setPreviouslyOwnedCollection] = useState({
    collectionName: 'Previously Owned',
    collectibles: [],
  });

  const prevCollectibles = usePrevious(collectibles);
  useEffect(() => {
    const getCollections = () => {
      const newCollections = {};
      const newPreviouslyOwnedCollections = {
        collectionName: 'Previously Owned',
        collectibles: [],
      };

      collectibles.forEach((collectible) => {
        if (collectible?.isCurrentlyOwned === false) {
          newPreviouslyOwnedCollections.collectibles.push(collectible);
        } else if (newCollections[collectible.address]) {
          newCollections[collectible.address].collectibles.push(collectible);
        } else {
          const collectionContract = collectibleContracts.find(
            ({ address }) => address === collectible.address,
          );
          newCollections[collectible.address] = {
            collectionName: collectionContract?.name || collectible.name,
            collectionImage:
              collectionContract?.logo || collectible.collectionImage,
            collectibles: [collectible],
          };
        }
      });
      setCollections(newCollections);
      setPreviouslyOwnedCollection(newPreviouslyOwnedCollections);
    };

    if (!isEqual(prevCollectibles, collectibles)) {
      getCollections();
    }
  }, [collectibles, prevCollectibles, collectibleContracts]);

  const onEnableAutoDetect = () => {
    history.push(EXPERIMENTAL_ROUTE);
  };

  const onRefresh = () => {
    if (isMainnet) {
      dispatch(detectCollectibles());
    }
    checkAndUpdateAllCollectiblesOwnershipStatus();
  };

  return (
    <div className="collectibles-tab">
      {Object.keys(collections).length > 0 ||
      previouslyOwnedCollection.collectibles.length > 0 ? (
        <CollectiblesItems
          collections={collections}
          previouslyOwnedCollection={previouslyOwnedCollection}
        />
      ) : (
        <Box padding={[6, 12, 6, 12]}>
          {isMainnet &&
          !useCollectibleDetection &&
          !collectibleDetectionNoticeDismissed ? (
            <CollectiblesDetectionNotice />
          ) : null}
          <Box justifyContent={JUSTIFY_CONTENT.CENTER}>
            <img src="./images/no-nfts.svg" />
          </Box>
          <Box
            marginTop={4}
            marginBottom={12}
            justifyContent={JUSTIFY_CONTENT.CENTER}
            flexDirection={FLEX_DIRECTION.COLUMN}
          >
            <Typography
              color={COLORS.UI3}
              variant={TYPOGRAPHY.H4}
              align={TEXT_ALIGN.CENTER}
              fontWeight={FONT_WEIGHT.BOLD}
            >
              {t('noNFTs')}
            </Typography>
            <Button
              type="link"
              target="_blank"
              rel="noopener noreferrer"
              href="https://metamask.zendesk.com/hc/en-us/articles/360058238591-NFT-tokens-in-MetaMask-wallet"
              style={{ padding: 0, fontSize: '1rem' }}
            >
              {t('learnMoreUpperCase')}
            </Button>
          </Box>
        </Box>
      )}
      <Box
        marginBottom={4}
        justifyContent={JUSTIFY_CONTENT.CENTER}
        flexDirection={FLEX_DIRECTION.COLUMN}
      >
        <Typography
          color={COLORS.UI3}
          variant={TYPOGRAPHY.H5}
          align={TEXT_ALIGN.CENTER}
        >
          {t('missingNFT')}
        </Typography>
        <Box
          alignItems={ALIGN_ITEMS.CENTER}
          justifyContent={JUSTIFY_CONTENT.CENTER}
        >
          <Box
            className="collectibles-tab__link"
            justifyContent={JUSTIFY_CONTENT.FLEX_END}
          >
            {isMainnet && !useCollectibleDetection ? (
              <Button type="link" onClick={onEnableAutoDetect}>
                {t('enableAutoDetect')}
              </Button>
            ) : (
              <Button type="link" onClick={onRefresh}>
                {t('refreshList')}
              </Button>
            )}
          </Box>
          <Typography
            color={COLORS.UI3}
            variant={TYPOGRAPHY.H4}
            align={TEXT_ALIGN.CENTER}
          >
            {t('or')}
          </Typography>
          <Box
            justifyContent={JUSTIFY_CONTENT.FLEX_START}
            className="collectibles-tab__link"
          >
            <Button type="link" onClick={onAddNFT}>
              {t('importNFTs')}
            </Button>
          </Box>
        </Box>
      </Box>
    </div>
  );
}

CollectiblesTab.propTypes = {
  onAddNFT: PropTypes.func.isRequired,
};

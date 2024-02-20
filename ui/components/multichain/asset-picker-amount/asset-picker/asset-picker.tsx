import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  AvatarTokenSize,
  Icon,
  IconName,
  IconSize,
  AvatarToken,
  Text,
  Box,
} from '../../../component-library';
import { Asset } from '../../../../ducks/send';
import {
  AlignItems,
  BackgroundColor,
  BorderRadius,
  Display,
  TextVariant,
} from '../../../../helpers/constants/design-system';
import { AssetType } from '../../../../../shared/constants/transaction';
import { getNativeCurrencyImage, getTokenList } from '../../../../selectors';
import { getNativeCurrency } from '../../../../ducks/metamask/metamask';
import { AssetPickerModal } from '../asset-picker-modal/asset-picker-modal';

// A component that lets the user pick from a list of assets.
export default function AssetPicker({ asset }: { asset: Asset }) {
  const nativeCurrency = useSelector(getNativeCurrency);
  const nativeCurrencyImage = useSelector(getNativeCurrencyImage);
  const tokenList = useSelector(getTokenList);
  const [showAssetPickerModal, setShowAssetPickerModal] = useState(false);

  const image =
    asset.type === AssetType.native
      ? nativeCurrencyImage
      : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: type 'string' can't be used to index type '{}'
        tokenList?.[asset.details?.address?.toLowerCase()]?.iconUrl ||
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Object is possibly 'undefined'.
        asset.details.image;

  // TODO: Handle long symbols in the UI
  const symbol =
    asset.type === AssetType.native ? nativeCurrency : asset.details?.symbol;

  return (
    <>
      {/* This is the Modal that ask to choose token to send */}
      <AssetPickerModal
        isOpen={showAssetPickerModal}
        onClose={() => setShowAssetPickerModal(false)}
        asset={asset}
      />

      <Box
        className="asset-picker"
        display={Display.Flex}
        alignItems={AlignItems.center}
        padding={2}
        backgroundColor={BackgroundColor.backgroundAlternative}
        borderRadius={BorderRadius.pill}
        onClick={() => setShowAssetPickerModal(true)}
      >
        <AvatarToken src={image} size={AvatarTokenSize.Xs} />
        <Text variant={TextVariant.bodyXs} marginLeft="auto" marginRight="auto">
          {symbol}
        </Text>
        <Icon name={IconName.ArrowDown} size={IconSize.Xs} />
      </Box>
    </>
  );
}

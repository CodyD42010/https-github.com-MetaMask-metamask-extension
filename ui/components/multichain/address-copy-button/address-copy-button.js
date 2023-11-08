import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { useSelector } from 'react-redux';
import { getIsCustodianSupportedChain } from '../../../selectors/institutional/selectors';
import { getProviderConfig } from '../../../ducks/metamask/metamask';
import { ButtonBase, IconName } from '../../component-library';
import {
  BackgroundColor,
  TextVariant,
  TextColor,
  Size,
  BorderRadius,
  AlignItems,
} from '../../../helpers/constants/design-system';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { shortenAddress } from '../../../helpers/utils/util';
import Tooltip from '../../ui/tooltip/tooltip';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { MINUTE } from '../../../../shared/constants/time';

export const AddressCopyButton = ({
  address,
  shorten = false,
  wrap = false,
  onClick,
}) => {
  const checksummedAddress = toChecksumHexAddress(address);
  const displayAddress = shorten
    ? shortenAddress(checksummedAddress)
    : checksummedAddress;
  const [copied, handleCopy] = useCopyToClipboard(MINUTE);
  const t = useI18nContext();

  const isCustodianSupportedChain = useSelector(getIsCustodianSupportedChain);
  const { nickname, type: networkType } = useSelector(getProviderConfig);

  const tooltipTitle = copied ? t('copiedExclamation') : t('copyToClipboard');

  return (
    <Tooltip
      position="bottom"
      title={
        isCustodianSupportedChain
          ? tooltipTitle
          : t('custodyWrongChain', [nickname || networkType])
      }
    >
      <ButtonBase
        disabled={!isCustodianSupportedChain}
        backgroundColor={BackgroundColor.primaryMuted}
        onClick={() => {
          handleCopy(checksummedAddress);
          onClick?.();
        }}
        paddingRight={4}
        paddingLeft={4}
        size={Size.SM}
        variant={TextVariant.bodySm}
        color={TextColor.primaryDefault}
        endIconName={copied ? IconName.CopySuccess : IconName.Copy}
        className={classnames('multichain-address-copy-button', {
          'multichain-address-copy-button__address--wrap': wrap,
        })}
        borderRadius={BorderRadius.pill}
        alignItems={AlignItems.center}
        data-testid="address-copy-button-text"
      >
        {displayAddress}
      </ButtonBase>
    </Tooltip>
  );
};

AddressCopyButton.propTypes = {
  /**
   * Address to be copied
   */
  address: PropTypes.string.isRequired,
  /**
   * Represents if the address should be shortened
   */
  shorten: PropTypes.bool,
  /**
   * Represents if the element should wrap to multiple lines
   */
  wrap: PropTypes.bool,
  /**
   * Fires when the button is clicked
   */
  onClick: PropTypes.func,
};

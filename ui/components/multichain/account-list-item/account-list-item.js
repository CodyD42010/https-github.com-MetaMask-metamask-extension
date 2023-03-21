import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import { useSelector } from 'react-redux';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { getRpcPrefsForCurrentProvider } from '../../../selectors';
import { getURLHostName, shortenAddress } from '../../../helpers/utils/util';

import { AccountListItemMenu } from '..';
import Box from '../../ui/box/box';
import {
  AvatarAccount,
  ButtonIcon,
  Text,
  ICON_NAMES,
  ICON_SIZES,
  AvatarFavicon,
  Tag,
} from '../../component-library';
import {
  Color,
  TEXT_ALIGN,
  AlignItems,
  DISPLAY,
  TextVariant,
  FLEX_DIRECTION,
  BorderRadius,
  JustifyContent,
  Size,
  BorderColor,
} from '../../../helpers/constants/design-system';
import {
  HardwareKeyringTypes,
  HardwareKeyringNames,
} from '../../../../shared/constants/hardware-wallets';
import UserPreferencedCurrencyDisplay from '../../app/user-preferenced-currency-display/user-preferenced-currency-display.component';
import { SECONDARY, PRIMARY } from '../../../helpers/constants/common';
import { findKeyringForAddress } from '../../../ducks/metamask/metamask';
import Tooltip from '../../ui/tooltip/tooltip';

const MAXIMUM_CURRENCY_DECIMALS = 3;
const MAXIMUM_CHARACTERS_WITHOUT_TOOLTIP = 17;

function getLabel(keyring = {}, t) {
  const { type } = keyring;
  switch (type) {
    case HardwareKeyringTypes.qr:
      return HardwareKeyringNames.qr;
    case HardwareKeyringTypes.imported:
      return t('imported');
    case HardwareKeyringTypes.trezor:
      return HardwareKeyringNames.trezor;
    case HardwareKeyringTypes.ledger:
      return HardwareKeyringNames.ledger;
    case HardwareKeyringTypes.lattice:
      return HardwareKeyringNames.lattice;
    default:
      return null;
  }
}

export const AccountListItem = ({
  identity,
  selected = false,
  onClick,
  closeMenu,
  connectedAvatar,
  connectedAvatarName,
}) => {
  const t = useI18nContext();
  const [accountOptionsMenuOpen, setAccountOptionsMenuOpen] = useState(false);
  const ref = useRef(false);
  const keyring = useSelector((state) =>
    findKeyringForAddress(state, identity.address),
  );
  const label = getLabel(keyring, t);

  const rpcPrefs = useSelector(getRpcPrefsForCurrentProvider);
  const { blockExplorerUrl } = rpcPrefs;
  const blockExplorerUrlSubTitle = getURLHostName(blockExplorerUrl);

  return (
    <Box
      display={DISPLAY.FLEX}
      padding={4}
      gap={2}
      backgroundColor={selected ? Color.primaryMuted : Color.transparent}
      className={classnames('multichain-account-list-item', {
        'multichain-account-list-item--selected': selected,
      })}
      as="button"
      onClick={(e) => {
        e.preventDefault();
        // Without this check, the account will be selected after
        // the account options menu closes
        if (!accountOptionsMenuOpen) {
          onClick();
        }
      }}
    >
      {selected && (
        <Box
          className="multichain-account-list-item__selected-indicator"
          borderRadius={BorderRadius.pill}
          backgroundColor={Color.primaryDefault}
        />
      )}
      <AvatarAccount
        borderColor={BorderColor.transparent}
        size={Size.SM}
        address={identity.address}
      ></AvatarAccount>
      <Box
        display={DISPLAY.FLEX}
        flexDirection={FLEX_DIRECTION.COLUMN}
        className="multichain-account-list-item__content"
      >
        <Box display={DISPLAY.FLEX} flexDirection={FLEX_DIRECTION.COLUMN}>
          <Box
            display={DISPLAY.FLEX}
            justifyContent={JustifyContent.spaceBetween}
            gap={2}
          >
            <Text ellipsis as="div">
              {identity.name.length > MAXIMUM_CHARACTERS_WITHOUT_TOOLTIP ? (
                <Tooltip
                  title={identity.name}
                  position="bottom"
                  wrapperClassName="multichain-account-list-item__tooltip"
                >
                  {identity.name}
                </Tooltip>
              ) : (
                identity.name
              )}
            </Text>
            <Box
              display={DISPLAY.FLEX}
              flexDirection={FLEX_DIRECTION.ROW}
              alignItems={AlignItems.center}
            >
              {connectedAvatar ? (
                <AvatarFavicon
                  size={Size.XS}
                  src={connectedAvatar}
                  name={connectedAvatarName}
                  marginInlineEnd={2}
                />
              ) : null}
              <Text textAlign={TEXT_ALIGN.END} as="div">
                <UserPreferencedCurrencyDisplay
                  ethNumberOfDecimals={MAXIMUM_CURRENCY_DECIMALS}
                  value={identity.balance}
                  type={SECONDARY}
                />
              </Text>
            </Box>
          </Box>
        </Box>
        <Box
          display={DISPLAY.FLEX}
          justifyContent={JustifyContent.spaceBetween}
        >
          <Text variant={TextVariant.bodySm} color={Color.textAlternative}>
            {shortenAddress(identity.address)}
          </Text>
          <Text
            variant={TextVariant.bodySm}
            color={Color.textAlternative}
            textAlign={TEXT_ALIGN.END}
            as="div"
          >
            <UserPreferencedCurrencyDisplay
              ethNumberOfDecimals={MAXIMUM_CURRENCY_DECIMALS}
              value={identity.balance}
              type={PRIMARY}
            />
          </Text>
        </Box>
        {label ? (
          <Tag
            label={label}
            labelProps={{
              variant: TextVariant.bodyXs,
              color: Color.textAlternative,
            }}
          />
        ) : null}
      </Box>
      <div ref={ref}>
        <ButtonIcon
          ariaLabel={`${identity.name} ${t('options')}`}
          iconName={ICON_NAMES.MORE_VERTICAL}
          size={ICON_SIZES.SM}
          onClick={(e) => {
            e.stopPropagation();
            setAccountOptionsMenuOpen(true);
          }}
          as="div"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              setAccountOptionsMenuOpen(true);
            }
          }}
          data-testid="account-list-item-menu-button"
        />
        {accountOptionsMenuOpen ? (
          <AccountListItemMenu
            anchorElement={ref.current}
            blockExplorerUrlSubTitle={blockExplorerUrlSubTitle}
            identity={identity}
            onClose={() => setAccountOptionsMenuOpen(false)}
            isRemovable={keyring?.type !== HardwareKeyringTypes.hdKeyTree}
            closeMenu={closeMenu}
          />
        ) : null}
      </div>
    </Box>
  );
};

AccountListItem.propTypes = {
  /**
   * Identity of the account
   */
  identity: PropTypes.shape({
    name: PropTypes.string.isRequired,
    address: PropTypes.string.isRequired,
    balance: PropTypes.string.isRequired,
  }).isRequired,
  /**
   * Represents if this account is currently selected
   */
  selected: PropTypes.bool,
  /**
   * Function to execute when the item is clicked
   */
  onClick: PropTypes.func.isRequired,
  /**
   * Function that closes the menu
   */
  closeMenu: PropTypes.func,
  /**
   * File location of the avatar icon
   */
  connectedAvatar: PropTypes.string,
  /**
   * Text used as the avatar alt text
   */
  connectedAvatarName: PropTypes.string,
};

AccountListItem.displayName = 'AccountListItem';

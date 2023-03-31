import PropTypes from 'prop-types';
import React, { useState, useEffect, useRef } from 'react';
import copy from 'copy-to-clipboard';
import Button from '../../../../components/ui/button';
import CustodyLabels from '../../../../components/institutional/custody-labels';
import { SWAPS_CHAINID_DEFAULT_BLOCK_EXPLORER_URL_MAP } from '../../../../../shared/constants/swaps';
import { CHAIN_IDS } from '../../../../../shared/constants/network';
import { SECOND } from '../../../../../shared/constants/time';
import { shortenAddress } from '../../../../helpers/utils/util';
import Tooltip from '../../../../components/ui/tooltip';
import {
  Color,
  TextVariant,
  JustifyContent,
  BLOCK_SIZES,
  DISPLAY,
} from '../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import Box from '../../../../components/ui/box';
import {
  Text,
  Label,
  Icon,
  ICON_NAMES,
  ICON_SIZES,
  ButtonLink,
} from '../../../../components/component-library';

export default function CustodyAccountList({
  rawList,
  accounts,
  onAccountChange,
  selectedAccounts,
  onCancel,
  onAddAccounts,
  custody,
}) {
  const timerRef = useRef(null);
  const t = useI18nContext();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const getButtonLinkHref = (account) => {
    const url = SWAPS_CHAINID_DEFAULT_BLOCK_EXPLORER_URL_MAP[CHAIN_IDS.MAINNET];
    return `${url}address/${account.address}`;
  };

  const copyAddressButton = (account) => {
    setCopied(true);
    timerRef.current = setTimeout(() => setCopied(false), SECOND * 3);
    copy(account.address);
  };

  const renderAccounts = () => {
    const tooltipText = copied ? t('copiedExclamation') : t('copyToClipboard');

    return (
      <Box
        display={DISPLAY.FLEX}
        flexDirection={['column']}
        width={BLOCK_SIZES.FULL}
        className="custody-account-list"
        data-testid="custody-account-list"
      >
        {accounts.map((account, idx) => (
          <Box
            display={DISPLAY.FLEX}
            className="custody-account-list__item"
            key={account.address}
          >
            <Box
              display={DISPLAY.FLEX}
              alignItems={['flex-start']}
              data-testid="custody-account-list-item-radio-button"
            >
              {!rawList && (
                <input
                  type="checkbox"
                  name="selectedAccount"
                  id={`address-${idx}`}
                  value={account.address}
                  onChange={(e) =>
                    onAccountChange({
                      name: account.name,
                      address: e.target.value,
                      custodianDetails: account.custodianDetails,
                      labels: account.labels,
                      chainId: account.chainId,
                    })
                  }
                  checked={
                    selectedAccounts && selectedAccounts[account.address]
                  }
                />
              )}
            </Box>
            <Box
              display={DISPLAY.FLEX}
              flexDirection={['column']}
              marginLeft={2}
              width={BLOCK_SIZES.FULL}
            >
              <Label
                display={DISPLAY.FLEX}
                justifyContent={JustifyContent.center}
                marginTop={2}
                marginLeft={2}
                htmlFor={`address-${idx}`}
                className="custody-account-list__item__title"
              >
                <Text
                  as="span"
                  variant={TextVariant.inherit}
                  size={TextVariant.bodySm}
                  paddingRight={1}
                  className="custody-account-list__item__name"
                >
                  {account.name}
                </Text>
              </Label>
              <Label
                display={DISPLAY.FLEX}
                size={TextVariant.bodySm}
                marginTop={2}
                marginRight={3}
                htmlFor={`address-${idx}`}
              >
                <Text
                  as="span"
                  variant={TextVariant.bodyMd}
                  display={DISPLAY.FLEX}
                  className="custody-account-list__item"
                >
                  <ButtonLink
                    href={getButtonLinkHref(account)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {shortenAddress(account.address)}
                    <Icon
                      name={ICON_NAMES.EXPORT}
                      size={ICON_SIZES.SM}
                      color={Color.primaryDefault}
                      marginLeft={1}
                    />
                  </ButtonLink>
                  <Tooltip
                    position="bottom"
                    title={tooltipText}
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <button
                      className="custody-account-list__item__clipboard"
                      onClick={() => copyAddressButton(account)}
                    >
                      <Icon
                        name={ICON_NAMES.COPY}
                        size={ICON_SIZES.XS}
                        color={Color.iconMuted}
                      />
                    </button>
                  </Tooltip>
                </Text>
              </Label>
              <Box
                display={DISPLAY.FLEX}
                justifyContent={JustifyContent.spaceBetween}
              >
                {account.labels && (
                  <CustodyLabels
                    labels={account.labels}
                    index={idx.toString()}
                    hideNetwork
                  />
                )}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  const renderButtons = () => {
    const disabled = Object.keys(selectedAccounts).length === 0;
    const buttonProps = {};
    if (disabled) {
      buttonProps.disabled = true;
    }

    return (
      <Box
        display={DISPLAY.FLEX}
        width={BLOCK_SIZES.FULL}
        justifyContent={JustifyContent.spaceBetween}
        paddingTop={5}
        paddingRight={7}
        paddingBottom={7}
        paddingLeft={7}
        className="custody-account-list__buttons"
      >
        <Button
          data-testid="custody-account-cancel-button"
          type="default"
          large
          className="custody-account-list__button"
          onClick={onCancel}
        >
          {t('cancel')}
        </Button>
        <Button
          data-testid="custody-account-connect-button"
          type="primary"
          large
          className="custody-account-list__button"
          disabled={disabled}
          onClick={() => onAddAccounts(custody)}
        >
          {t('connect')}
        </Button>
      </Box>
    );
  };

  return (
    <>
      <Box paddingTop={4} paddingRight={7} paddingBottom={7} paddingLeft={7}>
        {renderAccounts()}
      </Box>
      {!rawList && renderButtons()}
    </>
  );
}

CustodyAccountList.propTypes = {
  custody: PropTypes.string,
  accounts: PropTypes.array.isRequired,
  onAccountChange: PropTypes.func,
  selectedAccounts: PropTypes.object,
  onAddAccounts: PropTypes.func,
  onCancel: PropTypes.func,
  rawList: PropTypes.bool,
};

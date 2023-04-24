import React from 'react';
import PropTypes from 'prop-types';
import { Redirect } from 'react-router-dom';

import Identicon from '../../../../components/ui/identicon';
import Button from '../../../../components/ui/button/button.component';

import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '../../../../components/component-library';

import Tooltip from '../../../../components/ui/tooltip';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { IconColor } from '../../../../helpers/constants/design-system';

function quadSplit(address) {
  return `0x${address
    .slice(2)
    .match(/.{1,4}/gu)
    .join('')}`;
}

function ViewContact({
  history,
  name,
  address,
  checkSummedAddress,
  memo,
  editRoute,
  listRoute,
}) {
  const t = useI18nContext();
  const [copied, handleCopy] = useCopyToClipboard();

  if (!address) {
    return <Redirect to={{ pathname: listRoute }} />;
  }

  return (
    <div className="settings-page__content-row">
      <div className="settings-page__content-item">
        <div className="settings-page__header address-book__header">
          <Identicon address={address} diameter={60} />
          <div className="address-book__header__name">{name || address}</div>
        </div>
        <div className="address-book__view-contact__group">
          <Button
            type="secondary"
            onClick={() => {
              history.push(`${editRoute}/${address}`);
            }}
          >
            {t('edit')}
          </Button>
        </div>
        <div className="address-book__view-contact__group">
          <div className="address-book__view-contact__group__label">
            {t('ethereumPublicAddress')}
          </div>
          <div className="address-book__view-contact__group__value">
            <div className="address-book__view-contact__group__static-address">
              {quadSplit(checkSummedAddress)}
            </div>
            <Tooltip
              position="bottom"
              title={copied ? t('copiedExclamation') : t('copyToClipboard')}
            >
              <ButtonIcon
                ariaLabel="copy"
                className="address-book__view-contact__group__static-address--copy-icon"
                onClick={() => {
                  handleCopy(checkSummedAddress);
                }}
                iconName={copied ? IconName.CopySuccess : IconName.Copy}
                size={ButtonIconSize.Lg}
                color={IconColor.primaryDefault}
              />
            </Tooltip>
          </div>
        </div>
        <div className="address-book__view-contact__group">
          <div className="address-book__view-contact__group__label--capitalized">
            {t('memo')}
          </div>
          <div className="address-book__view-contact__group__static-address">
            {memo}
          </div>
        </div>
      </div>
    </div>
  );
}

ViewContact.propTypes = {
  name: PropTypes.string,
  address: PropTypes.string,
  history: PropTypes.object,
  checkSummedAddress: PropTypes.string,
  memo: PropTypes.string,
  editRoute: PropTypes.string,
  listRoute: PropTypes.string.isRequired,
};

export default React.memo(ViewContact);

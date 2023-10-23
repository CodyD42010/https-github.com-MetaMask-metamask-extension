import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import { getSelectedIdentity } from '../../../../../selectors';
import { Label } from '../../../../component-library';
import { AccountPicker } from '../../../account-picker';
import {
  BlockSize,
  BorderColor,
  Display,
  JustifyContent,
  TextAlign,
} from '../../../../../helpers/constants/design-system';
import { I18nContext } from '../../../../../contexts/i18n';
import { SendPageRow } from '.';

export const SendPageAccountPicker = () => {
  const t = useContext(I18nContext);
  const identity = useSelector(getSelectedIdentity);

  return (
    <SendPageRow>
      <Label paddingBottom={2}>{t('from')}</Label>
      <AccountPicker
        address={identity.address}
        name={identity.name}
        onClick={() => undefined}
        showAddress
        borderColor={BorderColor.borderDefault}
        borderWidth={1}
        paddingTop={4}
        paddingBottom={4}
        block
        justifyContent={JustifyContent.flexStart}
        addressProps={{
          display: Display.Flex,
          textAlign: TextAlign.Start,
        }}
        labelProps={{
          style: { flexGrow: 1, textAlign: 'start' },
          paddingInlineStart: 2,
        }}
        textProps={{
          display: Display.Flex,
          width: BlockSize.Full,
        }}
        width={BlockSize.Full}
      />
    </SendPageRow>
  );
};

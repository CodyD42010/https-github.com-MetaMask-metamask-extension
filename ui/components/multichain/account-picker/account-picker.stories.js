import React from 'react';
import { AccountPicker } from '.';
import {
  AlignItems,
  BorderColor,
  BorderRadius,
  TextAlign,
} from '../../../helpers/constants/design-system';

const CHAOS_ACCOUNT = {
  address: '"0xb19ac54efa18cc3a14a5b821bfec73d284bf0c5e"',
  name: 'Account That Has A Really Really Really Really Really Long Name',
};

export default {
  title: 'Components/Multichain/AccountPicker',
  component: AccountPicker,
  argTypes: {
    name: {
      control: 'string',
    },
    address: {
      control: 'string',
    },
    onClick: {
      action: 'onClick',
    },
  },
  args: {
    address: '0xb19ac54efa18cc3a14a5b821bfec73d284bf0c5e',
    name: 'Account 1',
    onClick: () => undefined,
  },
};

export const DefaultStory = (args) => <AccountPicker {...args} />;
DefaultStory.storyName = 'Default';

export const WithAddressStory = (args) => <AccountPicker {...args} />;
WithAddressStory.storyName = 'With Address';
WithAddressStory.args = {
  showAddress: true,
};

export const ChaosStory = (args) => (
  <div
    style={{ maxWidth: '300px', border: '1px solid var(--color-border-muted)' }}
  >
    <AccountPicker {...args} />
  </div>
);
ChaosStory.storyName = 'Chaos';
ChaosStory.args = { name: CHAOS_ACCOUNT.name };

export const ChaosWithAddressStory = (args) => (
  <div
    style={{ maxWidth: '300px', border: '1px solid var(--color-border-muted)' }}
  >
    <AccountPicker {...args} />
  </div>
);
ChaosWithAddressStory.storyName = 'Chaos with Address';
ChaosWithAddressStory.args = { name: CHAOS_ACCOUNT.name, showAddress: true };

export const CustomAccountPicker = (args) => (
  <AccountPicker
    {...args}
    style={{ height: 'auto' }} // add via a custom className
    showAddress
    borderRadius={BorderRadius.MD}
    borderColor={BorderColor.borderDefault}
    paddingTop={3}
    paddingBottom={3}
    labelProps={{ textAlign: TextAlign.Left }}
    block
    endIconProps={{
      marginLeft: 'auto',
    }}
    textProps={{
      gap: 2,
    }}
  />
);

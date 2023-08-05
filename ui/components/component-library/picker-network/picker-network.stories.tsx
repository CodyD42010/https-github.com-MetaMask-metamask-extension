import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import {
  Display,
  FlexDirection,
} from '../../../helpers/constants/design-system';

import { Box } from '..';
import README from './README.mdx';
import { PickerNetwork } from './picker-network';

export default {
  title: 'Components/ComponentLibrary/PickerNetwork',
  component: PickerNetwork,
  parameters: {
    docs: {
      page: README,
    },
  },
  argTypes: {
    label: {
      control: 'text',
    },
    src: {
      control: 'text',
    },
  },
  args: {
    label: 'Avalanche C-Chain',
    src: './images/avax-token.png',
  },
} as Meta<typeof PickerNetwork>;

export const DefaultStory = (args) => <PickerNetwork {...args} />;

export const Label: StoryFn<typeof PickerNetwork> = (args) => (
  <Box display={Display.Flex} flexDirection={FlexDirection.Column} gap={2}>
    <PickerNetwork {...args} label="Arbitrum One" />
    <PickerNetwork {...args} label="Polygon Mainnet" />
    <PickerNetwork {...args} label="Optimism" />
    <PickerNetwork
      {...args}
      label="BNB Smart Chain (previously Binance Smart Chain Mainnet)"
      style={{ maxWidth: '200px' }}
    />
  </Box>
);

export const Src: StoryFn<typeof PickerNetwork> = (args) => (
  <Box display={Display.Flex} flexDirection={FlexDirection.Column} gap={2}>
    <PickerNetwork {...args} label="Arbitrum One" src="./images/arbitrum.svg" />
    <PickerNetwork
      {...args}
      label="Polygon Mainnet"
      src="./images/matic-token.png"
    />
    <PickerNetwork {...args} label="Optimism" src="./images/optimism.svg" />
  </Box>
);

DefaultStory.storyName = 'Default';

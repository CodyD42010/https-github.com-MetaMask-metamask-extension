import React, { useState } from 'react';
import {
  DISPLAY,
  FLEX_DIRECTION,
  Size,
  AlignItems,
  IconColor,
} from '../../../helpers/constants/design-system';

import Box from '../../ui/box';

import { Icon, ICON_NAMES, TextField } from '..';

import { Label } from './label';

import README from './README.mdx';

export default {
  title: 'Components/ComponentLibrary/Label',

  component: Label,
  parameters: {
    docs: {
      page: README,
    },
  },
  argTypes: {
    htmlFor: {
      control: 'text',
    },
    required: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    children: {
      control: 'text',
    },
    className: {
      control: 'text',
    },
  },
  args: {
    children: 'Label',
  },
};

const Template = (args) => <Label {...args} />;

export const DefaultStory = Template.bind({});
DefaultStory.storyName = 'Default';

export const Children = (args) => (
  <Box
    display={DISPLAY.INLINE_FLEX}
    flexDirection={FLEX_DIRECTION.COLUMN}
    gap={2}
  >
    <Label {...args}>Plain text</Label>
    <Label {...args} display={DISPLAY.FLEX} alignItems={AlignItems.flexStart}>
      Text and icon
      <Icon
        color={IconColor.iconAlternative}
        name={ICON_NAMES.INFO}
        size={Size.inherit}
      />
    </Label>
    <Label
      {...args}
      display={DISPLAY.INLINE_FLEX}
      flexDirection={FLEX_DIRECTION.COLUMN}
      alignItems={AlignItems.flexStart}
    >
      Label that wraps an input
      <TextField placeholder="Click label to focus" />
    </Label>
  </Box>
);

export const HtmlFor = (args) => {
  const [value, setValue] = useState('');
  const handleOnChange = (e) => {
    setValue(e.target.value);
  };
  return (
    <Box display={DISPLAY.INLINE_FLEX} flexDirection={FLEX_DIRECTION.COLUMN}>
      <Label {...args} />
      <TextField
        id="add-network"
        value={value}
        onChange={handleOnChange}
        placeholder="Enter network name"
      />
    </Box>
  );
};
HtmlFor.args = {
  children: 'Network name',
  htmlFor: 'add-network',
};

export const Required = Template.bind({});
Required.args = {
  required: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
};

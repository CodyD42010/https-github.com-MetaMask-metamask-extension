import React from 'react';
import {
  AlignItems,
  Color,
  DISPLAY,
  FLEX_DIRECTION,
  Size,
} from '../../../helpers/constants/design-system';
import Box from '../../ui/box/box';
import { ICON_NAMES } from '../icon';
import { BUTTON_ICON_SIZES } from './button-icon.constants';
import { ButtonIcon } from './button-icon';
import README from './README.mdx';

const marginSizeControlOptions = [
  undefined,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  'auto',
];

export default {
  title: 'Components/ComponentLibrary/ButtonIcon',

  component: ButtonIcon,
  parameters: {
    docs: {
      page: README,
    },
  },
  argTypes: {
    ariaLabel: {
      control: 'text',
    },
    as: {
      control: 'select',
      options: ['button', 'a'],
    },
    className: {
      control: 'text',
    },
    color: {
      control: 'select',
      options: Object.values(Color),
    },
    disabled: {
      control: 'boolean',
    },
    href: {
      control: 'text',
    },
    iconName: {
      control: 'select',
      options: Object.values(ICON_NAMES),
    },
    size: {
      control: 'select',
      options: Object.values(BUTTON_ICON_SIZES),
    },
    marginTop: {
      options: marginSizeControlOptions,
      control: 'select',
      table: { category: 'box props' },
    },
    marginRight: {
      options: marginSizeControlOptions,
      control: 'select',
      table: { category: 'box props' },
    },
    marginBottom: {
      options: marginSizeControlOptions,
      control: 'select',
      table: { category: 'box props' },
    },
    marginLeft: {
      options: marginSizeControlOptions,
      control: 'select',
      table: { category: 'box props' },
    },
  },
};

export const DefaultStory = (args) => <ButtonIcon {...args} />;

DefaultStory.args = {
  iconName: ICON_NAMES.CLOSE,
  ariaLabel: 'Close',
};

DefaultStory.storyName = 'Default';

export const IconName = (args) => <ButtonIcon {...args} />;

IconName.args = {
  iconName: ICON_NAMES.CLOSE,
  ariaLabel: 'Close',
};

export const SizeStory = (args) => (
  <Box
    display={DISPLAY.FLEX}
    alignItems={AlignItems.baseline}
    gap={1}
    marginBottom={2}
  >
    <ButtonIcon
      {...args}
      size={Size.SM}
      iconName={ICON_NAMES.CLOSE}
      ariaLabel="Close"
    />
    <ButtonIcon
      {...args}
      size={Size.LG}
      color={Color.primaryDefault}
      iconName={ICON_NAMES.CLOSE}
      ariaLabel="Close"
    />
  </Box>
);

SizeStory.storyName = 'Size';

export const AriaLabel = (args) => (
  <>
    <ButtonIcon
      as="button"
      iconName={ICON_NAMES.CLOSE}
      ariaLabel="Close"
      {...args}
    />
    <ButtonIcon
      as="a"
      href="https://metamask.io/"
      target="_blank"
      color={Color.primaryDefault}
      iconName={ICON_NAMES.EXPORT}
      ariaLabel="Visit MetaMask.io"
      {...args}
    />
  </>
);

export const As = (args) => (
  <Box display={DISPLAY.FLEX} flexDirection={FLEX_DIRECTION.ROW} gap={2}>
    <ButtonIcon {...args} iconName={ICON_NAMES.CLOSE} ariaLabel="close" />
    <ButtonIcon
      as="a"
      href="#"
      {...args}
      color={Color.primaryDefault}
      iconName={ICON_NAMES.EXPORT}
      ariaLabel="demo"
    />
  </Box>
);

export const Href = (args) => (
  <ButtonIcon iconName={ICON_NAMES.EXPORT} {...args} target="_blank" />
);

Href.args = {
  ariaLabel: 'Visit Metamask.io',
  href: 'https://metamask.io/',
  color: Color.primaryDefault,
};

export const ColorStory = (args) => (
  <ButtonIcon {...args} iconName={ICON_NAMES.CLOSE} ariaLabel="close" />
);
ColorStory.storyName = 'Color';

ColorStory.args = {
  color: Color.primaryDefault,
};

export const Disabled = (args) => (
  <ButtonIcon {...args} iconName={ICON_NAMES.CLOSE} ariaLabel="close" />
);

Disabled.args = {
  disabled: true,
};

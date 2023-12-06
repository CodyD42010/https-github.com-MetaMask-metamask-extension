import { StoryFn, Meta } from '@storybook/react';
import React from 'react';
import { Box } from '../box';
import {
  Display,
  FlexDirection,
} from '../../../helpers/constants/design-system';
import README from './README.mdx';

import { ContainerMaxWidth } from './container.types';
import { Container } from '.';

export default {
  title: 'Components/ComponentLibrary/Container',
  component: Container,
  parameters: {
    docs: {
      page: README,
    },
  },
  argTypes: {},
  args: {
    children:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam aliquam, nisl eget aliquam ultrices, nunc nunc aliquam nunc, vitae aliquam nunc nunc eget nunc. Nullam aliquam, nisl eget aliquam ultrices, nunc nunc aliquam nunc, vitae aliquam nunc nunc eget nunc.',
  },
} as Meta<typeof Container>;

const Template: StoryFn<typeof Container> = (args) => {
  return <Container {...args} />;
};

export const DefaultStory = Template.bind({});
DefaultStory.storyName = 'Default';

export const MaxWidth: StoryFn<typeof Container> = (args) => {
  return (
    <Box display={Display.Flex} flexDirection={FlexDirection.Column} gap={8}>
      <Container maxWidth={ContainerMaxWidth.Sm} {...args}>
        Small breakpoint: Lorem ipsum dolor sit amet, consectetur adipiscing
        elit. Nullam aliquam, nisl eget aliquam ultrices, nunc nunc aliquam
        nunc, vitae aliquam nunc nunc eget nunc. Nullam aliquam, nisl eget
        aliquam ultrices, nunc nunc aliquam nunc, vitae aliquam nunc nunc eget
        nunc.
      </Container>
      <Container maxWidth={ContainerMaxWidth.Md} {...args}>
        Medium breakpoint: Lorem ipsum dolor sit amet, consectetur adipiscing
        elit. Nullam aliquam, nisl eget aliquam ultrices, nunc nunc aliquam
        nunc, vitae aliquam nunc nunc eget nunc. Nullam aliquam, nisl eget
        aliquam ultrices, nunc nunc aliquam nunc, vitae aliquam nunc nunc eget
        nunc.
      </Container>
      <Container maxWidth={ContainerMaxWidth.Lg} {...args}>
        Large breakpoint: Lorem ipsum dolor sit amet, consectetur adipiscing
        elit. Nullam aliquam, nisl eget aliquam ultrices, nunc nunc aliquam
        nunc, vitae aliquam nunc nunc eget nunc. Nullam aliquam, nisl eget
        aliquam ultrices, nunc nunc aliquam nunc, vitae aliquam nunc nunc eget
        nunc.
      </Container>
      <Container {...args}>
        No breakpoint: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Nullam aliquam, nisl eget aliquam ultrices, nunc nunc aliquam nunc,
        vitae aliquam nunc nunc eget nunc. Nullam aliquam, nisl eget aliquam
        ultrices, nunc nunc aliquam nunc, vitae aliquam nunc nunc eget nunc.
      </Container>
    </Box>
  );
};
MaxWidth.args = {};

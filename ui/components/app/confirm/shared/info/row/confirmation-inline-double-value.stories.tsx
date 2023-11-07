import React from 'react';
import { ConfirmationRow } from './confirmation-row';
import { ConfirmationInlineDoubleValue } from './confirmation-inline-double-value';

const ConfirmationInlineDoubleValueStory = {
  title: 'Components/App/Confirmations/Inline Double Value',

  component: ConfirmationInlineDoubleValue,
  argTypes: {
    left: {
      control: 'text',
    },
    right: {
      control: 'text',
    },
  },
};

export const DefaultStory = (args) => (
  <ConfirmationRow label="Account">
    <ConfirmationInlineDoubleValue {...args} />
  </ConfirmationRow>
);

DefaultStory.storyName = 'Default';

DefaultStory.args = {
  left: '$834.32',
  right: '0.05 ETH',
};

export default ConfirmationInlineDoubleValueStory;

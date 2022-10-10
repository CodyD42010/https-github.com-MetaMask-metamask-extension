/* eslint-disable jest/require-top-level-describe */
import { render, screen } from '@testing-library/react';
import React from 'react';

import { AvatarFavicon } from './avatar-favicon';

describe('AvatarFavicon', () => {
  const args = {
    imageSource: './images/eth_logo.svg',
  };

  it('should render correctly', () => {
    const { getByTestId } = render(
      <AvatarFavicon data-testid="avatar-favicon" />,
    );
    expect(getByTestId('avatar-favicon')).toBeDefined();
  });

  it('should render image of Avatar Favicon', () => {
    render(<AvatarFavicon data-testid="avatar-favicon" {...args} />);
    const image = screen.getByRole('img');
    expect(image).toBeDefined();
    expect(image).toHaveAttribute('src', args.imageSource);
  });

  it('should render fallback image if no ImageSource is provided', () => {
    render(<AvatarFavicon data-testid="avatar-favicon" />);
    const image = screen.getByRole('img');
    expect(image).toBeDefined();
    expect(image).toHaveAttribute(
      'src',
      './images/icons/icon-global-filled.svg',
    );
  });
});

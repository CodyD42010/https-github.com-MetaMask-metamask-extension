/* eslint-disable jest/require-top-level-describe */
import { render, screen } from '@testing-library/react';
import React from 'react';

import { Color, TextColor } from '../../../helpers/constants/design-system';

import { AvatarBase } from './avatar-base';

describe('AvatarBase', () => {
  it('should render correctly', () => {
    const { getByTestId, container } = render(
      <AvatarBase data-testid="avatar-base" />,
    );
    expect(getByTestId('avatar-base')).toBeDefined();
    expect(container).toMatchSnapshot();
  });
  it('should render with different size classes', () => {
    const { getByTestId } = render(
      <>
        <AvatarBase size="xs" data-testid="avatar-base-xs" />
        <AvatarBase size="sm" data-testid="avatar-base-sm" />
        <AvatarBase size="md" data-testid="avatar-base-md" />
        <AvatarBase size="lg" data-testid="avatar-base-lg" />
        <AvatarBase size="xl" data-testid="avatar-base-xl" />
      </>,
    );
    expect(getByTestId('avatar-base-xs')).toHaveClass(
      'mm-avatar-base--size-xs mm-text--body-xs',
    );
    expect(getByTestId('avatar-base-sm')).toHaveClass(
      'mm-avatar-base--size-sm  mm-text--body-sm',
    );
    expect(getByTestId('avatar-base-md')).toHaveClass(
      'mm-avatar-base--size-md  mm-text--body-sm',
    );
    expect(getByTestId('avatar-base-lg')).toHaveClass(
      'mm-avatar-base--size-lg mm-text--body-lg-medium',
    );
    expect(getByTestId('avatar-base-xl')).toHaveClass(
      'mm-avatar-base--size-xl mm-text--body-lg-medium',
    );
  });
  // className
  it('should render with custom className', () => {
    const { getByTestId } = render(
      <AvatarBase data-testid="avatar-base" className="test-class" />,
    );
    expect(getByTestId('avatar-base')).toHaveClass('test-class');
  });
  // children
  it('should render children', () => {
    render(
      <AvatarBase data-testid="avatar-base">
        <img width="100%" src="./images/arbitrum.svg" />
      </AvatarBase>,
    );
    const image = screen.getByRole('img');
    expect(image).toBeDefined();
    expect(image).toHaveAttribute('src', './images/arbitrum.svg');
  });
  // color
  it('should render with different colors', () => {
    const { getByTestId } = render(
      <>
        <AvatarBase
          color={TextColor.successDefault}
          data-testid={TextColor.successDefault}
        />
        <AvatarBase
          color={TextColor.errorDefault}
          data-testid={TextColor.errorDefault}
        />
      </>,
    );
    expect(getByTestId(TextColor.successDefault)).toHaveClass(
      `box--color-${TextColor.successDefault}`,
    );
    expect(getByTestId(TextColor.errorDefault)).toHaveClass(
      `box--color-${TextColor.errorDefault}`,
    );
  });
  // background color
  it('should render with different background colors', () => {
    const { getByTestId } = render(
      <>
        <AvatarBase
          backgroundColor={TextColor.successDefault}
          data-testid={Color.successDefault}
        />
        <AvatarBase
          backgroundColor={TextColor.errorDefault}
          data-testid={Color.errorDefault}
        />
      </>,
    );
    expect(getByTestId(Color.successDefault)).toHaveClass(
      `box--background-color-${Color.successDefault}`,
    );
    expect(getByTestId(Color.errorDefault)).toHaveClass(
      `box--background-color-${Color.errorDefault}`,
    );
  });
  // border color
  it('should render with different border colors', () => {
    const { getByTestId } = render(
      <>
        <AvatarBase
          borderColor={Color.successDefault}
          data-testid={Color.successDefault}
        />
        <AvatarBase
          borderColor={Color.errorDefault}
          data-testid={Color.errorDefault}
        />
      </>,
    );
    expect(getByTestId(Color.successDefault)).toHaveClass(
      `box--border-color-${Color.successDefault}`,
    );
    expect(getByTestId(Color.errorDefault)).toHaveClass(
      `box--border-color-${Color.errorDefault}`,
    );
  });
  it('should forward a ref to the root html element', () => {
    const ref = React.createRef();
    render(<AvatarBase ref={ref}>A</AvatarBase>);
    expect(ref.current).not.toBeNull();
    expect(ref.current.nodeName).toBe('DIV');
  });
});

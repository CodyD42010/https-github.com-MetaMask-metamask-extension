/* eslint-disable jest/require-top-level-describe */
import { render } from '@testing-library/react';
import React from 'react';
import { ButtonPrimary } from './button-primary';
import { BUTTON_SIZES } from './button-primary.constants';

describe('ButtonPrimary', () => {
  it('should render button element correctly', () => {
    const { getByTestId, container } = render(
      <ButtonPrimary data-testid="button-primary" />,
    );
    expect(getByTestId('button-primary')).toBeDefined();
    expect(container.querySelector('button')).toBeDefined();
    expect(getByTestId('button-primary')).toHaveClass('mm-button');
  });

  it('should render anchor element correctly', () => {
    const { getByTestId, container } = render(
      <ButtonPrimary as="a" data-testid="button-primary" />,
    );
    expect(getByTestId('button-primary')).toBeDefined();
    expect(container.querySelector('button')).toBeDefined();
    expect(getByTestId('button-primary')).toHaveClass('mm-button');
  });

  it('should render button as block', () => {
    const { getByTestId } = render(<ButtonPrimary block data-testid="block" />);
    expect(getByTestId('block')).toHaveClass(`mm-button--block`);
  });

  it('should render with different size classes', () => {
    const { getByTestId } = render(
      <>
        <ButtonPrimary size={BUTTON_SIZES.SM} data-testid={BUTTON_SIZES.SM} />
        <ButtonPrimary size={BUTTON_SIZES.MD} data-testid={BUTTON_SIZES.MD} />
        <ButtonPrimary size={BUTTON_SIZES.LG} data-testid={BUTTON_SIZES.LG} />
      </>,
    );

    expect(getByTestId(BUTTON_SIZES.SM)).toHaveClass(
      `mm-button--size-${BUTTON_SIZES.SM}`,
    );
    expect(getByTestId(BUTTON_SIZES.MD)).toHaveClass(
      `mm-button--size-${BUTTON_SIZES.MD}`,
    );
    expect(getByTestId(BUTTON_SIZES.LG)).toHaveClass(
      `mm-button--size-${BUTTON_SIZES.LG}`,
    );
  });

  it('should render with different types', () => {
    const { getByTestId } = render(
      <>
        <ButtonPrimary danger data-testid="danger" />
      </>,
    );

    expect(getByTestId('danger')).toHaveClass('mm-button-primary--type-danger');
  });

  it('should render with different button states', () => {
    const { getByTestId } = render(
      <>
        <ButtonPrimary loading data-testid="loading" />
        <ButtonPrimary disabled data-testid="disabled" />
      </>,
    );
    expect(getByTestId('loading')).toHaveClass(`mm-button--loading`);
    expect(getByTestId('disabled')).toHaveClass(`mm-button--disabled`);
  });
  it('should render with icon', () => {
    const { container } = render(
      <ButtonPrimary data-testid="icon" icon="add-square-filled" />,
    );

    const icons = container.getElementsByClassName('icon').length;
    expect(icons).toBe(1);
  });
});

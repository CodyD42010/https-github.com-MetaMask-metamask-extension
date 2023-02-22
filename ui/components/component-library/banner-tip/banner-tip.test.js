/* eslint-disable jest/require-top-level-describe */
import { render } from '@testing-library/react';
import React from 'react';

import { renderWithUserEvent } from '../../../../test/lib/render-helpers';

import { BannerTip, BANNER_TIP_LOGOS } from '.';

describe('BannerTip', () => {
  it('should render BannerTip element correctly', () => {
    const { getByTestId, container } = render(
      <BannerTip data-testid="bannerTip" title="BannerTip test">
        should render BannerTip element correctly
      </BannerTip>,
    );
    expect(getByTestId('bannerTip')).toHaveClass('mm-banner-tip');
    expect(container).toMatchSnapshot();
  });

  it('should render with different logo types', () => {
    const { getByTestId } = render(
      <>
        <BannerTip
          logoType={BANNER_TIP_LOGOS.GREETING}
          logoProps={{ 'data-testid': 'banner-tip-greeting' }}
        >
          should render BannerTip element correctly
        </BannerTip>
        <BannerTip
          logoType={BANNER_TIP_LOGOS.CHAT}
          logoProps={{ 'data-testid': 'banner-tip-chat' }}
        >
          should render BannerTip element correctly
        </BannerTip>
      </>,
    );
    expect(getByTestId('banner-tip-greeting')).toHaveClass(
      'mm-banner-tip--logo',
    );
    expect(getByTestId('banner-tip-chat')).toHaveClass('mm-banner-tip--logo');
  });

  it('should render with added classname', () => {
    const { getByTestId } = render(
      <BannerTip
        className="mm-banner-tip--test"
        data-testid="bannerTip"
        title="BannerTip test"
      >
        should render BannerTip element correctly
      </BannerTip>,
    );
    expect(getByTestId('bannerTip')).toHaveClass('mm-banner-tip--test');
  });

  it('should render BannerTip title', () => {
    const { getByText } = render(<BannerTip title="BannerTip title test" />);
    expect(getByText('BannerTip title test')).toHaveClass(
      'mm-banner-base__title',
    );
  });

  it('should render BannerTip description', () => {
    const { getByText } = render(
      <BannerTip description="BannerTip description test" />,
    );
    expect(getByText('BannerTip description test')).toBeDefined();
  });

  it('should render BannerTip action button', () => {
    const { getByTestId } = render(
      <BannerTip
        title="Action prop demo"
        actionButtonLabel="Action"
        actionButtonProps={{
          'data-testid': 'action',
          className: 'mm-banner-base__action',
        }}
        actionButtonOnClick={() =>
          console.log('ButtonLink actionButtonOnClick demo')
        }
      >
        Use actionButtonLabel for action text, actionButtonOnClick for the
        onClick handler, and actionButtonProps to pass any ButtonLink prop types
        such as iconName
      </BannerTip>,
    );
    expect(getByTestId('action')).toHaveClass('mm-banner-base__action');
  });

  it('should render and fire onClose event', async () => {
    const onClose = jest.fn();
    const { user, getByTestId } = renderWithUserEvent(
      <BannerTip
        title="onClose Test"
        closeButtonProps={{ 'data-testid': 'close-button' }}
        onClose={onClose}
      />,
    );
    await user.click(getByTestId('close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/* eslint-disable jest/require-top-level-describe */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProvider } from '../../../../test/jest';
import configureStore from '../../../store/store';
import mockState from '../../../../test/data/mock-state.json';
import { shortenAddress } from '../../../helpers/utils/util';
import { AccountListItem } from '.';

const identity = {
  ...mockState.metamask.identities[
    '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'
  ],
  balance: '0x152387ad22c3f0',
};

const DEFAULT_PROPS = {
  identity,
  onClick: jest.fn(),
};

const render = (props = {}) => {
  const store = configureStore({
    metamask: {
      ...mockState.metamask,
    },
  });
  const allProps = { ...DEFAULT_PROPS, ...props };
  return renderWithProvider(<AccountListItem {...allProps} />, store);
};

describe('AccountListItem', () => {
  it('renders AccountListItem component and shows account name, address, and balance', () => {
    const { container } = render();
    expect(screen.getByText(identity.name)).toBeInTheDocument();
    expect(
      screen.getByText(shortenAddress(identity.address)),
    ).toBeInTheDocument();
    expect(document.querySelector('[title="0.006 ETH"]')).toBeInTheDocument();

    expect(container).toMatchSnapshot();
  });

  it('renders selected block when account is selected', () => {
    render({ selected: true });
    expect(
      document.querySelector('.multichain-account-list-item--selected'),
    ).toBeInTheDocument();
  });

  it('renders the tree-dot menu to lauch the details menu', () => {
    render();
    const optionsButton = document.querySelector(
      '[aria-label="Test Account Options"]',
    );
    expect(optionsButton).toBeInTheDocument();
    fireEvent.click(optionsButton);
    expect(document.querySelector('.menu__background')).toBeInTheDocument();
  });

  it('executes the action when the item is clicked', () => {
    const onClick = jest.fn();
    render({ onClick });
    const item = document.querySelector('.multichain-account-list-item');
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalled();
  });

  it('clicking the three-dot menu opens up options', () => {
    const onClick = jest.fn();
    render({ onClick });
    const item = document.querySelector(
      '[data-testid="account-list-item-menu-button"]',
    );
    fireEvent.click(item);
    console.log(document.body.innerHTML);
    expect(
      document.querySelector('[data-testid="account-list-menu-open-explorer"]'),
    ).toBeInTheDocument();
  });

  it('renders connected site icon', () => {
    const connectedAvatarName = 'Uniswap';
    const { getByAltText } = render({
      connectedAvatar: 'https://uniswap.org/favicon.ico',
      connectedAvatarName,
    });

    expect(getByAltText(`${connectedAvatarName} logo`)).toBeInTheDocument();
  });
});

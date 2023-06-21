/* eslint-disable jest/require-top-level-describe */
import React from 'react';
import reactRouterDom from 'react-router-dom';
import { fireEvent, renderWithProvider } from '../../../../test/jest';
import configureStore from '../../../store/store';
import mockState from '../../../../test/data/mock-state.json';
import { CONNECT_HARDWARE_ROUTE } from '../../../helpers/constants/routes';
import { AccountListMenu } from '.';

const render = (props = { onClose: () => jest.fn() }) => {
  const store = configureStore({
    activeTab: {
      id: 113,
      title: 'E2E Test Dapp',
      origin: 'https://metamask.github.io',
      protocol: 'https:',
      url: 'https://metamask.github.io/test-dapp/',
    },
    metamask: {
      ...mockState.metamask,
    },
  });
  return renderWithProvider(<AccountListMenu {...props} />, store);
};

describe('AccountListMenu', () => {
  const historyPushMock = jest.fn();

  jest
    .spyOn(reactRouterDom, 'useHistory')
    .mockImplementation()
    .mockReturnValue({ push: historyPushMock });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays important controls', () => {
    const { getByPlaceholderText, getByText } = render();

    expect(getByPlaceholderText('Search accounts')).toBeInTheDocument();
    expect(getByText('Add account')).toBeInTheDocument();
    expect(getByText('Import account')).toBeInTheDocument();
    expect(getByText('Hardware wallet')).toBeInTheDocument();
  });

  it('shows the account creation UI when Add Account is clicked', () => {
    const { getByText, getByPlaceholderText } = render();
    fireEvent.click(getByText('Add account'));
    expect(getByText('Create')).toBeInTheDocument();
    expect(getByText('Cancel')).toBeInTheDocument();

    fireEvent.click(getByText('Cancel'));
    expect(getByPlaceholderText('Search accounts')).toBeInTheDocument();
  });

  it('shows the account import UI when Import Account is clicked', () => {
    const { getByText, getByPlaceholderText } = render();
    fireEvent.click(getByText('Import account'));
    expect(getByText('Import')).toBeInTheDocument();
    expect(getByText('Cancel')).toBeInTheDocument();

    fireEvent.click(getByText('Cancel'));
    expect(getByPlaceholderText('Search accounts')).toBeInTheDocument();
  });

  it('navigates to hardware wallet connection screen when clicked', () => {
    const { getByText } = render();
    fireEvent.click(getByText('Hardware wallet'));
    expect(historyPushMock).toHaveBeenCalledWith(CONNECT_HARDWARE_ROUTE);
  });

  it('displays accounts for list and filters by search', () => {
    render();
    const listItems = document.querySelectorAll(
      '.multichain-account-list-item',
    );
    expect(listItems).toHaveLength(4);

    const searchBox = document.querySelector('input[type=search]');
    fireEvent.change(searchBox, {
      target: { value: 'Le' },
    });

    const filteredListItems = document.querySelectorAll(
      '.multichain-account-list-item',
    );
    expect(filteredListItems).toHaveLength(1);
  });

  it('displays the "no accounts" message when search finds nothing', () => {
    const { getByTestId } = render();

    const searchBox = document.querySelector('input[type=search]');
    fireEvent.change(searchBox, {
      target: { value: 'adslfkjlx' },
    });

    const filteredListItems = document.querySelectorAll(
      '.multichain-account-list-item',
    );
    expect(filteredListItems).toHaveLength(0);
    expect(
      getByTestId('multichain-account-menu-popover-no-results'),
    ).toBeInTheDocument();
  });

  it('should not render search bar when there is only one account', () => {
    const mockStore = configureStore({
      activeTab: {
        title: 'Eth Sign Tests',
        origin: 'https://remix.ethereum.org',
        protocol: 'https:',
        url: 'https://remix.ethereum.org/',
      },
      metamask: {
        ...mockState.metamask,
        accounts: {
          '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc': {
            balance: '0x346ba7725f412cbfdb',
            address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
          },
        },
      },
    });
    const props = { onClose: () => jest.fn() };
    const { container } = renderWithProvider(
      <AccountListMenu {...props} />,
      mockStore,
    );
    const searchBox = container.querySelector('input[type=search]');
    expect(searchBox).not.toBeInTheDocument();
  });

  it('should render search bar when there is more than one account', () => {
    render();
    const searchBox = document.querySelector('input[type=search]');
    expect(searchBox).toBeInTheDocument();
  });
});

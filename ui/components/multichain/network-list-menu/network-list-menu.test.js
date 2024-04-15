/* eslint-disable jest/require-top-level-describe */
import React from 'react';
import { fireEvent, renderWithProvider } from '../../../../test/jest';
import configureStore from '../../../store/store';
import mockState from '../../../../test/data/mock-state.json';
import {
  CHAIN_IDS,
  MAINNET_DISPLAY_NAME,
  SEPOLIA_DISPLAY_NAME,
} from '../../../../shared/constants/network';
import { NetworkListMenu } from '.';

const mockSetShowTestNetworks = jest.fn();
const mockSetProviderType = jest.fn();
const mockToggleNetworkMenu = jest.fn();

let numberOfSetNetworkClientIdForDomainCalls = 0;

jest.mock('../../../store/actions.ts', () => ({
  setShowTestNetworks: () => mockSetShowTestNetworks,
  setProviderType: () => mockSetProviderType,
  toggleNetworkMenu: () => mockToggleNetworkMenu,
  // This should no be a nested function
  setNetworkClientIdForDomain: () => {
    numberOfSetNetworkClientIdForDomainCalls += 1;
  },
}));

const render = ({
  showTestNetworks = false,
  currentChainId = '0x5',
  providerConfigId = 'chain5',
  isUnlocked = true,
  origin = 'https://portfolio.metamask.io',
} = {}) => {
  const state = {
    metamask: {
      ...mockState.metamask,
      isUnlocked,
      providerConfig: {
        ...mockState.metamask.providerConfig,
        chainId: currentChainId,
        id: providerConfigId,
      },
      preferences: {
        showTestNetworks,
      },
      useRequestQueue: true,
    },
    activeTab: {
      origin,
    },
  };

  const store = configureStore(state);
  return renderWithProvider(<NetworkListMenu onClose={jest.fn()} />, store);
};

describe('NetworkListMenu', () => {
  it('displays important controls', () => {
    const { getByText, getByPlaceholderText } = render();

    expect(getByText('Add network')).toBeInTheDocument();
    expect(getByText('Show test networks')).toBeInTheDocument();
    expect(getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('renders mainnet item', () => {
    const { getByText } = render();
    expect(getByText(MAINNET_DISPLAY_NAME)).toBeInTheDocument();
  });

  it('renders test networks when it should', () => {
    const { getByText } = render({ showTestNetworks: true });
    expect(getByText(SEPOLIA_DISPLAY_NAME)).toBeInTheDocument();
  });

  it('toggles showTestNetworks when toggle is clicked', () => {
    const { queryAllByRole } = render();
    const [testNetworkToggle] = queryAllByRole('checkbox');
    fireEvent.click(testNetworkToggle);
    expect(mockSetShowTestNetworks).toHaveBeenCalled();
  });

  it('disables toggle when on test network', () => {
    render(false, { currentChainId: CHAIN_IDS.GOERLI });
    expect(document.querySelector('.toggle-button--disabled')).toBeDefined();
  });

  it('switches networks when an item is clicked', () => {
    const { getByText } = render();
    fireEvent.click(getByText(MAINNET_DISPLAY_NAME));
    expect(mockToggleNetworkMenu).toHaveBeenCalled();
    expect(mockSetProviderType).toHaveBeenCalled();
  });

  it('does not signal to the SelectedNetworkController when the user switches networks manually', () => {
    const { getByText } = render({ origin: undefined });
    fireEvent.click(getByText(MAINNET_DISPLAY_NAME));
    expect(numberOfSetNetworkClientIdForDomainCalls).toBe(0);
  });

  it('signals to the SelectedNetworkController when the user switches networks manually', () => {
    process.env.MULTICHAIN = 1;
    const { getByText } = render();
    fireEvent.click(getByText(MAINNET_DISPLAY_NAME));
    expect(numberOfSetNetworkClientIdForDomainCalls).toBe(1);
    delete process.env.MULTICHAIN;
  });

  it('shows the correct selected network when networks share the same chain ID', () => {
    // Mainnet and Custom Mainnet RPC both use chain ID 0x1
    render({
      showTestNetworks: false,
      currentChainId: CHAIN_IDS.MAINNET,
      providerConfigId: 'testNetworkConfigurationId',
    });

    // Contains Mainnet, Linea Mainnet and the two custom networks
    const networkItems = document.querySelectorAll(
      '.multichain-network-list-item',
    );
    expect(networkItems).toHaveLength(4);

    const selectedNodes = document.querySelectorAll(
      '.multichain-network-list-item--selected',
    );
    expect(selectedNodes).toHaveLength(1);

    const selectedNodeText = selectedNodes[0].querySelector(
      '.multichain-network-list-item__network-name',
    ).textContent;
    expect(selectedNodeText).toStrictEqual('Custom Mainnet RPC');
  });

  it('narrows down search results', () => {
    const { queryByText, getByPlaceholderText } = render();

    expect(queryByText('Chain 5')).toBeInTheDocument();

    const searchBox = getByPlaceholderText('Search');
    fireEvent.change(searchBox, { target: { value: 'Main' } });

    expect(queryByText('Chain 5')).not.toBeInTheDocument();
  });

  it('enables the "Add Network" button when MetaMask is locked', () => {
    const { queryByText } = render({ isUnlocked: false });
    expect(queryByText('Add network')).toBeEnabled();
  });

  it('enables the "Add Network" button when MetaMask is true', () => {
    const { queryByText } = render({ isUnlocked: true });
    expect(queryByText('Add network')).toBeEnabled();
  });

  it('does not allow deleting networks when locked', () => {
    render({ isUnlocked: false });
    expect(
      document.querySelectorAll('multichain-network-list-item__delete'),
    ).toHaveLength(0);
  });
});

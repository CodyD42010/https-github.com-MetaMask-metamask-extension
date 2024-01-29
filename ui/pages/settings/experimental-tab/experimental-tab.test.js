import React from 'react';
import { fireEvent, renderWithProvider, waitFor } from '../../../../test/jest';
import configureStore from '../../../store/store';
import mockState from '../../../../test/data/mock-state.json';
import { LegacyMetaMetricsProvider } from '../../../contexts/metametrics';
import ExperimentalTab from './experimental-tab.component';

const render = (overrideMetaMaskState, props = {}) => {
  const store = configureStore({
    metamask: {
      ...mockState.metamask,
      ...overrideMetaMaskState,
    },
  });
  const comp = <ExperimentalTab {...props} />;
  return renderWithProvider(
    <LegacyMetaMetricsProvider>{comp}</LegacyMetaMetricsProvider>,
    store,
  );
};

describe('ExperimentalTab', () => {
  it('renders ExperimentalTab component without error', () => {
    expect(() => {
      render();
    }).not.toThrow();
  });

  describe('with desktop enabled', () => {
    it('renders ExperimentalTab component without error', () => {
      const { container } = render({ desktopEnabled: true });
      expect(container).toMatchSnapshot();
    });
  });

  it('should render multiple toggle options', () => {
    const { getAllByRole } = render({ desktopEnabled: true });
    const toggle = getAllByRole('checkbox');

    expect(toggle).toHaveLength(5);
  });

  it('should disable opensea when blockaid is enabled', () => {
    const setSecurityAlertsEnabled = jest.fn();
    const setTransactionSecurityCheckEnabled = jest.fn();
    const setPetnamesEnabled = jest.fn();
    const { getAllByRole } = render(
      { desktopEnabled: true },
      {
        securityAlertsEnabled: false,
        transactionSecurityCheckEnabled: true,
        setSecurityAlertsEnabled,
        setTransactionSecurityCheckEnabled,
        petnamesEnabled: true,
        setPetnamesEnabled,
      },
    );
    const toggle = getAllByRole('checkbox');
    fireEvent.click(toggle[1]);
    expect(setSecurityAlertsEnabled).toHaveBeenCalledWith(true);
    expect(setTransactionSecurityCheckEnabled).toHaveBeenCalledWith(false);
  });

  it('should disable blockaid when opensea is enabled', () => {
    const setSecurityAlertsEnabled = jest.fn();
    const setTransactionSecurityCheckEnabled = jest.fn();
    const setPetnamesEnabled = jest.fn();
    const { getAllByRole } = render(
      { desktopEnabled: true },
      {
        transactionSecurityCheckEnabled: false,
        securityAlertsEnabled: true,
        setSecurityAlertsEnabled,
        setTransactionSecurityCheckEnabled,
        petnamesEnabled: true,
        setPetnamesEnabled,
      },
    );
    const toggle = getAllByRole('checkbox');
    fireEvent.click(toggle[2]);
    expect(setTransactionSecurityCheckEnabled).toHaveBeenCalledWith(true);
    expect(setSecurityAlertsEnabled).toHaveBeenCalledWith(false);
  });

  it('should show terms of use links', () => {
    const setSecurityAlertsEnabled = jest.fn();
    const setTransactionSecurityCheckEnabled = jest.fn();
    const setPetnamesEnabled = jest.fn();
    const { getAllByRole } = render(
      { desktopEnabled: true },
      {
        securityAlertsEnabled: false,
        transactionSecurityCheckEnabled: true,
        setSecurityAlertsEnabled,
        setTransactionSecurityCheckEnabled,
        petnamesEnabled: true,
        setPetnamesEnabled,
      },
    );
    expect(getAllByRole('link', { name: 'Terms of use' })[0]).toHaveAttribute(
      'href',
      'https://opensea.io/securityproviderterms',
    );
  });

  it('should enable add account snap', async () => {
    const setAddSnapAccountEnabled = jest.fn();
    const setPetnamesEnabled = jest.fn();
    const { getByTestId } = render(
      { desktopEnabled: true },
      {
        setAddSnapAccountEnabled,
        petnamesEnabled: true,
        setPetnamesEnabled,
      },
    );

    const toggle = getByTestId('add-account-snap-toggle-button');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(setAddSnapAccountEnabled).toHaveBeenCalledWith(true);
    });
  });

  it('should disable petnames', async () => {
    const setAddSnapAccountEnabled = jest.fn();
    const setPetnamesEnabled = jest.fn();
    const { getByTestId } = render(
      { desktopEnabled: true },
      {
        setAddSnapAccountEnabled,
        petnamesEnabled: true,
        setPetnamesEnabled,
      },
    );

    const toggle = getByTestId('toggle-petnames');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(setPetnamesEnabled).toHaveBeenCalledWith(false);
    });
  });
});

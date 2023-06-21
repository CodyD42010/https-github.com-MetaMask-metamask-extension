import { fireEvent, queryByRole, screen } from '@testing-library/react';
import React from 'react';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import mockState from '../../../../test/data/mock-state.json';
import { renderWithProvider } from '../../../../test/lib/render-helpers';
import SecurityTab from './security-tab.container';

jest.mock('../../../../app/scripts/lib/util', () => {
  const originalModule = jest.requireActual('../../../../app/scripts/lib/util');

  return {
    ...originalModule,
    getEnvironmentType: jest.fn(),
  };
});

describe('Security Tab', () => {
  delete mockState.metamask.featureFlags; // Unset featureFlags in order to test the default value
  mockState.appState.warning = 'warning'; // This tests an otherwise untested render branch

  const mockStore = configureMockStore([thunk])(mockState);

  function toggleCheckbox(testId, initialState) {
    renderWithProvider(<SecurityTab />, mockStore);

    const container = screen.getByTestId(testId);
    const checkbox = queryByRole(container, 'checkbox');

    expect(checkbox).toHaveAttribute('value', initialState ? 'true' : 'false');

    fireEvent.click(checkbox); // This fires the onToggle method of the ToggleButton, but it doesn't change the value of the checkbox

    fireEvent.change(checkbox, {
      target: { value: !initialState }, // This changes the value of the checkbox
    });

    expect(checkbox).toHaveAttribute('value', initialState ? 'false' : 'true');

    return true;
  }

  it('should match snapshot', () => {
    const { container } = renderWithProvider(<SecurityTab />, mockStore);

    expect(container).toMatchSnapshot();
  });

  it('toggles phishing detection', async () => {
    expect(await toggleCheckbox('usePhishingDetection', true)).toBe(true);
  });

  it('toggles balance and token price checker', async () => {
    expect(await toggleCheckbox('currencyRateCheckToggle', true)).toBe(true);
  });

  it('toggles incoming txs', async () => {
    expect(await toggleCheckbox('showIncomingTransactions', false)).toBe(true);
  });

  it('should toggle token detection', async () => {
    expect(await toggleCheckbox('autoDetectTokens', true)).toBe(true);
  });

  it('toggles batch balance checks', async () => {
    expect(await toggleCheckbox('useMultiAccountBalanceChecker', false)).toBe(
      true,
    );
  });

  it('toggles metaMetrics', async () => {
    expect(await toggleCheckbox('participateInMetaMetrics', false)).toBe(true);
  });

  it('toggles SRP Quiz', async () => {
    renderWithProvider(<SecurityTab />, mockStore);

    expect(
      screen.queryByTestId(`srp_stage_introduction`),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reveal-seed-words'));

    expect(screen.getByTestId(`srp_stage_introduction`)).toBeInTheDocument();

    const container = screen.getByTestId('srp-quiz-header');
    const checkbox = queryByRole(container, 'button');
    fireEvent.click(checkbox);

    expect(
      screen.queryByTestId(`srp_stage_introduction`),
    ).not.toBeInTheDocument();
  });
});

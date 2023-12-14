import React from 'react';
import { fireEvent } from '@testing-library/react';
import { renderWithProvider } from '../../../test/lib/render-helpers';

import configureStore from '../../store/store';
import {
  setPendingTokens,
  clearPendingTokens,
  getTokenStandardAndDetails,
} from '../../store/actions';
import mockState from '../../../test/data/mock-state.json';
import { TokenStandard } from '../../../shared/constants/transaction';
import ImportTokens from './import-tokens';

jest.mock('../../store/actions', () => ({
  getTokenStandardAndDetails: jest
    .fn()
    .mockImplementation(() => Promise.resolve({ standard: 'ERC20' })),
  setPendingTokens: jest
    .fn()
    .mockImplementation(() => ({ type: 'SET_PENDING_TOKENS' })),
  clearPendingTokens: jest
    .fn()
    .mockImplementation(() => ({ type: 'CLEAR_PENDING_TOKENS' })),
}));

describe('ImportTokens', () => {
  const render = (metamaskStateChanges = {}, onClose = jest.fn()) => {
    const store = configureStore({
      ...mockState,
      metamask: {
        ...mockState.metamask,
        ...metamaskStateChanges,
      },
    });
    return renderWithProvider(<ImportTokens onClose={onClose} />, store);
  };

  describe('Search', () => {
    it('renders expected elements', () => {
      const { getByText, getByPlaceholderText } = render();
      expect(
        getByText(`Add the tokens you've acquired using MetaMask`),
      ).toBeInTheDocument();
      expect(getByText('Next')).toBeDisabled();
      expect(getByPlaceholderText('Search')).toBeInTheDocument();
    });

    it('shows the token detection notice when setting is off', () => {
      const { getByText } = render({ useTokenDetection: false });
      expect(getByText('Enable it from Settings.')).toBeInTheDocument();
    });
  });

  describe('Custom Token', () => {
    it('add custom token button is disabled when no fields are populated', () => {
      const { getByText } = render();
      const customTokenButton = getByText('Custom token');
      fireEvent.click(customTokenButton);
      const submit = getByText('Next');

      expect(submit).toBeDisabled();
    });

    it('edits token address', () => {
      const { getByText, getByTestId } = render();
      const customTokenButton = getByText('Custom token');
      fireEvent.click(customTokenButton);

      const tokenAddress = '0x617b3f8050a0BD94b6b1da02B4384eE5B4DF13F4';
      const event = { target: { value: tokenAddress } };
      fireEvent.change(
        getByTestId('import-tokens-modal-custom-address'),
        event,
      );

      expect(
        getByTestId('import-tokens-modal-custom-address').value,
      ).toStrictEqual(tokenAddress);
    });

    it('edits token symbol', () => {
      const { getByText, getByTestId } = render();
      const customTokenButton = getByText('Custom token');
      fireEvent.click(customTokenButton);

      const tokenSymbol = 'META';
      const event = { target: { value: tokenSymbol } };
      fireEvent.change(getByTestId('import-tokens-modal-custom-symbol'), event);

      expect(
        getByTestId('import-tokens-modal-custom-symbol').value,
      ).toStrictEqual(tokenSymbol);
    });

    it('edits token decimal precision', () => {
      const { getByText, getByTestId } = render();
      const customTokenButton = getByText('Custom token');
      fireEvent.click(customTokenButton);

      const tokenPrecision = '2';
      const event = { target: { value: tokenPrecision } };
      fireEvent.change(
        getByTestId('import-tokens-modal-custom-decimals'),
        event,
      );

      expect(
        getByTestId('import-tokens-modal-custom-decimals').value,
      ).toStrictEqual(tokenPrecision);
    });

    it('adds custom tokens successfully', async () => {
      const { getByText, getByTestId } = render({ tokens: [], tokenList: {} });
      const customTokenButton = getByText('Custom token');
      fireEvent.click(customTokenButton);

      expect(getByText('Next')).toBeDisabled();

      const tokenAddress = '0x617b3f8050a0BD94b6b1da02B4384eE5B4DF13F4';
      await fireEvent.change(
        getByTestId('import-tokens-modal-custom-address'),
        {
          target: { value: tokenAddress },
        },
      );
      expect(getByText('Next')).not.toBeDisabled();

      const tokenSymbol = 'META';

      fireEvent.change(getByTestId('import-tokens-modal-custom-symbol'), {
        target: { value: tokenSymbol },
      });

      expect(getByTestId('import-tokens-modal-custom-symbol').value).toBe(
        'META',
      );

      const tokenPrecision = '2';

      fireEvent.change(getByTestId('import-tokens-modal-custom-decimals'), {
        target: { value: tokenPrecision },
      });

      expect(getByText('Next')).not.toBeDisabled();

      fireEvent.click(getByText('Next'));

      expect(setPendingTokens).toHaveBeenCalledWith({
        customToken: {
          address: tokenAddress,
          decimals: Number(tokenPrecision),
          standard: TokenStandard.ERC20,
          symbol: tokenSymbol,
        },
        selectedTokens: {},
        tokenAddressList: [],
      });

      expect(getByText('Import')).toBeInTheDocument();
    });

    it('cancels out of import token flow', () => {
      const onClose = jest.fn();
      render({}, onClose);

      fireEvent.click(document.querySelector('button[aria-label="Close"]'));

      expect(clearPendingTokens).toHaveBeenCalled();
    });

    it('sets and error when a token is an NFT', async () => {
      getTokenStandardAndDetails.mockImplementation(() =>
        Promise.resolve({ standard: TokenStandard.ERC721 }),
      );

      const { getByText, getByTestId } = render();
      const customTokenButton = getByText('Custom token');
      fireEvent.click(customTokenButton);

      const submit = getByText('Next');
      expect(submit).toBeDisabled();

      const tokenAddress = '0x617b3f8050a0BD94b6b1da02B4384eE5B4DF13F4';
      await fireEvent.change(
        getByTestId('import-tokens-modal-custom-address'),
        {
          target: { value: tokenAddress },
        },
      );

      expect(submit).toBeDisabled();

      // The last part of this error message won't be found by getByText because it is wrapped as a link.
      const errorMessage = getByText('This token is an NFT. Add on the');
      expect(errorMessage).toBeInTheDocument();
    });
  });
});

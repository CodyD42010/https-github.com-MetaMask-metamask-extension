import React from 'react';

import mockState from '../../../../test/data/mock-state.json';
import { renderWithProvider } from '../../../../test/lib/render-helpers';
import configureStore from '../../../store/store';
import MultilayerFeeMessage from './multi-layer-fee-message';

jest.mock('../../../helpers/utils/optimism/fetchEstimatedL1Fee', () => '0x5');

describe('Multi layer fee message', () => {
  const store = configureStore(mockState);

  it('should match snapshot', () => {
    const { container } = renderWithProvider(
      <MultilayerFeeMessage
        transaction={{
          txParams: {
            value: '0x38d7ea4c68000',
          },
        }}
        layer2fee="0x4e3b29200"
        nativeCurrency="ETH"
      />,
      store,
    );
    expect(container).toMatchSnapshot();
  });

  it('should containe fee values', () => {
    const { getByText } = renderWithProvider(
      <MultilayerFeeMessage
        transaction={{
          txParams: {
            value: '0x38d7ea4c68000',
          },
        }}
        layer2fee="0x4e3b29200"
        nativeCurrency="ETH"
      />,
      store,
    );
    expect(getByText('Layer 1 fees')).toBeInTheDocument();
    expect(getByText('Amount + fees')).toBeInTheDocument();
    expect(getByText('0.001000021000 ETH')).toBeInTheDocument();
  });
});

import React from 'react';
import configureMockStore from 'redux-mock-store';
import mockState from '../../../../test/data/mock-state.json';
import { renderWithProvider } from '../../../../test/lib/render-helpers';

import SignatureRequestsCommonHeader from '.';

const props = {
  txData: {
    msgParams: {
      from: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
    },
  },
};

describe('SignatureRequestsCommonHeader', () => {
  const store = configureMockStore()(mockState);

  it('should match snapshot', () => {
    const { container } = renderWithProvider(
      <SignatureRequestsCommonHeader {...props} />,
      store,
    );

    expect(container).toMatchSnapshot();
  });
});

import React from 'react';
import configureMockStore from 'redux-mock-store';
import { fireEvent, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MESSAGE_TYPE } from '../../../../shared/constants/app';
import { SECURITY_PROVIDER_MESSAGE_SEVERITY } from '../../../../shared/constants/security-provider';
import mockState from '../../../../test/data/mock-state.json';
import { renderWithProvider } from '../../../../test/lib/render-helpers';
import configureStore from '../../../store/store';
import {
  resolvePendingApproval,
  rejectPendingApproval,
  completedTx,
} from '../../../store/actions';
import SignatureRequestOriginal from '.';

jest.mock('../../../store/actions', () => ({
  resolvePendingApproval: jest.fn().mockReturnValue({ type: 'test' }),
  rejectPendingApproval: jest.fn().mockReturnValue({ type: 'test' }),
  completedTx: jest.fn().mockReturnValue({ type: 'test' }),
}));

const MOCK_SIGN_DATA = JSON.stringify({
  domain: {
    name: 'happydapp.website',
  },
  message: {
    string: 'haay wuurl',
    number: 42,
  },
  primaryType: 'Mail',
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Group: [
      { name: 'name', type: 'string' },
      { name: 'members', type: 'Person[]' },
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person[]' },
      { name: 'contents', type: 'string' },
    ],
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallets', type: 'address[]' },
    ],
  },
});

const props = {
  signMessage: jest.fn(),
  cancelMessage: jest.fn(),
  txData: {
    msgParams: {
      from: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
      data: MOCK_SIGN_DATA,
      origin: 'https://happydapp.website/governance?futarchy=true',
    },
    type: MESSAGE_TYPE.ETH_SIGN,
  },
  selectedAccount: {
    address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
  },
};

const render = (txData = props.txData) => {
  const store = configureStore({
    metamask: {
      ...mockState.metamask,
    },
  });

  return renderWithProvider(
    <SignatureRequestOriginal {...props} txData={txData} />,
    store,
  );
};

describe('SignatureRequestOriginal', () => {
  const store = configureMockStore()(mockState);

  it('should match snapshot', () => {
    const { container } = renderWithProvider(
      <SignatureRequestOriginal {...props} />,
      store,
    );

    expect(container).toMatchSnapshot();
  });

  it('should render navigation', () => {
    render();
    const navigationContainer = screen.queryByTestId('navigation-container');
    expect(navigationContainer).toBeInTheDocument();
  });

  it('should render eth sign screen', () => {
    render();
    expect(screen.getByText('Signature request')).toBeInTheDocument();
  });

  it('should render warning for eth sign when sign button clicked', async () => {
    render();
    const signButton = screen.getByTestId('page-container-footer-next');

    fireEvent.click(signButton);
    expect(screen.getByText('Your funds may be at risk')).toBeInTheDocument();

    const secondSignButton = screen.getByTestId(
      'signature-warning-sign-button',
    );
    await act(async () => {
      fireEvent.click(secondSignButton);
    });
    expect(resolvePendingApproval).toHaveBeenCalledTimes(1);
    expect(completedTx).toHaveBeenCalledTimes(1);
  });

  it('should cancel approval when user reject signing', async () => {
    render();
    const rejectButton = screen.getByTestId('page-container-footer-cancel');
    await act(async () => {
      fireEvent.click(rejectButton);
    });
    expect(rejectPendingApproval).toHaveBeenCalledTimes(1);
  });

  it('should escape RTL character in label or value', () => {
    const txData = {
      msgParams: {
        from: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
        data: [
          {
            type: 'string',
            name: 'Message \u202E test',
            value: 'Hi, \u202E Alice!',
          },
        ],
        origin: 'https://happydapp.website/governance?futarchy=true',
      },
      type: MESSAGE_TYPE.ETH_SIGN_TYPED_DATA,
    };
    const { getByText } = render(txData);
    expect(getByText('Message \\u202E test:')).toBeInTheDocument();
    expect(getByText('Hi, \\u202E Alice!')).toBeInTheDocument();
  });

  it('should render SecurityProviderBannerMessage component properly', () => {
    props.txData.securityProviderResponse = {
      flagAsDangerous: '?',
      reason: 'Some reason...',
      reason_header: 'Some reason header...',
    };
    render();
    expect(screen.getByText('Request not verified')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Because of an error, this request was not verified by the security provider. Proceed with caution.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('OpenSea')).toBeInTheDocument();
  });

  it('should not render SecurityProviderBannerMessage component when flagAsDangerous is not malicious', () => {
    props.txData.securityProviderResponse = {
      flagAsDangerous: SECURITY_PROVIDER_MESSAGE_SEVERITY.NOT_MALICIOUS,
    };

    render();
    expect(screen.queryByText('Request not verified')).toBeNull();
    expect(
      screen.queryByText(
        'Because of an error, this request was not verified by the security provider. Proceed with caution.',
      ),
    ).toBeNull();
    expect(screen.queryByText('OpenSea')).toBeNull();
  });
});

import sinon from 'sinon';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import MetaMaskController from '../../../app/scripts/metamask-controller';
import { _setBackgroundConnection } from '../action-queue';
import {
  showInteractiveReplacementTokenModal,
  showCustodyConfirmLink,
  checkForUnapprovedTypedMessages,
  updateCustodyState,
} from './institution-actions';

const middleware = [thunk];
const defaultState = {
  metamask: {
    currentLocale: 'test',
    selectedAddress: '0xFirstAddress',
    providerConfig: { chainId: '0x1' },
    accounts: {
      '0xFirstAddress': {
        balance: '0x0',
      },
    },
    identities: {
      '0xFirstAddress': {},
    },
    cachedBalances: {
      '0x1': {
        '0xFirstAddress': '0x0',
      },
    },
    custodyStatusMaps: {
      saturn: {
        signed: {
          mmStatus: 'signed',
          shortText: 'signed',
          longText: 'signed',
          finished: false,
        },
      },
    },
    currentNetworkTxList: [
      {
        id: 0,
        time: 0,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
        },
        custodyId: '0',
        custodyStatus: 'signed',
      },
      {
        id: 1,
        time: 1,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
        },
        custodyId: '1',
        custodyStatus: 'signed',
      },
    ],
    custodyAccountDetails: {
      '0xAddress': {
        address: '0xc96348083d806DFfc546b36e05AF1f9452CDAe91',
        details: 'details',
        custodyType: 'testCustody - Saturn',
      },
    },
  },
  appState: {
    modal: {
      open: true,
      modalState: {
        name: 'CUSTODY_CONFIRM_LINK',
        props: {
          custodyId: '1',
        },
      },
    },
  },
};

const mockStore = (state = defaultState) => configureStore(middleware)(state);
const baseMockState = defaultState.metamask;

describe('#InstitutionActions', () => {
  let background;

  beforeEach(async () => {
    background = sinon.createStubInstance(MetaMaskController, {
      getState: sinon.stub().callsFake((cb) => cb(null, baseMockState)),
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('calls showModal with the property name of showInteractiveReplacementTokenModal', async () => {
    const store = mockStore();

    background.getApi.returns({
      setFeatureFlag: sinon
        .stub()
        .callsFake((_, __, cb) => cb(new Error('error'))),
    });

    _setBackgroundConnection(background.getApi());

    const expectedActions = [
      {
        type: 'UI_MODAL_OPEN',
        payload: { name: 'INTERACTIVE_REPLACEMENT_TOKEN_MODAL' },
      },
    ];

    await store.dispatch(showInteractiveReplacementTokenModal());

    expect(store.getActions()).toStrictEqual(expectedActions);
  });

  it('calls showModal with the property name of showCustodyConfirmLink', async () => {
    const store = mockStore();

    background.getApi.returns({
      setFeatureFlag: sinon
        .stub()
        .callsFake((_, __, cb) => cb(new Error('error'))),
    });

    _setBackgroundConnection(background.getApi());

    const expectedActions = [
      {
        type: 'UI_MODAL_OPEN',
        payload: {
          name: 'CUSTODY_CONFIRM_LINK',
          link: 'link',
          address: '0x1',
          closeNotification: false,
          custodyId: 'custodyId',
        },
      },
    ];

    await store.dispatch(
      showCustodyConfirmLink('link', '0x1', false, 'custodyId'),
    );

    expect(store.getActions()).toStrictEqual(expectedActions);
  });
});

describe('#checkForUnapprovedTypedMessages', () => {
  it('calls checkForUnapprovedTypedMessages and returns the messageData', async () => {
    const messageData = {
      id: 1,
      type: 'tx',
      msgParams: {
        metamaskId: 2,
        data: '0x1',
      },
      custodyId: '123',
      status: 'unapproved',
    };

    expect(checkForUnapprovedTypedMessages(messageData, { msg: 'msg' })).toBe(
      messageData,
    );
  });
});

describe('#updateCustodyState', () => {
  let background;

  beforeEach(async () => {
    background = sinon.createStubInstance(MetaMaskController, {
      getState: sinon.stub().callsFake((cb) => cb(null, baseMockState)),
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('calls updateCustodyState but returns early undefined', async () => {
    const store = mockStore();

    background.getApi.returns({
      setFeatureFlag: sinon
        .stub()
        .callsFake((_, __, cb) => cb(new Error('error'))),
    });

    _setBackgroundConnection(background.getApi());

    const newState = {
      providerConfig: {
        nickname: 'mainnet',
        chainId: '0x1',
      },
      featureFlags: {
        showIncomingTransactions: false,
      },
      selectedAddress: '0xAddress',
    };

    const custodyState = updateCustodyState(store.dispatch, newState, newState);
    expect(custodyState).toBe(undefined);
  });

  it('calls updateCustodyState and returns the hideModal', async () => {
    const store = mockStore();

    background.getApi.returns({
      setFeatureFlag: sinon
        .stub()
        .callsFake((_, __, cb) => cb(new Error('error'))),
    });

    _setBackgroundConnection(background.getApi());

    const newState = {
      providerConfig: {
        nickname: 'mainnet',
        chainId: '0x1',
      },
      featureFlags: {
        showIncomingTransactions: false,
      },
      selectedAddress: '0xAddress',
      currentNetworkTxList: [
        {
          id: 0,
          time: 0,
          txParams: {
            from: '0xAddress',
            to: '0xRecipient',
          },
          custodyId: '0',
          custodyStatus: 'approved',
        },
        {
          id: 1,
          time: 1,
          txParams: {
            from: '0xAddress',
            to: '0xRecipient',
          },
          custodyId: '1',
          custodyStatus: 'approved',
        },
      ],
    };

    const expectedActions = [
      {
        type: 'UI_MODAL_CLOSE',
      },
    ];

    updateCustodyState(store.dispatch, newState, defaultState);

    expect(store.getActions()).toStrictEqual(expectedActions);
  });

  it('calls updateCustodyState and closes INTERACTIVE_REPLACEMENT_TOKEN_MODAL', async () => {
    const store = mockStore();

    background.getApi.returns({
      setFeatureFlag: sinon
        .stub()
        .callsFake((_, __, cb) => cb(new Error('error'))),
    });

    _setBackgroundConnection(background.getApi());

    const newState = {
      providerConfig: {
        nickname: 'mainnet',
        chainId: '0x1',
      },
      featureFlags: {
        showIncomingTransactions: false,
      },
      selectedAddress: '0xAddress',
      currentNetworkTxList: [
        {
          id: 0,
          time: 0,
          txParams: {
            from: '0xAddress',
            to: '0xRecipient',
          },
          custodyId: '0',
          custodyStatus: 'approved',
        },
        {
          id: 1,
          time: 1,
          txParams: {
            from: '0xAddress',
            to: '0xRecipient',
          },
          custodyId: '1',
          custodyStatus: 'approved',
        },
      ],
    };

    const customState = {
      ...defaultState,
      appState: {
        modal: {
          open: true,
          modalState: {
            name: 'INTERACTIVE_REPLACEMENT_TOKEN_MODAL',
            props: {
              custodyId: '1',
              closeNotification: true,
            },
          },
        },
      },
    };

    const closedNotification = updateCustodyState(
      store.dispatch,
      newState,
      customState,
    );
    expect(closedNotification).toBe(undefined);
  });
});

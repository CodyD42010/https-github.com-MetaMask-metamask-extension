import { v4 as uuid } from 'uuid';
import { sha256FromString } from 'ethereumjs-util';
import { EthMethod, InternalAccount } from '@metamask/keyring-api';
import { migrate } from './104';

const MOCK_ADDRESS = '0x0';
const MOCK_ADDRESS_2 = '0x1';

function addressToUUID(address: string): string {
  return uuid({
    random: sha256FromString(address).slice(0, 16),
  });
}

interface Identity {
  name: string;
  address: string;
  lastSelected?: number;
}

interface Identities {
  [key: string]: Identity;
}

function createMockPreferenceControllerState(
  identities: Identity[] = [{ name: 'Account 1', address: MOCK_ADDRESS }],
  selectedAddress: string = MOCK_ADDRESS,
): {
  identities: Identities;
  selectedAddress: string;
} {
  const state: {
    identities: Identities;
    selectedAddress: string;
  } = {
    identities: {},
    selectedAddress,
  };

  identities.forEach(({ address, name, lastSelected }) => {
    state.identities[address] = {
      address,
      name,
      lastSelected,
    };
  });

  return state;
}

function expectedInternalAccount(
  address: string,
  nickname: string,
  lastSelected?: number,
): InternalAccount {
  return {
    address,
    id: addressToUUID(address),
    metadata: {
      name: nickname,
      keyring: {
        type: 'HD Key Tree',
      },
      lastSelected: lastSelected ? expect.any(Number) : undefined,
    },
    options: {},
    methods: [...Object.values(EthMethod)],
    type: 'eip155:eoa',
  };
}

function createMockState(
  preferenceState: {
    identities: Identities;
    selectedAddress: string;
  } = createMockPreferenceControllerState(),
) {
  return {
    PreferencesController: {
      ...preferenceState,
    },
  };
}

describe('migration #104', () => {
  it('updates the version metadata', async () => {
    const oldStorage = {
      meta: { version: 103 },
      data: createMockState(),
    };

    const newStorage = await migrate(oldStorage);

    expect(newStorage.meta).toStrictEqual({ version: 104 });
  });

  describe('createDefaultAccountsController', () => {
    it('creates default state for accounts controller', async () => {
      const oldData = createMockState();

      const oldStorage = {
        meta: { version: 103 },
        data: oldData,
      };

      const newStorage = await migrate(oldStorage);

      const expectedUUID = addressToUUID(MOCK_ADDRESS);
      const resultInternalAccount = expectedInternalAccount(
        MOCK_ADDRESS,
        'Account 1',
      );

      expect(newStorage.data.AccountsController).toStrictEqual({
        internalAccounts: {
          accounts: {
            [expectedUUID]: resultInternalAccount,
          },
          selectedAccount: expectedUUID,
        },
      });
    });
  });

  describe('createInternalAccountsForAccountsController', () => {
    const expectedUUID = addressToUUID(MOCK_ADDRESS);
    const expectedUUID2 = addressToUUID(MOCK_ADDRESS_2);

    it('should create the identities into AccountsController as internal accounts', async () => {
      const oldData = createMockState();

      const oldStorage = {
        meta: { version: 103 },
        data: oldData,
      };

      const newStorage = await migrate(oldStorage);

      expect(newStorage.data).toStrictEqual({
        AccountsController: {
          internalAccounts: {
            accounts: {
              [expectedUUID]: expectedInternalAccount(
                MOCK_ADDRESS,
                `Account 1`,
              ),
            },
            selectedAccount: expectedUUID,
          },
        },
        PreferencesController: expect.any(Object),
      });
    });

    it('should keep the same name from the identities', async () => {
      const oldData = createMockState(
        createMockPreferenceControllerState([
          { name: 'a random name', address: MOCK_ADDRESS },
        ]),
      );
      const oldStorage = {
        meta: { version: 103 },
        data: oldData,
      };
      const newStorage = await migrate(oldStorage);
      expect(newStorage.data).toStrictEqual({
        PreferencesController: expect.any(Object),
        AccountsController: {
          internalAccounts: {
            accounts: {
              [expectedUUID]: expectedInternalAccount(
                MOCK_ADDRESS,
                `a random name`,
              ),
            },
            selectedAccount: expectedUUID,
          },
        },
      });
    });

    it('should be able to handle multiple identities', async () => {
      const oldData = createMockState({
        identities: {
          [MOCK_ADDRESS]: { name: 'Account 1', address: MOCK_ADDRESS },
          [MOCK_ADDRESS_2]: { name: 'Account 2', address: MOCK_ADDRESS_2 },
        },
        selectedAddress: MOCK_ADDRESS,
      });

      const oldStorage = {
        meta: { version: 103 },
        data: oldData,
      };

      const newStorage = await migrate(oldStorage);

      expect(newStorage.data).toStrictEqual({
        AccountsController: {
          internalAccounts: {
            accounts: {
              [expectedUUID]: expectedInternalAccount(
                MOCK_ADDRESS,
                `Account 1`,
              ),
              [expectedUUID2]: expectedInternalAccount(
                MOCK_ADDRESS_2,
                `Account 2`,
              ),
            },
            selectedAccount: expectedUUID,
          },
        },
        PreferencesController: expect.any(Object),
      });
    });
  });

  describe('createSelectedAccountForAccountsController', () => {
    it('should select the same account as the selected address', async () => {
      const oldData = createMockState();
      const oldStorage = {
        meta: { version: 103 },
        data: oldData,
      };
      const newStorage = await migrate(oldStorage);
      expect(newStorage.data).toStrictEqual({
        PreferencesController: expect.any(Object),
        AccountsController: {
          internalAccounts: {
            accounts: expect.any(Object),
            selectedAccount: addressToUUID(MOCK_ADDRESS),
          },
        },
      });
    });

    it("should leave selectedAccount as empty if there aren't any selectedAddress", async () => {
      const oldData = {
        PreferencesController: {
          identities: {},
          selectedAddress: '',
        },
      };
      const oldStorage = {
        meta: { version: 103 },
        data: oldData,
      };
      const newStorage = await migrate(oldStorage);
      expect(newStorage.data).toStrictEqual({
        PreferencesController: expect.any(Object),
        AccountsController: {
          internalAccounts: {
            accounts: expect.any(Object),
            selectedAccount: '',
          },
        },
      });
    });
  });
});

import nanoid from 'nanoid';
import { GenericPermissionController } from '@metamask/permission-controller/dist/types/PermissionController';
import { CaveatConstraint } from '@metamask/permission-controller/dist/types/Caveat';
import {
  CaveatTypes,
  RestrictedMethods,
} from '../../../../shared/constants/permissions';

interface PermissionBackgroundApiMethods {
  [key: string]: (origin: string, account?: string | undefined ) => void | Promise<string>;
}

export function getPermissionBackgroundApiMethods(
  permissionController: GenericPermissionController,
): PermissionBackgroundApiMethods {
  return {
    addPermittedAccount: (origin, account) => {
      const existing: CaveatConstraint = permissionController.getCaveat(
        origin,
        RestrictedMethods.eth_accounts,
        CaveatTypes.restrictReturnedAccounts,
      );

      if (
        typeof existing.value !== 'string' ||
        (account && existing.value?.includes(account))
      ) {
        return;
      }

      permissionController.updateCaveat(
        origin,
        RestrictedMethods.eth_accounts,
        CaveatTypes.restrictReturnedAccounts,
        [...existing.value, account],
      );
    },

    // To add more than one accounts when already connected to the dapp
    addMorePermittedAccounts: (origin, accounts) => {
      const existing: CaveatConstraint = permissionController.getCaveat(
        origin,
        RestrictedMethods.eth_accounts,
        CaveatTypes.restrictReturnedAccounts,
      );
      // Since this function will be called for unconnected accounts, we dodn't need an extra check
      permissionController.updateCaveat(
        origin,
        RestrictedMethods.eth_accounts,
        CaveatTypes.restrictReturnedAccounts,
        [...existing.value, ...accounts],
      );
    },

    removePermittedAccount: (origin, account) => {
      const existing: CaveatConstraint = permissionController.getCaveat(
        origin,
        RestrictedMethods.eth_accounts,
        CaveatTypes.restrictReturnedAccounts,
      );

      if (
        typeof existing.value !== 'string' ||
        (account && existing.value?.includes(account))
      ) {
        return;
      }

      let remainingAccounts = [];
      if (Array.isArray(existing.value)) {
        remainingAccounts = existing.value.filter(
          (existingAccount) => existingAccount !== account,
        );
      }

      if (remainingAccounts.length === 0) {
        permissionController.revokePermission(
          origin,
          RestrictedMethods.eth_accounts,
        );
      } else {
        permissionController.updateCaveat(
          origin,
          RestrictedMethods.eth_accounts,
          CaveatTypes.restrictReturnedAccounts,
          remainingAccounts,
        );
      }
    },

    requestAccountsPermissionWithId: async (origin) => {
      const id = nanoid();
      await permissionController.requestPermissions(
        { origin },
        {
          eth_accounts: {},
        },
        { id },
      );
      return id;
    },
  };
}

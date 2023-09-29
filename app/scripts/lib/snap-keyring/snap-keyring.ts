import { SnapKeyring } from '@metamask/eth-snap-keyring';
import type { SnapController } from '@metamask/snaps-controllers';
import type {
  ApprovalController,
  ResultComponent,
} from '@metamask/approval-controller';
import type { KeyringController } from '@metamask/keyring-controller';
import { SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES } from '../../../../shared/constants/app';
import { t } from '../../translate';
/**
 * Constructs a SnapKeyring builder with specified handlers for managing snap accounts.
 *
 * @param getSnapController - A function that retrieves the Snap Controller instance.
 * @param getApprovalController - A function that retrieves the Approval Controller instance.
 * @param getCoreKeyringController - A function that retrieves the Core Keyring Controller instance.
 * @param removeAccountHelper - A function to help remove an account based on its address.
 * @returns The constructed SnapKeyring builder instance with the following methods:
 * - `saveState`: Persists all keyrings in the keyring controller.
 * - `addAccount`: Initiates the process of adding an account with user confirmation and handling the user input.
 * - `removeAccount`: Initiates the process of removing an account with user confirmation and handling the user input.
 */
const snapKeyringBuilder = (
  getSnapController: () => SnapController,
  getApprovalController: () => ApprovalController,
  getCoreKeyringController: () => KeyringController,
  removeAccountHelper: (address: string) => Promise<any>,
) => {
  const builder = (() => {
    return new SnapKeyring(getSnapController() as any, {
      addressExists: async (address) => {
        const addresses = await getCoreKeyringController().getAccounts();
        return addresses.includes(address.toLowerCase());
      },
      saveState: async () => {
        await getCoreKeyringController().persistAllKeyrings();
      },
      addAccount: async (
        _address: string,
        origin: string,
        handleUserInput: (accepted: boolean) => Promise<void>,
      ) => {
        const { id: addAccountApprovalId } =
          getApprovalController().startFlow();

        const snapAuthorshipHeader: ResultComponent = {
          name: 'SnapAuthorshipHeader',
          key: 'snapHeader',
          properties: { snapId: origin },
        };

        try {
          const confirmationResult: boolean =
            (await getApprovalController().addAndShowApprovalRequest({
              origin,
              type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.confirmAccountCreation,
            })) as boolean;

          if (confirmationResult) {
            try {
              await handleUserInput(confirmationResult);
              await getCoreKeyringController().persistAllKeyrings();
              await getApprovalController().success({
                message: t('snapAccountCreated') ?? 'Your account is ready!',
                header: [snapAuthorshipHeader],
              });
            } catch (error) {
              await getApprovalController().error({
                error: (error as Error).message,
                header: [snapAuthorshipHeader],
              });
              throw new Error(
                `Error occurred while creating snap account: ${
                  (error as Error).message
                }`,
              );
            }
          } else {
            await handleUserInput(confirmationResult);
            throw new Error('User denied account creation');
          }
        } finally {
          getApprovalController().endFlow({
            id: addAccountApprovalId,
          });
        }
      },
      removeAccount: async (
        address: string,
        snapId: string,
        handleUserInput: (accepted: boolean) => Promise<void>,
      ) => {
        const { id: removeAccountApprovalId } =
          getApprovalController().startFlow();

        const snapAuthorshipHeader: ResultComponent = {
          name: 'SnapAuthorshipHeader',
          key: 'snapHeader',
          properties: { snapId },
        };

        try {
          const confirmationResult: boolean =
            (await getApprovalController().addAndShowApprovalRequest({
              origin: snapId,
              type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.confirmAccountRemoval,
              requestData: { publicAddress: address },
            })) as boolean;

          if (confirmationResult) {
            try {
              await removeAccountHelper(address);
              await handleUserInput(confirmationResult);
              await getCoreKeyringController().persistAllKeyrings();
              await getApprovalController().success({
                message: t('snapAccountRemoved') ?? 'Account removed',
                header: [snapAuthorshipHeader],
              });
            } catch (error) {
              await getApprovalController().error({
                error: (error as Error).message,
                header: [snapAuthorshipHeader],
              });
              throw new Error(
                `Error occurred while removing snap account: ${
                  (error as Error).message
                }`,
              );
            }
          } else {
            await handleUserInput(confirmationResult);
            throw new Error('User denied account removal');
          }
        } finally {
          getApprovalController().endFlow({
            id: removeAccountApprovalId,
          });
        }
      },
    });
  }) as any;
  builder.type = SnapKeyring.type;
  return builder;
};

export default snapKeyringBuilder;

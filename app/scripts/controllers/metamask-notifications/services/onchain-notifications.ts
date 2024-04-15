import log from 'loglevel';
import type { UserStorage } from '../types/user-storage/user-storage';
import { createSHA256Hash } from '../encryption/encryption';
import type { OnChainRawNotification } from '../types/on-chain-notification/on-chain-notification';
import { MetamaskNotificationsUtils } from '../utils/utils';
import type { TRIGGER_TYPES } from '../constants/notification-schema';
import type { components } from '../types/on-chain-notification/schema';

const utils = new MetamaskNotificationsUtils();

export type NotificationTrigger = {
  id: string;
  chainId: string;
  kind: string;
  address: string;
};

export const TRIGGER_API = process.env.TRIGGERS_SERVICE_URL;
export const NOTIFICATION_API = process.env.NOTIFICATIONS_SERVICE_URL;
export const TRIGGER_API_BATCH_ENDPOINT = `${TRIGGER_API}/api/v1/triggers/batch`;
export const NOTIFICATION_API_LIST_ENDPOINT = `${NOTIFICATION_API}/api/v1/notifications`;
export const NOTIFICATION_API_LIST_ENDPOINT_PAGE_QUERY = (page: number) =>
  `${NOTIFICATION_API_LIST_ENDPOINT}?page=${page}&per_page=100`;
export const NOTIFICATION_API_MARK_ALL_AS_READ_ENDPOINT = `${NOTIFICATION_API}/api/v1/notifications/mark-as-read`;

export class OnChainNotificationsService {
  /**
   * Creates on-chain triggers based on the provided notification triggers.
   * This method generates a unique token for each trigger using the trigger ID and storage key,
   * proving ownership of the trigger being updated. It then makes an API call to create these triggers.
   * Upon successful creation, it updates the userStorage to reflect the new trigger status.
   *
   * @param userStorage - The user's storage object where triggers and their statuses are stored.
   * @param storageKey - A key used along with the trigger ID to generate a unique token for each trigger.
   * @param bearerToken - The JSON Web Token used for authentication in the API call.
   * @param triggers - An array of notification triggers to be created. Each trigger includes an ID, chain ID, kind, and address.
   * @returns A promise that resolves to void. Throws an error if the API call fails or if there's an issue creating the triggers.
   */
  public async createOnChainTriggers(
    userStorage: UserStorage,
    storageKey: string,
    bearerToken: string,
    triggers: NotificationTrigger[],
  ): Promise<void> {
    type RequestPayloadTrigger = {
      id: string;
      // this is the trigger token, generated by using the uuid + storage key. It proves you own the trigger you are updating
      token: string;
      config: {
        kind: string;
        chain_id: number;
        address: string;
      };
    };
    const triggersToCreate: RequestPayloadTrigger[] = triggers.map((t) => ({
      id: t.id,
      token: createSHA256Hash(t.id + storageKey),
      config: {
        kind: t.kind,
        chain_id: Number(t.chainId),
        address: t.address,
      },
    }));

    if (triggersToCreate.length === 0) {
      return;
    }

    const response = await MetamaskNotificationsUtils.makeApiCall(
      bearerToken,
      TRIGGER_API_BATCH_ENDPOINT,
      'POST',
      triggersToCreate,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => undefined);
      log.error('Error creating triggers:', errorData);
      throw new Error('OnChain Notifications - unable to create triggers');
    }

    // If the trigger creation was fine
    // then update the userStorage
    for (const trigger of triggersToCreate) {
      MetamaskNotificationsUtils.toggleUserStorageTriggerStatus(
        userStorage,
        trigger.config.address,
        String(trigger.config.chain_id),
        trigger.id,
        true,
      );
    }
  }

  /**
   * Deletes on-chain triggers based on the provided UUIDs.
   * This method generates a unique token for each trigger using the UUID and storage key,
   * proving ownership of the trigger being deleted. It then makes an API call to delete these triggers.
   * Upon successful deletion, it updates the userStorage to remove the deleted trigger statuses.
   *
   * @param userStorage - The user's storage object where triggers and their statuses are stored.
   * @param storageKey - A key used along with the UUID to generate a unique token for each trigger.
   * @param bearerToken - The JSON Web Token used for authentication in the API call.
   * @param uuids - An array of UUIDs representing the triggers to be deleted.
   * @returns A promise that resolves to the updated UserStorage object. Throws an error if the API call fails or if there's an issue deleting the triggers.
   */
  public async deleteOnChainTriggers(
    userStorage: UserStorage,
    storageKey: string,
    bearerToken: string,
    uuids: string[],
  ): Promise<UserStorage> {
    const triggersToDelete = uuids.map((uuid) => ({
      id: uuid,
      token: createSHA256Hash(uuid + storageKey),
    }));

    try {
      const response = await MetamaskNotificationsUtils.makeApiCall(
        bearerToken,
        TRIGGER_API_BATCH_ENDPOINT,
        'DELETE',
        triggersToDelete,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete on-chain notifications for uuids ${uuids.join(
            ', ',
          )}`,
        );
      }

      // Update the state of the deleted trigger to false
      for (const uuid of uuids) {
        for (const address in userStorage) {
          if (Object.hasOwn(userStorage, address)) {
            for (const chainId in userStorage[address]) {
              if (userStorage?.[address]?.[chainId]?.[uuid]) {
                delete userStorage[address][chainId][uuid];
              }
            }
          }
        }
      }

      // Follow-up cleanup, if an address had no triggers whatsoever, then we can delete the address
      const isEmpty = (obj = {}) => Object.keys(obj).length === 0;
      for (const address in userStorage) {
        if (Object.hasOwn(userStorage, address)) {
          for (const chainId in userStorage[address]) {
            // Chain isEmpty Check
            if (isEmpty(userStorage?.[address]?.[chainId])) {
              delete userStorage[address][chainId];
            }
          }

          // Address isEmpty Check
          if (isEmpty(userStorage?.[address])) {
            delete userStorage[address];
          }
        }
      }
    } catch (err) {
      log.error(
        `Error deleting on-chain notifications for uuids ${uuids.join(', ')}:`,
        err,
      );
      throw err;
    }

    return userStorage;
  }

  /**
   * Fetches on-chain notifications for the given user storage and BearerToken.
   * This method iterates through the userStorage to find enabled triggers and fetches notifications for those triggers.
   * It makes paginated API calls to the notifications service, transforming and aggregating the notifications into a single array.
   * The process stops either when all pages have been fetched or when a page has less than 100 notifications, indicating the end of the data.
   *
   * @param userStorage - The user's storage object containing trigger information.
   * @param bearerToken - The JSON Web Token used for authentication in the API call.
   * @returns A promise that resolves to an array of OnChainRawNotification objects. If no triggers are enabled or an error occurs, it may return an empty array.
   */
  public async getOnChainNotifications(
    userStorage: UserStorage,
    bearerToken: string,
  ): Promise<OnChainRawNotification[]> {
    const triggerIds = utils.traverseUserStorageTriggers(userStorage, {
      mapTrigger: (t) => {
        if (!t.enabled) {
          return undefined;
        }
        return t.id;
      },
    });

    if (triggerIds.length === 0) {
      return [];
    }

    const onChainNotifications: OnChainRawNotification[] = [];
    const PAGE_LIMIT = 2;
    for (let page = 1; page <= PAGE_LIMIT; page++) {
      try {
        const response = await MetamaskNotificationsUtils.makeApiCall(
          bearerToken,
          NOTIFICATION_API_LIST_ENDPOINT_PAGE_QUERY(page),
          'POST',
          { trigger_ids: triggerIds },
        );

        const notifications =
          (await response.json()) as OnChainRawNotification[];

        // Transform and sort notifications
        const transformedNotifications = notifications
          .map(
            (
              n: components['schemas']['Notification'],
            ): OnChainRawNotification | undefined => {
              if (!n.data?.kind) {
                return undefined;
              }

              return {
                ...n,
                type: n.data.kind as TRIGGER_TYPES,
              } as OnChainRawNotification;
            },
          )
          .filter((n): n is OnChainRawNotification => Boolean(n));

        onChainNotifications.push(...transformedNotifications);

        // if less than 100 notifications on page, then means we reached end
        if (notifications.length < 100) {
          page = PAGE_LIMIT + 1;
          break;
        }
      } catch (err) {
        log.error(
          `Error fetching on-chain notifications for trigger IDs ${triggerIds.join(
            ', ',
          )}:`,
          err,
        );
        // do nothing
      }
    }

    return onChainNotifications;
  }

  /**
   * Marks the specified notifications as read.
   * This method sends a POST request to the notifications service to mark the provided notification IDs as read.
   * If the operation is successful, it completes without error. If the operation fails, it throws an error with details.
   *
   * @param bearerToken - The JSON Web Token used for authentication in the API call.
   * @param notificationIds - An array of notification IDs to be marked as read.
   * @returns A promise that resolves to void. The promise will reject if there's an error during the API call or if the response status is not 200.
   */
  public async markNotificationsAsRead(
    bearerToken: string,
    notificationIds: string[],
  ): Promise<void> {
    if (notificationIds.length === 0) {
      return;
    }

    try {
      const response = await MetamaskNotificationsUtils.makeApiCall(
        bearerToken,
        NOTIFICATION_API_MARK_ALL_AS_READ_ENDPOINT,
        'POST',
        { ids: notificationIds },
      );

      if (response.status !== 200) {
        const errorData = await response.json().catch(() => undefined);
        throw new Error(
          `Error marking notifications as read: ${errorData?.message}`,
        );
      }
    } catch (err) {
      log.error('Error marking notifications as read:', err);
      throw err;
    }
  }
}

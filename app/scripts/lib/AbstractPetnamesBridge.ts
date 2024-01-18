import {
  NameController,
  NameStateChange,
  NameType,
  SetNameRequest,
} from '@metamask/name-controller';
import { RestrictedControllerMessenger } from '@metamask/base-controller';

// Use the same type for both the source entries and the argument to NameController::setName.
export type PetnameEntry = SetNameRequest & {
  // Name cannot be null in a PetnameEntry, as opposed to in a SetNameRequest,
  // where a null name indicates deletion.
  name: string;
};

// The type of change that occurred.
export enum ChangeType {
  ADDED = 'ADDED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
}

enum SyncDirection {
  SOURCE_TO_PETNAMES = 'Source->Petnames',
  PETNAMES_TO_SOURCE = 'Petnames->Source',
}

// A list of changes, grouped by type.
type ChangeList = Record<ChangeType, PetnameEntry[]>;

type AllowedEvents = NameStateChange;

export type PetnamesBridgeMessenger = RestrictedControllerMessenger<
  'PetnamesBridge',
  never,
  AllowedEvents,
  never,
  AllowedEvents['type']
>;

/**
 * Get a string key for the given entry.
 *
 * @param entry
 */
function getKey(entry: PetnameEntry): string {
  return `${entry.type}/${entry.variation}/${entry.value}`;
}

/**
 * Abstract class representing a bridge between petnames and a data source.
 * Provides methods for synchronizing petnames with the data source and handling changes.
 */
export abstract class AbstractPetnamesBridge {
  #isTwoWay: boolean;

  #nameController: NameController;

  #synchronizingDirection: SyncDirection | null = null;

  #messenger: PetnamesBridgeMessenger;

  /**
   * @param options
   * @param options.isTwoWay - Indicates whether the bridge is two-way or not. One-way bridges are Source->Petnames only.
   * @param options.nameController
   * @param options.messenger
   */
  constructor({
    isTwoWay,
    nameController,
    messenger,
  }: {
    isTwoWay: boolean;
    nameController: NameController;
    messenger: PetnamesBridgeMessenger;
  }) {
    this.#isTwoWay = isTwoWay;
    this.#nameController = nameController;
    this.#messenger = messenger;
  }

  // Initializes listeners
  init(): void {
    if (this.#isTwoWay) {
      this.#messenger.subscribe('NameController:stateChange', () =>
        this.#synchronize(SyncDirection.PETNAMES_TO_SOURCE),
      );
    }
    this.onSourceChange(() =>
      this.#synchronize(SyncDirection.SOURCE_TO_PETNAMES),
    );
  }

  /**
   * Adds a listener for source change events.
   *
   * @param listener - The listener function to be called when a source change event occurs.
   */
  protected abstract onSourceChange(listener: () => void): void;

  /**
   * Retrieves the source entries.
   *
   * @returns An array of PetnameEntry objects representing the source entries.
   */
  protected abstract getSourceEntries(): PetnameEntry[];

  /**
   * Update the Source with the given entry. To be overridden by two-way subclasses.
   *
   * @param _type
   * @param _entry
   */
  protected updateSourceEntry(_type: ChangeType, _entry: PetnameEntry): void {
    throw new Error('updateSourceEntry must be overridden for two-way bridges');
  }

  /**
   * Do you want to sync with only a subset of the petname entries?
   *
   * This predicate describes a subset of NameController state that is relevant
   * to the bridge. Override this method to specify a subset of petname entries.
   *
   * @param _entry - The entry to check for membership.
   * @returns
   */
  protected isSyncParticipant(_entry: PetnameEntry): boolean {
    // All petname entries are sync participants by default.
    return true;
  }

  /**
   * Synchronizes Petnames with the Source or vice versa, depending on the direction.
   *
   * @param direction - The direction to synchronize in.
   */
  #synchronize(direction: SyncDirection): void {
    if (this.#synchronizingDirection === direction) {
      throw new Error(
        `Attempted to synchronize recursively in same direction: ${direction}`,
      );
    }
    if (this.#synchronizingDirection !== null) {
      return; // Ignore calls while updating in the opposite direction
    }

    this.#synchronizingDirection = direction;

    const [newEntries, prevEntries] =
      direction === 'Source->Petnames'
        ? [this.getSourceEntries(), this.#getPetnameEntries()]
        : [this.#getPetnameEntries(), this.getSourceEntries()];

    const changeList = this.#computeChangeList(prevEntries, newEntries);
    this.#applyChangeList(changeList);

    this.#synchronizingDirection = null;
  }

  /**
   * Extract PetnameEntry objects from the name controller state.
   */
  #getPetnameEntries(): PetnameEntry[] {
    const { names } = this.#nameController.state;
    const entries: PetnameEntry[] = [];
    for (const type of Object.values(NameType)) {
      for (const value of Object.keys(names[type])) {
        for (const variation of Object.keys(names[type][value])) {
          const { name, sourceId, origin } = names[type][value][variation];
          if (!name) {
            continue;
          }
          const entry = {
            value,
            type,
            name,
            variation,
            sourceId: sourceId ?? undefined,
            origin: origin ?? undefined,
          };
          if (this.isSyncParticipant(entry)) {
            entries.push(entry);
          }
        }
      }
    }
    return entries;
  }

  /**
   * Updates Petnames with the given entry.
   *
   * @param type - The type of change that occurred.
   * @param entry - The entry to update the name controller with.
   */
  #updatePetnameEntry(type: ChangeType, entry: PetnameEntry): void {
    if (type === ChangeType.DELETED) {
      delete entry.sourceId;
      delete entry.origin;
      this.#nameController.setName({
        ...entry,
        name: null,
      });
    } else {
      // ADDED or UPDATED
      this.#nameController.setName(entry);
    }
  }

  /**
   * Computes the list of changes between the previous and new entries.
   *
   * @param prevEntries - The previous entries.
   * @param newEntries - The new entries.
   * @returns A ChangeList object representing the changes that occurred between prevEntries and newEntries.
   */
  #computeChangeList(
    prevEntries: PetnameEntry[],
    newEntries: PetnameEntry[],
  ): ChangeList {
    const added: PetnameEntry[] = [];
    const updated: PetnameEntry[] = [];
    const deleted: PetnameEntry[] = [];

    const prevEntriesMap = new Map(prevEntries.map((e) => [getKey(e), e]));
    const newEntriesMap = new Map(newEntries.map((e) => [getKey(e), e]));

    newEntriesMap.forEach((newEntry, newKey) => {
      const oldEntry = prevEntriesMap.get(newKey);
      if (oldEntry) {
        if (newEntry.name !== oldEntry.name) {
          updated.push(newEntry);
        }
      } else {
        added.push(newEntry);
      }
    });

    prevEntriesMap.forEach((oldEntry, oldKey) => {
      if (!newEntriesMap.has(oldKey)) {
        deleted.push(oldEntry);
      }
    });

    return {
      [ChangeType.ADDED]: added,
      [ChangeType.UPDATED]: updated,
      [ChangeType.DELETED]: deleted,
    };
  }

  /**
   * Applies the given change list to either the Petnames or Source, depending on the current synchrnoization direction.
   *
   * @param changeList
   */
  #applyChangeList(changeList: ChangeList): void {
    const applyChange =
      this.#synchronizingDirection === SyncDirection.SOURCE_TO_PETNAMES
        ? this.#updatePetnameEntry.bind(this)
        : this.updateSourceEntry.bind(this);

    for (const type of Object.values(ChangeType)) {
      for (const entry of changeList[type]) {
        applyChange(type, entry);
      }
    }
  }
}

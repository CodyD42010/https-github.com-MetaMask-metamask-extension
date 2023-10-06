/**
 * Compares the current date to a specific date in UTC.
 * This method is meant to be used in a specific case related to the
 * Snap Accounts API. It should not be used in other cases.
 * Note: Months are 0-indexed in JS, so 10 represents November
 *
 * @returns true if the current date is after the specified date, false otherwise.
 */
export function showSnapAccountExperimentalToggle(): boolean {
  return new Date().getTime() > Date.UTC(2023, 10, 2, 5);
}

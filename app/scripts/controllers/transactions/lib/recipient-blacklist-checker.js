import blacklist from './recipient-blacklist'

/**
 * Checks if a specified account on a specified network is blacklisted
 * @param {number} networkId
 * @param {string} account
 * @throws {Error} if the account is blacklisted on mainnet
 */
export function throwIfAccountIsBlacklisted (networkId, account) {
  const mainnetId = 1
  if (networkId !== mainnetId) {
    return
  }

  const accountToCheck = account.toLowerCase()
  if (blacklist.includes(accountToCheck)) {
    throw new Error('Recipient is a public account')
  }
}

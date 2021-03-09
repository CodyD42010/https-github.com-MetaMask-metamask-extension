import createAsyncMiddleware from 'json-rpc-engine/src/createAsyncMiddleware'
import { ethErrors } from 'eth-json-rpc-errors'
import { hexToBase32 } from '../../cip37'

/**
 * Create middleware for handling certain methods and preprocessing permissions requests.
 */
export default function createMethodMiddleware({
  getCurrentNetwork,
  store,
  storeKey,
  getAccounts,
  requestAccountsPermission,
}) {
  return createAsyncMiddleware(async (req, res, next) => {
    if (typeof req.method !== 'string') {
      res.error = ethErrors.rpc.invalidRequest({ data: req })
      return
    }
    let accounts = []

    switch (req.method) {
      // intercepting eth_accounts requests for backwards compatibility,
      // i.e. return an empty array instead of an error
      case 'cfx_accounts':
      case 'eth_accounts':
        accounts = await getAccounts()
        res.result = accounts.map(a =>
          hexToBase32(a, parseInt(getCurrentNetwork(), 10))
        )
        return

      case 'cfx_requestAccounts':
      case 'eth_requestAccounts':
        // first, just try to get accounts
        accounts = await getAccounts()
        if (accounts.length > 0) {
          res.result = accounts.map(a =>
            hexToBase32(a, parseInt(getCurrentNetwork(), 10))
          )
          return
        }

        // if no accounts, request the accounts permission
        try {
          await requestAccountsPermission()
        } catch (err) {
          res.error = err
          return
        }

        // get the accounts again
        accounts = await getAccounts()
        if (accounts.length > 0) {
          res.result = accounts.map(a =>
            hexToBase32(a, parseInt(getCurrentNetwork(), 10))
          )
        } else {
          // this should never happen
          res.error = ethErrors.rpc.internal(
            'Accounts unexpectedly unavailable. Please report this bug.'
          )
        }

        return

      // custom method for getting metadata from the requesting domain
      case 'wallet_sendDomainMetadata':
        const storeState = store.getState()[storeKey]
        const extensionId = storeState[req.origin]
          ? storeState[req.origin].extensionId
          : undefined

        if (req.domainMetadata && typeof req.domainMetadata.name === 'string') {
          store.updateState({
            [storeKey]: {
              ...storeState,
              [req.origin]: {
                extensionId,
                ...req.domainMetadata,
              },
            },
          })
        }

        res.result = true
        return

      default:
        break
    }

    next()
  })
}

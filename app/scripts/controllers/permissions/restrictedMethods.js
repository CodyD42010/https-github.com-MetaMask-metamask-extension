export default function getRestrictedMethods ({ getIdentities, getKeyringAccounts }) {
  return {

    'eth_accounts': {
      description: `View the addresses of the user's chosen accounts.`,
      method: (_, res, __, end) => {
        getKeyringAccounts()
          .then((accounts) => {
            const identities = getIdentities()
            res.result = accounts
              .sort((firstAddress, secondAddress) => {
                if (!identities[firstAddress]) {
                  throw new Error(`Missing identity for address ${firstAddress}`)
                } else if (!identities[secondAddress]) {
                  throw new Error(`Missing identity for address ${secondAddress}`)
                } else if (identities[firstAddress].lastSelected === identities[secondAddress].lastSelected) {
                  return 0
                } else if (identities[firstAddress].lastSelected === undefined) {
                  return 1
                } else if (identities[secondAddress].lastSelected === undefined) {
                  return -1
                }

                return identities[secondAddress].lastSelected - identities[firstAddress].lastSelected
              })
            end()
          })
          .catch(
            (err) => {
              res.error = err
              end(err)
            }
          )
      },
    },
  }
}

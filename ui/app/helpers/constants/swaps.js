// An address that the metaswap-api recognizes as ETH, in place of the token address that ERC-20 tokens have
export const ETH_SWAPS_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'

export const ETH_SWAPS_TOKEN_OBJECT = {
  symbol: 'ETH',
  name: 'Ether',
  address: ETH_SWAPS_TOKEN_ADDRESS,
  decimals: 18,
  iconUrl: 'images/black-eth-logo.svg',
}

export const QUOTES_EXPIRED_ERROR = 'quotes-expired'
export const SWAP_FAILED_ERROR = 'swap-failed-error'
export const ERROR_FETCHING_QUOTES = 'error-fetching-quotes'
export const QUOTES_NOT_AVAILABLE_ERROR = 'quotes-not-avilable'

// A gas value for ERC20 approve calls that should be sufficient for all ERC20 approve implementations
export const DEFAULT_ERC20_APPROVE_GAS = '0x1d4c0'

const ethUtil = require('ethereumjs-util')
const ethNetProps = require('eth-net-props')
const {
  ROPSTEN,
  ROPSTEN_CODE,
  ROPSTEN_CHAINID,
  RINKEBY_CODE,
  RINKEBY_CHAINID,
  RINKEBY,
  KOVAN,
  KOVAN_CODE,
  KOVAN_CHAINID,
  MAINNET,
  MAINNET_CODE,
  MAINNET_CHAINID,
  ETH_TICK,
  POA_SOKOL,
  POA_CODE,
  POA_CHAINID,
  POA_TICK,
  POA,
  DAI,
  DAI_CODE,
  DAI_CHAINID,
  GOERLI_TESTNET,
  GOERLI_TESTNET_CODE,
  GOERLI_TESTNET_CHAINID,
  POA_SOKOL_CODE,
  POA_SOKOL_CHAINID,
  RSK_CODE,
  RSK_CHAINID,
  RSK_TESTNET_CODE,
  RSK_TESTNET_CHAINID,
  LOCALHOST,
  CLASSIC,
  CLASSIC_CODE,
  CLASSIC_CHAINID,
  CLASSIC_TICK,
  RSK,
  RSK_TESTNET,
  RSK_TICK,
  customDPaths,
} = require('../../app/scripts/controllers/network/enums')

const valueTable = {
  wei: '1000000000000000000',
  kwei: '1000000000000000',
  mwei: '1000000000000',
  gwei: '1000000000',
  szabo: '1000000',
  finney: '1000',
  ether: '1',
  kether: '0.001',
  mether: '0.000001',
  gether: '0.000000001',
  tether: '0.000000000001',
}
const bnTable = {}
for (const currency in valueTable) {
  bnTable[currency] = new ethUtil.BN(valueTable[currency], 10)
}

module.exports = {
  valuesFor,
  addressSummary,
  accountSummary,
  isAllOneCase,
  isValidAddress,
  isValidENSAddress,
  numericBalance,
  parseBalance,
  formatBalance,
  generateBalanceObject,
  dataSize,
  readableDate,
  normalizeToWei,
  normalizeEthStringToWei,
  normalizeNumberToWei,
  valueTable,
  bnTable,
  isHex,
  exportAsFile,
  isInvalidChecksumAddress,
  countSignificantDecimals,
  getCurrentKeyring,
  ifLooseAcc,
  ifContractAcc,
  ifHardwareAcc,
  getAllKeyRingsAccounts,
  ifRSK,
  ifETC,
  ifRSKByProviderType,
  ifPOA,
  toChecksumAddress,
  isValidChecksumAddress,
  isInfuraProvider,
  isKnownProvider,
  getNetworkID,
  getDPath,
  setDPath,
  getTokenImageFolder,
}

function valuesFor (obj) {
  if (!obj) return []
  return Object.keys(obj)
    .map(function (key) { return obj[key] })
}

function addressSummary (network, address, firstSegLength = 10, lastSegLength = 4, includeHex = true) {
  if (!address) return ''
  let checked = toChecksumAddress(network, address)
  if (!includeHex) {
    checked = ethUtil.stripHexPrefix(checked)
  }
  return checked ? checked.slice(0, firstSegLength) + '...' + checked.slice(checked.length - lastSegLength) : '...'
}

function accountSummary (acc, firstSegLength = 6, lastSegLength = 4) {
  if (!acc) return ''
  if (acc.length < 12) return acc
  let posOfLastPart = acc.length - lastSegLength
  if (posOfLastPart < (firstSegLength + 1)) posOfLastPart += (firstSegLength + 1) - posOfLastPart
  return acc.slice(0, firstSegLength) + '...' + acc.slice(posOfLastPart)
}

function isValidAddress (address, network) {
  const prefixed = ethUtil.addHexPrefix(address)
  if (ifRSK(network)) {
    if (address === '0x0000000000000000000000000000000000000000') return false
    return (ethUtil.isValidAddress(prefixed))
  } else {
    if (address === '0x0000000000000000000000000000000000000000') return false
    return (isAllOneCase(prefixed) && ethUtil.isValidAddress(prefixed)) || ethUtil.isValidChecksumAddress(prefixed)
  }
}

function isValidENSAddress (address) {
  return address.match(/^.{7,}\.(eth|test)$/)
}

function isInvalidChecksumAddress (address, network) {
  const prefixed = ethUtil.addHexPrefix(address)
  if (address === '0x0000000000000000000000000000000000000000') return false
  return !isAllOneCase(prefixed) && !isValidChecksumAddress(network, prefixed)
}

function isAllOneCase (address) {
  if (!address) return true
  const lower = address.toLowerCase()
  const upper = address.toUpperCase()
  return address === lower || address === upper
}

// Takes wei Hex, returns wei BN, even if input is null
function numericBalance (balance) {
  if (!balance) return new ethUtil.BN(0, 16)
  const stripped = ethUtil.stripHexPrefix(balance)
  return new ethUtil.BN(stripped, 16)
}

// Takes  hex, returns [beforeDecimal, afterDecimal]
function parseBalance (balance) {
  let afterDecimal
  const wei = numericBalance(balance)
  const weiString = wei.toString()
  const trailingZeros = /0+$/

  const beforeDecimal = weiString.length > 18 ? weiString.slice(0, weiString.length - 18) : '0'
  afterDecimal = ('000000000000000000' + wei).slice(-18).replace(trailingZeros, '')
  if (afterDecimal === '') { afterDecimal = '0' }
  return [beforeDecimal, afterDecimal]
}

// Takes wei hex, returns an object with three properties.
// Its "formatted" property is what we generally use to render values.
function formatBalance (balance, decimalsToKeep, needsParse = true, network, isToken, tokenSymbol) {
  const coinName = ethNetProps.props.getNetworkCoinName(network)
  const assetName = isToken ? tokenSymbol : coinName
  const parsed = needsParse ? parseBalance(balance) : balance.split('.')
  const beforeDecimal = parsed[0]
  let afterDecimal = parsed[1]
  let formatted = '0'
  if (decimalsToKeep === undefined) {
    if (beforeDecimal === '0') {
      if (afterDecimal !== '0') {
        const sigFigs = afterDecimal.match(/^0*(.{2})/) // default: grabs 2 most significant digits
        if (sigFigs) { afterDecimal = sigFigs[0] }
        formatted = '0.' + afterDecimal + ` ${assetName}`
      }
    } else {
      formatted = beforeDecimal + '.' + afterDecimal.slice(0, 3) + ` ${assetName}`
    }
  } else {
    afterDecimal += Array(decimalsToKeep).join('0')
    formatted = beforeDecimal + '.' + afterDecimal.slice(0, decimalsToKeep) + ` ${assetName}`
  }
  return formatted
}


function generateBalanceObject (formattedBalance, decimalsToKeep = 1) {
  let balance = formattedBalance.split(' ')[0]
  const label = formattedBalance.split(' ')[1]
  const beforeDecimal = balance.split('.')[0]
  const afterDecimal = balance.split('.')[1]
  const shortBalance = shortenBalance(balance, decimalsToKeep)

  if (beforeDecimal === '0' && afterDecimal.substr(0, 5) === '00000') {
    // eslint-disable-next-line eqeqeq
    if (afterDecimal == 0) {
      balance = '0'
    } else {
      balance = '<1.0e-5'
    }
  } else if (beforeDecimal !== '0') {
    balance = `${beforeDecimal}.${afterDecimal.slice(0, decimalsToKeep)}`
  }

  return { balance, label, shortBalance }
}

function shortenBalance (balance, decimalsToKeep = 1) {
  let truncatedValue
  const convertedBalance = parseFloat(balance)
  if (convertedBalance > 1000000) {
    truncatedValue = (balance / 1000000).toFixed(decimalsToKeep)
    return `${truncatedValue}m`
  } else if (convertedBalance > 1000) {
    truncatedValue = (balance / 1000).toFixed(decimalsToKeep)
    return `${truncatedValue}k`
  } else if (convertedBalance === 0) {
    return '0'
  } else if (convertedBalance < 0.001) {
    return '<0.001'
  } else if (convertedBalance < 1) {
    const stringBalance = convertedBalance.toString()
    if (stringBalance.split('.')[1].length > 3) {
      return convertedBalance.toFixed(3)
    } else {
      return stringBalance
    }
  } else {
    return convertedBalance.toFixed(decimalsToKeep)
  }
}

function dataSize (data) {
  const size = data ? ethUtil.stripHexPrefix(data).length : 0
  return size + ' bytes'
}

// Takes a BN and an ethereum currency name,
// returns a BN in wei
function normalizeToWei (amount, currency) {
  try {
    return amount.mul(bnTable.wei).div(bnTable[currency])
  } catch (e) {}
  return amount
}

function normalizeEthStringToWei (str) {
  const parts = str.split('.')
  let eth = new ethUtil.BN(parts[0], 10).mul(bnTable.wei)
  if (parts[1]) {
    let decimal = parts[1]
    while (decimal.length < 18) {
      decimal += '0'
    }
    if (decimal.length > 18) {
      decimal = decimal.slice(0, 18)
    }
    const decimalBN = new ethUtil.BN(decimal, 10)
    eth = eth.add(decimalBN)
  }
  return eth
}

const multiple = new ethUtil.BN('10000', 10)
function normalizeNumberToWei (n, currency) {
  const enlarged = n * 10000
  const amount = new ethUtil.BN(String(enlarged), 10)
  return normalizeToWei(amount, currency).div(multiple)
}

function readableDate (ms) {
  const date = new Date(ms)
  const month = date.getMonth()
  const day = date.getDate()
  const year = date.getFullYear()
  const hours = date.getHours()
  const minutes = '0' + date.getMinutes()
  const seconds = '0' + date.getSeconds()

  const dateStr = `${month}/${day}/${year}`
  const time = `${hours}:${minutes.substr(-2)}:${seconds.substr(-2)}`
  return `${dateStr} ${time}`
}

function isHex (str) {
  return Boolean(str.match(/^(0x)?[0-9a-fA-F]+$/))
}

function exportAsFile (filename, data) {
  // source: https://stackoverflow.com/a/33542499 by Ludovic Feltz
  const blob = new Blob([data], {type: 'text/csv'})
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveBlob(blob, filename)
  } else {
    const elem = window.document.createElement('a')
    elem.target = '_blank'
    elem.href = window.URL.createObjectURL(blob)
    elem.download = filename
    document.body.appendChild(elem)
    elem.click()
    document.body.removeChild(elem)
  }
}

/**
 * returns the length of truncated significant decimals for fiat value
 *
 * @param {float} val The float value to be truncated
 * @param {number} len The length of significant decimals
 *
 * returns {number} The length of truncated significant decimals
**/
function countSignificantDecimals (val, len) {
    if (Math.floor(val) === val) {
      return 0
    }
    const decimals = val.toString().split('.')[1]
    const decimalsArr = decimals.split('')
    let decimalsLen = decimalsArr.slice(0).reduce((res, val, ind, arr) => {
      if (Number(val) === 0) {
        res += 1
      } else {
        arr.splice(1) // break reduce function
      }
      return res
    }, 0)
    decimalsLen += len
    const valWithSignificantDecimals = `${Math.floor(val)}.${decimalsArr.slice(0, decimalsLen).join('')}`
    decimalsLen = parseFloat(valWithSignificantDecimals).toString().split('.')[1].length
    return decimalsLen || 0
}

/**
 * retrieves the current unlocked keyring
 *
 * @param {string} address The current unlocked address
 * @param {array} keyrings The array of keyrings
 * @param {array} identities The array of identities
 *
 * returns {object} keyring object corresponding to unlocked address
**/
function getCurrentKeyring (address, network, keyrings, identities) {
  const identity = identities[address]
  const simpleAddress = identity && identity.address.substring(2).toLowerCase()
  const keyring = keyrings && keyrings.find((kr) => {
    const isAddressIncluded = kr.accounts.includes(simpleAddress) || kr.accounts.includes(address)
    if (ifContractAcc(kr)) {
      return kr.network === network && isAddressIncluded
    } else {
      return isAddressIncluded
    }
  })

  return keyring
}

/**
 * checks, if keyring is imported account
 *
 * @param {object} keyring
 *
 * returns {boolean} true, if keyring is importec and false, if it is not
**/
function ifLooseAcc (keyring) {
  try { // Sometimes keyrings aren't loaded yet:
    const type = keyring.type
    const isLoose = type !== 'HD Key Tree'
    return isLoose
  } catch (e) { return }
}


/**
 * checks, if keyring is contract
 *
 * @param {object} keyring
 *
 * returns {boolean} true, if keyring is contract and false, if it is not
**/
function ifContractAcc (keyring) {
  try { // Sometimes keyrings aren't loaded yet:
    const type = keyring.type
    const isContract = type === 'Simple Address'
    return isContract
  } catch (e) { return }
}

/**
 * checks, if keyring is of hardware type
 *
 * @param {object} keyring
 *
 * returns {boolean} true, if keyring is of hardware type and false, if it is not
**/
function ifHardwareAcc (keyring) {
  if (keyring && keyring.type.search('Hardware') !== -1) {
    return true
  }
  return false
}


function getAllKeyRingsAccounts (keyrings, network) {
  const accountOrder = keyrings.reduce((list, keyring) => {
    if (ifContractAcc(keyring) && keyring.network === network) {
      list = list.concat(keyring.accounts)
    } else if (!ifContractAcc(keyring)) {
      list = list.concat(keyring.accounts)
    }
    return list
  }, [])
  return accountOrder
}

function ifRSK (network) {
  if (!network) return false
  const numericNet = isNaN(network) ? network : parseInt(network)
  return numericNet === RSK_CODE || numericNet === RSK_TESTNET_CODE
}

function ifETC (network) {
  if (!network) return false
  const numericNet = isNaN(network) ? network : parseInt(network)
  return numericNet === CLASSIC_CODE
}

function ifRSKByProviderType (type) {
  if (!type) return false
  return type === RSK || type === RSK_TESTNET
}

function ifPOA (network) {
  if (!network) return false
  const numericNet = isNaN(network) ? network : parseInt(network)
  return numericNet === POA_SOKOL_CODE || numericNet === POA_CODE || numericNet === DAI_CODE
}

function toChecksumAddressRSK (address, chainId = null) {
  const zeroX = '0x'
  const stripAddress = ethUtil.stripHexPrefix(address).toLowerCase()
  const prefix = chainId !== null ? (chainId.toString() + zeroX) : ''
  const keccakHash = ethUtil.sha3(prefix + stripAddress).toString('hex')
  let output = zeroX

  for (let i = 0; i < stripAddress.length; i++) {
   output += parseInt(keccakHash[i], 16) >= 8 ?
              stripAddress[i].toUpperCase() :
              stripAddress[i]
  }

  return output
}

function toChecksumAddress (network, address, chainId = null) {
  if (ifRSK(network)) {
    return toChecksumAddressRSK(address, parseInt(network))
  } else {
    return ethUtil.toChecksumAddress(address, chainId)
  }
}

function isValidChecksumAddress (network, address) {
  return isValidAddress(address, network) && toChecksumAddress(network, address) === address
}

function isInfuraProvider (type) {
  const INFURA_PROVIDER_TYPES = [ROPSTEN, RINKEBY, KOVAN, MAINNET]
  return INFURA_PROVIDER_TYPES.includes(type)
}

function isKnownProvider (type) {
  const INFURA_PROVIDER_TYPES = [ROPSTEN, RINKEBY, KOVAN, MAINNET]
  return INFURA_PROVIDER_TYPES.includes(type) ||
  type === LOCALHOST ||
  type === POA_SOKOL ||
  type === POA ||
  type === DAI ||
  type === GOERLI_TESTNET ||
  type === CLASSIC ||
  type === RSK ||
  type === RSK_TESTNET
}

function getNetworkID ({ network }) {
  let chainId
  let netId
  let ticker
  switch (network) {
    case MAINNET:
      netId = MAINNET_CODE.toString()
      chainId = MAINNET_CHAINID
      ticker = ETH_TICK
      break
    case ROPSTEN:
      netId = ROPSTEN_CODE.toString()
      chainId = ROPSTEN_CHAINID
      ticker = ETH_TICK
      break
    case RINKEBY:
      netId = RINKEBY_CODE.toString()
      chainId = RINKEBY_CHAINID
      ticker = ETH_TICK
      break
    case KOVAN:
      netId = KOVAN_CODE.toString()
      chainId = KOVAN_CHAINID
      ticker = ETH_TICK
      break
    case GOERLI_TESTNET:
      netId = GOERLI_TESTNET_CODE.toString()
      chainId = GOERLI_TESTNET_CHAINID
      ticker = ETH_TICK
      break
    case POA:
      netId = POA_CODE.toString()
      chainId = POA_CHAINID
      ticker = POA_TICK
      break
    case DAI:
      netId = DAI_CODE.toString()
      chainId = DAI_CHAINID
      ticker = POA_TICK
      break
    case POA_SOKOL:
      netId = POA_SOKOL_CODE.toString()
      chainId = POA_SOKOL_CHAINID
      ticker = POA_TICK
      break
    case RSK:
      netId = RSK_CODE.toString()
      chainId = RSK_CHAINID
      ticker = RSK_TICK
      break
    case RSK_TESTNET:
      netId = RSK_TESTNET_CODE.toString()
      chainId = RSK_TESTNET_CHAINID
      ticker = RSK_TICK
      break
    case CLASSIC:
      netId = CLASSIC_CODE.toString()
      chainId = CLASSIC_CHAINID
      ticker = CLASSIC_TICK
      break
    default:
      console.error(`getNetworkID - unknown network "${network}"`)
  }
  return {
    chainId, netId, ticker,
  }
}

function getDPath (networkType, isCreatedWithCorrectDPath) {
  if (isCreatedWithCorrectDPath) {
    return customDPaths[networkType] || `m/44'/60'/0'/0`
  } else {
    return `m/44'/60'/0'/0`
  }
}

function setDPath (keyring, networkType, isCreatedWithCorrectDPath) {
  const dPath = getDPath(networkType, isCreatedWithCorrectDPath)
  if (dPath && keyring.setHdPath) {
    keyring.setHdPath(dPath)
  }
}

function getTokenImageFolder (networkID) {
  switch (networkID) {
    case MAINNET_CODE:
      return 'images/contract'
    case POA_CODE:
      return 'images/contractPOA'
    case RSK_CODE:
      return 'images/contractRSK'
    case RSK_TESTNET_CODE:
      return 'images/contractRSKTest'
    default:
      return 'images/contractPOA'
  }
}

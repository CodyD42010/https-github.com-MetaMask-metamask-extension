import browser from 'webextension-polyfill';
import BN from 'bn.js';
import { memoize } from 'lodash';
import { CHAIN_IDS, TEST_CHAINS } from '../../../shared/constants/network';

import {
  ENVIRONMENT_TYPE_POPUP,
  ENVIRONMENT_TYPE_NOTIFICATION,
  ENVIRONMENT_TYPE_FULLSCREEN,
  ENVIRONMENT_TYPE_BACKGROUND,
  PLATFORM_FIREFOX,
  PLATFORM_OPERA,
  PLATFORM_CHROME,
  PLATFORM_EDGE,
  PLATFORM_BRAVE,
} from '../../../shared/constants/app';
import { stripHexPrefix } from '../../../shared/modules/hexstring-utils';
import { TransactionEnvelopeType } from '../../../shared/constants/transaction';

/**
 * @see {@link getEnvironmentType}
 */
const getEnvironmentTypeMemo = memoize((url) => {
  const parsedUrl = new URL(url);
  if (parsedUrl.pathname === '/popup.html') {
    return ENVIRONMENT_TYPE_POPUP;
  } else if (['/home.html'].includes(parsedUrl.pathname)) {
    return ENVIRONMENT_TYPE_FULLSCREEN;
  } else if (parsedUrl.pathname === '/notification.html') {
    return ENVIRONMENT_TYPE_NOTIFICATION;
  }
  return ENVIRONMENT_TYPE_BACKGROUND;
});

/**
 * Returns the window type for the application
 *
 *  - `popup` refers to the extension opened through the browser app icon (in top right corner in chrome and firefox)
 *  - `fullscreen` refers to the main browser window
 *  - `notification` refers to the popup that appears in its own window when taking action outside of metamask
 *  - `background` refers to the background page
 *
 * NOTE: This should only be called on internal URLs.
 *
 * @param {string} [url] - the URL of the window
 * @returns {string} the environment ENUM
 */
const getEnvironmentType = (url = window.location.href) =>
  getEnvironmentTypeMemo(url);

/**
 * Returns the platform (browser) where the extension is running.
 *
 * @returns {string} the platform ENUM
 */
const getPlatform = () => {
  const { navigator } = window;
  const { userAgent } = navigator;

  if (userAgent.includes('Firefox')) {
    return PLATFORM_FIREFOX;
  } else if ('brave' in navigator) {
    return PLATFORM_BRAVE;
  } else if (userAgent.includes('Edg/')) {
    return PLATFORM_EDGE;
  } else if (userAgent.includes('OPR')) {
    return PLATFORM_OPERA;
  }
  return PLATFORM_CHROME;
};

/**
 * Converts a hex string to a BN object
 *
 * @param {string} inputHex - A number represented as a hex string
 * @returns {object} A BN object
 */
function hexToBn(inputHex) {
  return new BN(stripHexPrefix(inputHex), 16);
}

/**
 * Used to multiply a BN by a fraction
 *
 * @param {BN} targetBN - The number to multiply by a fraction
 * @param {number|string} numerator - The numerator of the fraction multiplier
 * @param {number|string} denominator - The denominator of the fraction multiplier
 * @returns {BN} The product of the multiplication
 */
function BnMultiplyByFraction(targetBN, numerator, denominator) {
  const numBN = new BN(numerator);
  const denomBN = new BN(denominator);
  return targetBN.mul(numBN).div(denomBN);
}

/**
 * Returns an Error if extension.runtime.lastError is present
 * this is a workaround for the non-standard error object that's used
 *
 * @deprecated use checkForLastError in shared/modules/browser-runtime.utils.js
 * @returns {Error|undefined}
 */
function checkForError() {
  const { lastError } = browser.runtime;
  if (!lastError) {
    return undefined;
  }
  // if it quacks like an Error, its an Error
  if (lastError.stack && lastError.message) {
    return lastError;
  }
  // repair incomplete error object (eg chromium v77)
  return new Error(lastError.message);
}

/**
 * Prefixes a hex string with '0x' or '-0x' and returns it. Idempotent.
 *
 * @param {string} str - The string to prefix.
 * @returns {string} The prefixed string.
 */
const addHexPrefix = (str) => {
  if (typeof str !== 'string' || str.match(/^-?0x/u)) {
    return str;
  }

  if (str.match(/^-?0X/u)) {
    return str.replace('0X', '0x');
  }

  if (str.startsWith('-')) {
    return str.replace('-', '-0x');
  }

  return `0x${str}`;
};

/**
 * Converts a BN object to a hex string with a '0x' prefix
 *
 * @param {BN} inputBn - The BN to convert to a hex string
 * @returns {string} A '0x' prefixed hex string
 */
function bnToHex(inputBn) {
  return addHexPrefix(inputBn.toString(16));
}

function getChainType(chainId) {
  if (chainId === CHAIN_IDS.MAINNET) {
    return 'mainnet';
  } else if (TEST_CHAINS.includes(chainId)) {
    return 'testnet';
  }
  return 'custom';
}

/**
 * Checks if the alarmname exists in the list
 *
 * @param {Array} alarmList
 * @param alarmName
 * @returns
 */
function checkAlarmExists(alarmList, alarmName) {
  return alarmList.some((alarm) => alarm.name === alarmName);
}

export {
  getPlatform,
  getEnvironmentType,
  hexToBn,
  BnMultiplyByFraction,
  checkForError,
  addHexPrefix,
  bnToHex,
  getChainType,
  checkAlarmExists,
};

// Taken from https://stackoverflow.com/a/1349426/3696652
const characters =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const generateRandomId = () => {
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < 20; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const isValidDate = (d) => {
  return d instanceof Date && !isNaN(d);
};

/**
 * A deferred Promise.
 *
 * A deferred Promise is one that can be resolved or rejected independently of
 * the Promise construction.
 *
 * @typedef {object} DeferredPromise
 * @property {Promise} promise - The Promise that has been deferred.
 * @property {() => void} resolve - A function that resolves the Promise.
 * @property {() => void} reject - A function that rejects the Promise.
 */

/**
 * Create a defered Promise.
 *
 * @returns {DeferredPromise} A deferred Promise.
 */
export function deferredPromise() {
  let resolve;
  let reject;
  const promise = new Promise((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

/**
 * Returns a function with arity 1 that caches the argument that the function
 * is called with and invokes the comparator with both the cached, previous,
 * value and the current value. If specified, the initialValue will be passed
 * in as the previous value on the first invocation of the returned method.
 *
 * @template A - The type of the compared value.
 * @param {(prevValue: A, nextValue: A) => void} comparator - A method to compare
 * the previous and next values.
 * @param {A} [initialValue] - The initial value to supply to prevValue
 * on first call of the method.
 */
export function previousValueComparator(comparator, initialValue) {
  let first = true;
  let cache;
  return (value) => {
    try {
      if (first) {
        first = false;
        return comparator(initialValue ?? value, value);
      }
      return comparator(cache, value);
    } finally {
      cache = value;
    }
  };
}

export function addUrlProtocolPrefix(urlString) {
  if (!urlString.match(/(^http:\/\/)|(^https:\/\/)/u)) {
    return `https://${urlString}`;
  }
  return urlString;
}

export function formatTxMetaForRpcResult(txMeta) {
  const { r, s, v, hash, txReceipt, txParams } = txMeta;
  const {
    to,
    data,
    nonce,
    gas,
    from,
    value,
    gasPrice,
    accessList,
    maxFeePerGas,
    maxPriorityFeePerGas,
  } = txParams;

  const formattedTxMeta = {
    v,
    r,
    s,
    to,
    gas,
    from,
    hash,
    nonce,
    input: data || '0x',
    value: value || '0x0',
    accessList: accessList || null,
    blockHash: txReceipt?.blockHash || null,
    blockNumber: txReceipt?.blockNumber || null,
    transactionIndex: txReceipt?.transactionIndex || null,
  };

  if (maxFeePerGas && maxPriorityFeePerGas) {
    formattedTxMeta.gasPrice = maxFeePerGas;
    formattedTxMeta.maxFeePerGas = maxFeePerGas;
    formattedTxMeta.maxPriorityFeePerGas = maxPriorityFeePerGas;
    formattedTxMeta.type = TransactionEnvelopeType.feeMarket;
  } else {
    formattedTxMeta.gasPrice = gasPrice;
    formattedTxMeta.type = TransactionEnvelopeType.legacy;
  }

  return formattedTxMeta;
}

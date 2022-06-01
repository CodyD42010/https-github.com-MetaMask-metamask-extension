/**
 * @file The entry point for the web extension singleton process.
 */

import endOfStream from 'end-of-stream';
import log from 'loglevel';
import browser from 'webextension-polyfill';
import PortStream from 'extension-port-stream';

import {
  ENVIRONMENT_TYPE_POPUP,
  ENVIRONMENT_TYPE_NOTIFICATION,
  ENVIRONMENT_TYPE_FULLSCREEN,
  PLATFORM_FIREFOX,
} from '../../shared/constants/app';
import { isManifestV3 } from '../../shared/modules/mv3.utils';
import ExtensionPlatform from './platforms/extension';
import LocalStore from './lib/local-store';
import ReadOnlyNetworkStore from './lib/network-store';
import NotificationManager from './lib/notification-manager';
import { getPlatform } from './lib/util';

import { sampleState } from './sample_state';
import { setupMultiplex } from './lib/stream-utils';

/* eslint-enable import/first */

const metamaskInternalProcessHash = {
  [ENVIRONMENT_TYPE_POPUP]: true,
  [ENVIRONMENT_TYPE_NOTIFICATION]: true,
  [ENVIRONMENT_TYPE_FULLSCREEN]: true,
};

const metamaskBlockedPorts = ['trezor-connect'];

log.setDefaultLevel(process.env.METAMASK_DEBUG ? 'debug' : 'info');

const platform = new ExtensionPlatform();

const notificationManager = new NotificationManager();
global.METAMASK_NOTIFIER = notificationManager;

const openMetamaskTabsIDs = {};
const requestAccountTabIds = {};

// state persistence
const inTest = process.env.IN_TEST;
const localStore = inTest ? new ReadOnlyNetworkStore() : new LocalStore();

if (inTest || process.env.METAMASK_DEBUG) {
  global.metamaskGetState = localStore.get.bind(localStore);
}

/**
 * In case of MV3 we attach a "onConnect" event listener as soon as the application is initialised.
 * Reason is that in case of MV3 a delay in doing this was resulting in missing first connect event after service worker is re-activated.
 */

const initApp = async (remotePort) => {
  browser.runtime.onConnect.removeListener(initApp);
  await initialize(remotePort);
  log.info('MetaMask initialization complete.');
};

if (isManifestV3()) {
  browser.runtime.onConnect.addListener(initApp);
} else {
  // initialization flow
  initialize().catch(log.error);
}

/**
 * @typedef {import('../../shared/constants/transaction').TransactionMeta} TransactionMeta
 */

/**
 * The data emitted from the MetaMaskController.store EventEmitter, also used to initialize the MetaMaskController. Available in UI on React state as state.metamask.
 *
 * @typedef MetaMaskState
 * @property {boolean} isInitialized - Whether the first vault has been created.
 * @property {boolean} isUnlocked - Whether the vault is currently decrypted and accounts are available for selection.
 * @property {boolean} isAccountMenuOpen - Represents whether the main account selection UI is currently displayed.
 * @property {Object} identities - An object matching lower-case hex addresses to Identity objects with "address" and "name" (nickname) keys.
 * @property {Object} unapprovedTxs - An object mapping transaction hashes to unapproved transactions.
 * @property {Array} frequentRpcList - A list of frequently used RPCs, including custom user-provided ones.
 * @property {Array} addressBook - A list of previously sent to addresses.
 * @property {Object} contractExchangeRates - Info about current token prices.
 * @property {Array} tokens - Tokens held by the current user, including their balances.
 * @property {Object} send - TODO: Document
 * @property {boolean} useBlockie - Indicates preferred user identicon format. True for blockie, false for Jazzicon.
 * @property {Object} featureFlags - An object for optional feature flags.
 * @property {boolean} welcomeScreen - True if welcome screen should be shown.
 * @property {string} currentLocale - A locale string matching the user's preferred display language.
 * @property {Object} provider - The current selected network provider.
 * @property {string} provider.rpcUrl - The address for the RPC API, if using an RPC API.
 * @property {string} provider.type - An identifier for the type of network selected, allows MetaMask to use custom provider strategies for known networks.
 * @property {string} network - A stringified number of the current network ID.
 * @property {Object} accounts - An object mapping lower-case hex addresses to objects with "balance" and "address" keys, both storing hex string values.
 * @property {hex} currentBlockGasLimit - The most recently seen block gas limit, in a lower case hex prefixed string.
 * @property {TransactionMeta[]} currentNetworkTxList - An array of transactions associated with the currently selected network.
 * @property {Object} unapprovedMsgs - An object of messages pending approval, mapping a unique ID to the options.
 * @property {number} unapprovedMsgCount - The number of messages in unapprovedMsgs.
 * @property {Object} unapprovedPersonalMsgs - An object of messages pending approval, mapping a unique ID to the options.
 * @property {number} unapprovedPersonalMsgCount - The number of messages in unapprovedPersonalMsgs.
 * @property {Object} unapprovedEncryptionPublicKeyMsgs - An object of messages pending approval, mapping a unique ID to the options.
 * @property {number} unapprovedEncryptionPublicKeyMsgCount - The number of messages in EncryptionPublicKeyMsgs.
 * @property {Object} unapprovedDecryptMsgs - An object of messages pending approval, mapping a unique ID to the options.
 * @property {number} unapprovedDecryptMsgCount - The number of messages in unapprovedDecryptMsgs.
 * @property {Object} unapprovedTypedMsgs - An object of messages pending approval, mapping a unique ID to the options.
 * @property {number} unapprovedTypedMsgCount - The number of messages in unapprovedTypedMsgs.
 * @property {number} pendingApprovalCount - The number of pending request in the approval controller.
 * @property {string[]} keyringTypes - An array of unique keyring identifying strings, representing available strategies for creating accounts.
 * @property {Keyring[]} keyrings - An array of keyring descriptions, summarizing the accounts that are available for use, and what keyrings they belong to.
 * @property {string} selectedAddress - A lower case hex string of the currently selected address.
 * @property {string} currentCurrency - A string identifying the user's preferred display currency, for use in showing conversion rates.
 * @property {number} conversionRate - A number representing the current exchange rate from the user's preferred currency to Ether.
 * @property {number} conversionDate - A unix epoch date (ms) for the time the current conversion rate was last retrieved.
 * @property {boolean} forgottenPassword - Returns true if the user has initiated the password recovery screen, is recovering from seed phrase.
 */

/**
 * @typedef VersionedData
 * @property {MetaMaskState} data - The data emitted from MetaMask controller, or used to initialize it.
 * @property {number} version - The latest migration version that has been run.
 */

/**
 * Initializes the MetaMask controller, and sets up all platform configuration.
 *
 * @param {string} remotePort - remote application port connecting to extension.
 * @returns {Promise} Setup complete.
 */
async function initialize(remotePort) {
  await setupController(remotePort);
  log.info('MetaMask initialization complete.');
}

/**
 * Initializes the MetaMask Controller with any initial state and default language.
 * Configures platform-specific error reporting strategy.
 * Streams emitted state updates to platform-specific storage strategy.
 * Creates platform listeners for new Dapps/Contexts, and sets up their data connections to the controller.
 *
 * @param {Object} initState - The initial state to start the controller with, matches the state that is emitted from the controller.
 * @param {string} initLangCode - The region code for the language preferred by the current user.
 * @param {string} remoteSourcePort - remote application port connecting to extension.
 * @returns {Promise} After setup is complete.
 */
function setupController(remoteSourcePort) {
  //
  // connect to other contexts
  //
  if (isManifestV3() && remoteSourcePort) {
    connectRemote(remoteSourcePort);
  }

  browser.runtime.onConnect.addListener(connectRemote);
  /**
   * A runtime.Port object, as provided by the browser:
   *
   * @see https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/Port
   * @typedef Port
   * @type Object
   */

  /**
   * Connects a Port to the MetaMask controller via a multiplexed duplex stream.
   * This method identifies trusted (MetaMask) interfaces, and connects them differently from untrusted (web pages).
   *
   * @param {Port} remotePort - The port provided by a new context.
   */
  function connectRemote(remotePort) {
    const processName = remotePort.name;

    if (metamaskBlockedPorts.includes(remotePort.name)) {
      return;
    }

    let isMetaMaskInternalProcess = false;
    const sourcePlatform = getPlatform();

    if (sourcePlatform === PLATFORM_FIREFOX) {
      isMetaMaskInternalProcess = metamaskInternalProcessHash[processName];
    } else {
      isMetaMaskInternalProcess =
        remotePort.sender.origin === `chrome-extension://${browser.runtime.id}`;
    }

    if (isMetaMaskInternalProcess) {
      const portStream = new PortStream(remotePort);
      // communication with popup
      // controller.isClientOpen = true;
      console.log('test');
      // eslint-disable-next-line
      chrome.storage.session.set({ ui_state: sampleState });
      setupTrustedCommunication(portStream);

      if (isManifestV3()) {
        // Message below if captured by UI code in app/scripts/ui.js which will trigger UI initialisation
        // This ensures that UI is initialised only after background is ready
        // It fixes the issue of blank screen coming when extension is loaded, the issue is very frequent in MV3
        remotePort.postMessage({ name: 'CONNECTION_READY' });
      }

      // if (processName === ENVIRONMENT_TYPE_POPUP) {
      //   popupIsOpen = true;
      //   endOfStream(portStream, () => {
      //     popupIsOpen = false;
      //     const isClientOpen = isClientOpenStatus();
      //     // controller.isClientOpen = isClientOpen;
      //     onCloseEnvironmentInstances(isClientOpen, ENVIRONMENT_TYPE_POPUP);
      //   });
      // }

      // if (processName === ENVIRONMENT_TYPE_NOTIFICATION) {
      //   notificationIsOpen = true;

      //   endOfStream(portStream, () => {
      //     notificationIsOpen = false;
      //     const isClientOpen = isClientOpenStatus();
      //     // controller.isClientOpen = isClientOpen;
      //     onCloseEnvironmentInstances(
      //       isClientOpen,
      //       ENVIRONMENT_TYPE_NOTIFICATION,
      //     );
      //   });
      // }

      if (processName === ENVIRONMENT_TYPE_FULLSCREEN) {
        const tabId = remotePort.sender.tab.id;
        openMetamaskTabsIDs[tabId] = true;

        endOfStream(portStream, () => {
          delete openMetamaskTabsIDs[tabId];
          // const isClientOpen = isClientOpenStatus();
          // // controller.isClientOpen = isClientOpen;
          // onCloseEnvironmentInstances(
          //   isClientOpen,
          //   ENVIRONMENT_TYPE_FULLSCREEN,
          // );
        });
      }
    } else if (
      remotePort.sender &&
      remotePort.sender.tab &&
      remotePort.sender.url
    ) {
      const tabId = remotePort.sender.tab.id;
      const url = new URL(remotePort.sender.url);
      const { origin } = url;

      remotePort.onMessage.addListener((msg) => {
        if (msg.data && msg.data.method === 'eth_requestAccounts') {
          requestAccountTabIds[origin] = tabId;
        }
      });
    }
  }

  return Promise.resolve();
}

//
// Etc...
//

// On first install, open a new tab with MetaMask
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (
    reason === 'install' &&
    !(process.env.METAMASK_DEBUG || process.env.IN_TEST)
  ) {
    platform.openExtensionInBrowser();
  }
});

/**
 * Used to create a multiplexed stream for connecting to a trusted context,
 * like our own user interfaces, which have the provider APIs, but also
 * receive the exported API from this controller, which includes trusted
 * functions, like the ability to approve transactions or sign messages.
 *
 * @param {*} connectionStream - The duplex stream to connect to.
 */
function setupTrustedCommunication(connectionStream) {
  // setup multiplexing
  setupMultiplex(connectionStream);
}

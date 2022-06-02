import { sampleState } from './sample_state';

const ENVIRONMENT_TYPE_POPUP = 'popup';
const ENVIRONMENT_TYPE_NOTIFICATION = 'notification';
const ENVIRONMENT_TYPE_FULLSCREEN = 'fullscreen';
const PLATFORM_BRAVE = 'Brave';
const PLATFORM_CHROME = 'Chrome';
const PLATFORM_EDGE = 'Edge';
const PLATFORM_FIREFOX = 'Firefox';
const PLATFORM_OPERA = 'Opera';

const isManifestV3 = () =>
  // eslint-disable-next-line
  chrome.runtime.getManifest().manifest_version === 3;

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

const metamaskInternalProcessHash = {
  [ENVIRONMENT_TYPE_POPUP]: true,
  [ENVIRONMENT_TYPE_NOTIFICATION]: true,
  [ENVIRONMENT_TYPE_FULLSCREEN]: true,
};
const metamaskBlockedPorts = ['trezor-connect'];
const requestAccountTabIds = {};

const initApp = async (remotePort) => {
  // eslint-disable-next-line
  chrome.runtime.onConnect.removeListener(initApp);
  createStreams(remotePort);
  console.log('MetaMask initialization complete.');
};

// eslint-disable-next-line
chrome.runtime.onConnect.addListener(initApp);

function createStreams(remoteSourcePort) {
  if (remoteSourcePort) {
    connectRemote(remoteSourcePort);
  }

  // eslint-disable-next-line
  chrome.runtime.onConnect.addListener(connectRemote);

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
        // eslint-disable-next-line
        remotePort.sender.origin === `chrome-extension://${chrome.runtime.id}`;
    }

    if (isMetaMaskInternalProcess) {
      // eslint-disable-next-line
      chrome.storage.session.set({ ui_state: sampleState });

      if (isManifestV3()) {
        remotePort.postMessage({ name: 'CONNECTION_READY' });
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
}

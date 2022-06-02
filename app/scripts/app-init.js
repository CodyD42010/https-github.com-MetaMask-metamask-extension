// eslint-disable-next-line import/unambiguous
function tryImport(...fileNames) {
  try {
    // eslint-disable-next-line
    importScripts(...fileNames);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function importAllScripts() {
  const startImportScriptsTime = Date.now();
  /*
   * applyLavaMoat has been hard coded to "true" as
   * tryImport('./runtime-cjs.js') is giving issue with XMLHttpRequest object which is not avaialble to service worker.
   * we need to dynamically inject values of applyLavaMoat once this is fixed.
   */
  const applyLavaMoat = true;

  tryImport('./globalthis.js');
  tryImport('./sentry-install.js');

  if (applyLavaMoat) {
    tryImport('./runtime-lavamoat.js');
    tryImport('./lockdown-more.js');
    tryImport('./policy-load.js');
  } else {
    tryImport('./lockdown-install.js');
    tryImport('./lockdown-more.js');
    tryImport('./lockdown-run.js');
    tryImport('./runtime-cjs.js');
  }
  // eslint-disable-next-line
  self.scriptLoaded = true;
  tryImport('./streams-0.js');

  const fileList = [
    // The list of files is injected at build time by replacing comment below with comma separated strings of file names
    /** FILE NAMES */
  ];

  fileList.forEach((fileName) => tryImport(fileName));

  // for performance metrics/reference
  console.log(
    `SCRIPTS IMPORT COMPLETE in Seconds: ${
      (Date.now() - startImportScriptsTime) / 1000
    }`,
  );
}

// eslint-disable-next-line
self.oninstall = () => {
  importAllScripts();
};

/*
 * Message event listener below loads script if they are no longer available.
 * chrome below needs to be replaced by cross-browser object,
 * but there is issue in importing webextension-polyfill into service worker.
 * chrome does seems to work in at-least all chromium based browsers
 */
// eslint-disable-next-line
chrome.runtime.onMessage.addListener((_1, _2, sendResponse) => {
  // eslint-disable-next-line
  if (!self.scriptLoaded) {
    importAllScripts();
  }
  // Response below if not required but there is an error if message listener does not send response.
  sendResponse({ name: 'SERVICE_WORKER_ACTIVATION' });
});

/**
 * An open issue is changes in this file break during hot reloading. Reason is dynamic injection of "FILE NAMES".
 * Developers need to restart local server if they change this file.
 */

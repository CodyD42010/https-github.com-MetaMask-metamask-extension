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
  // value of applyLavaMoat below is dynamically replaced at build time with actual value
  const applyLavaMoat = false;

  tryImport('./globalthis.js');
  tryImport('./sentry-install.js');

  if (applyLavaMoat) {
    tryImport('./runtime-lavamoat.js');
    tryImport('./lockdown-more.js');
    tryImport('./policy-load.js');
  } else {
    tryImport('./init-globals.js');
    tryImport('./lockdown-install.js');
    tryImport('./lockdown-run.js');
    tryImport('./lockdown-more.js');
    tryImport('./runtime-cjs.js');
  }

  const fileList = [
    // The list of files is injected at build time by replacing comment below with comma separated strings of file names
    // https://github.com/MetaMask/metamask-extension/blob/develop/development/build/scripts.js#L406
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

// Placing script import call here ensures that scripts are inported each time service worker is activated.
importAllScripts();

/**
 * An open issue is changes in this file break during hot reloading. Reason is dynamic injection of "FILE NAMES".
 * Developers need to restart local server if they change this file.
 */

// eslint-disable-next-line import/unambiguous
let loadTimes = [];
const enableLoadtimeLogs = true;

function tryImport(...fileNames) {
  try {
    const startTime = new Date().getTime();
    // eslint-disable-next-line
    importScripts(...fileNames);
    const endTime = new Date().getTime();
    loadTimes.push({
      name: fileNames[0],
      value: endTime - startTime,
      children: [],
      startTime,
      endTime,
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function importAllScripts() {
  const startImportScriptsTime = Date.now();
  loadTimes = [];
  // value of applyLavaMoat below is dynamically replaced at build time with actual value
  const applyLavaMoat = true;

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
    // https://github.com/MetaMask/metamask-extension/blob/496d9d81c3367931031edc11402552690c771acf/development/build/scripts.js#L406
    /** FILE NAMES */
  ];

  fileList.forEach((fileName) => tryImport(fileName));

  const endImportScriptsTime = Date.now();

  // for performance metrics/reference
  console.log(
    `SCRIPTS IMPORT COMPLETE in Seconds: ${
      (Date.now() - startImportScriptsTime) / 1000
    }`,
  );
  if (enableLoadtimeLogs) {
    console.log(
      `Time for each import: ${JSON.stringify(
        {
          name: 'Total',
          children: loadTimes,
          startTime: startImportScriptsTime,
          endTime: endImportScriptsTime,
          value: endImportScriptsTime - startImportScriptsTime,
        },
        undefined,
        '    ',
      )}`,
    );
  }
}

// Placing script import call here ensures that scripts are inported each time service worker is activated.
importAllScripts();

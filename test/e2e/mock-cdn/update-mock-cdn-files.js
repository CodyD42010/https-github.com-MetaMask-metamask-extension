const util = require('util');
const { promises: fs, writeFileSync, } = require('fs');

const exec = util.promisify(require('node:child_process').exec);

const PPOM_VERSION_URL =
  'https://static.cx.metamask.io/api/v1/confirmations/ppom/ppom_version.json';
const PPOM_CONFIG_URL =
  'https://static.metafi.codefi.network/api/v1/confirmations/ppom/config/0x1/';
const PPOM_STALE_URL =
  'https://static.metafi.codefi.network/api/v1/confirmations/ppom/stale/0x1/';
const PPOM_STALE_DIFF_URL =
  'https://static.metafi.codefi.network/api/v1/confirmations/ppom/stale_diff/0x1/';
const MOCK_CDN_FOLDER_URL = 'test/e2e/mock-cdn/';

async function getFileVersions() {

  let ppomVersionDataHeaders;
  let ppomVersionData;

  ppomVersionData = await fetch(PPOM_VERSION_URL, {
    method: 'GET',
  });

  ppomVersionDataHeaders = ppomVersionData.headers;
  ppomVersionData = await ppomVersionData.json();

  const etagVersion = ppomVersionDataHeaders.get('etag');
  const etagVersionObject = { Etag: etagVersion };

  // updating ppom-version-headers.json file
  writeFileSync(
    `${MOCK_CDN_FOLDER_URL}ppom-version-headers.json`,
    JSON.stringify(etagVersionObject, null, 2)
  );

  // updating ppom-version.json file
  writeFileSync(
    `${MOCK_CDN_FOLDER_URL}ppom-version.json`,
    JSON.stringify(ppomVersionData, null, 2)
  );

  const mainnetConfigVersion = ppomVersionData.find(
    (item) => item.name === 'config' && item.chainId === '0x1',
  ).version;

  const mainnetStaleVersion = ppomVersionData.find(
    (item) => item.name === 'stale' && item.chainId === '0x1',
  ).version;

  const mainnetStaleDiffVersion = ppomVersionData.find(
    (item) => item.name === 'stale_diff' && item.chainId === '0x1',
  ).version;

  return {
    mainnetConfigVersion,
    mainnetStaleVersion,
    mainnetStaleDiffVersion,
  };
}

async function deleteFileMatchingPattern (dirPath, regexPattern) {
  fs.readdir(dirPath, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${dirPath}:`, err);
      return;
    }
    files.forEach((file) => {
      if (regexPattern.test(file)) {
        const filePath = path.join(dirPath, file);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error deleting file ${filePath}:`, err);
          } else {
            console.log(`File ${filePath} deleted successfully.`);
          }
        });
      }
    });
  });
};

async function updateMockCdnFiles() {
  const { mainnetConfigVersion, mainnetStaleVersion, mainnetStaleDiffVersion } =
    await getFileVersions();

  // updating cdn-config-res-headers.json file
  let configResponse = await fetch(`${PPOM_CONFIG_URL}${mainnetConfigVersion}`, {
    method: 'GET',
  });

  let configHeaders = configResponse.headers;

  const etagConfig = configHeaders.get('etag');
  const etagConfigObject = { Etag: etagConfig };

  writeFileSync(
    `${MOCK_CDN_FOLDER_URL}cdn-config-res-headers.json`,
    JSON.stringify(etagConfigObject, null, 2)
  );

  // updating cdn-stale-res-headers.json file
  let staleResponse = await fetch(`${PPOM_STALE_URL}${mainnetStaleVersion}`, {
    method: 'GET',
  });

  let staleHeaders = staleResponse.headers;

  const etagStale = staleHeaders.get('etag');
  const etagStaleObject = { Etag: etagStale };

  writeFileSync(
    `${MOCK_CDN_FOLDER_URL}cdn-stale-res-headers.json`,
    JSON.stringify(etagStaleObject, null, 2)
  );

  // updating cdn-stale-res-headers.json file
  let staleDiffResponse = await fetch(`${PPOM_STALE_DIFF_URL}${mainnetStaleDiffVersion}`, {
    method: 'GET',
  });

  let staleDiffHeaders = staleDiffResponse.headers;

  const etagStaleDiff = staleDiffHeaders.get('etag');
  const etagStaleDiffObject = { Etag: etagStaleDiff };

  writeFileSync(
    `${MOCK_CDN_FOLDER_URL}cdn-stale-diff-res-headers.json`,
    JSON.stringify(etagStaleDiffObject, null, 2)
  );

  const CDN_CONFIG_PATH = 'test/e2e/mock-cdn/cdn-config.txt';
  const CDN_STALE_DIFF_PATH = 'test/e2e/mock-cdn/cdn-stale-diff.txt';
  const CDN_STALE_PATH = 'test/e2e/mock-cdn/cdn-stale.txt';

  // exporting the brotli data to files
  exec(
    `curl ${PPOM_CONFIG_URL}${mainnetConfigVersion} -o ${CDN_CONFIG_PATH}`,
  );

  exec(
    `curl ${PPOM_STALE_URL}${mainnetStaleVersion} -o ${CDN_STALE_DIFF_PATH}`,
  );

  exec(
    `curl ${PPOM_STALE_DIFF_URL}${mainnetStaleDiffVersion} -o ${CDN_STALE_PATH}`,
  );
}

updateMockCdnFiles();

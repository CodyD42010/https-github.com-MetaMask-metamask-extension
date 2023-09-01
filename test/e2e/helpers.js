const { strict: assert } = require('assert');
const path = require('path');
const { promises: fs } = require('fs');
const BigNumber = require('bignumber.js');
const mockttp = require('mockttp');
const detectPort = require('detect-port');
const createStaticServer = require('../../development/create-static-server');
const { tEn } = require('../lib/i18n-helpers');
const { setupMocking } = require('./mock-e2e');
const Ganache = require('./ganache');
const FixtureServer = require('./fixture-server');
const PhishingWarningPageServer = require('./phishing-warning-page-server');
const { buildWebDriver } = require('./webdriver');
const { PAGES } = require('./webdriver/driver');
const GanacheSeeder = require('./seeder/ganache-seeder');

const tinyDelayMs = 200;
const regularDelayMs = tinyDelayMs * 2;
const largeDelayMs = regularDelayMs * 2;
const veryLargeDelayMs = largeDelayMs * 2;
const dappBasePort = 8080;

const createDownloadFolder = async (downloadsFolder) => {
  await fs.rm(downloadsFolder, { recursive: true, force: true });
  await fs.mkdir(downloadsFolder, { recursive: true });
};

const convertToHexValue = (val) => `0x${new BigNumber(val, 10).toString(16)}`;

async function withFixtures(options, testSuite) {
  const {
    dapp,
    fixtures,
    ganacheOptions,
    smartContract,
    driverOptions,
    dappOptions,
    title,
    failOnConsoleError = true,
    dappPath = undefined,
    dappPaths,
    testSpecificMock = function () {
      // do nothing.
    },
  } = options;
  const fixtureServer = new FixtureServer();
  const ganacheServer = new Ganache();
  const https = await mockttp.generateCACertificate();
  const mockServer = mockttp.getLocal({ https, cors: true });
  let secondaryGanacheServer;
  let numberOfDapps = dapp ? 1 : 0;
  const dappServer = [];
  const phishingPageServer = new PhishingWarningPageServer();

  let webDriver;
  let driver;
  let failed = false;
  try {
    await ganacheServer.start(ganacheOptions);
    let contractRegistry;

    if (smartContract) {
      const ganacheSeeder = new GanacheSeeder(ganacheServer.getProvider());
      await ganacheSeeder.deploySmartContract(smartContract);
      contractRegistry = ganacheSeeder.getContractRegistry();
    }

    if (ganacheOptions?.concurrent) {
      const { port, chainId, ganacheOptions2 } = ganacheOptions.concurrent;
      secondaryGanacheServer = new Ganache();
      await secondaryGanacheServer.start({
        blockTime: 2,
        chain: { chainId },
        port,
        vmErrorsOnRPCResponse: false,
        ...ganacheOptions2,
      });
    }
    await fixtureServer.start();
    fixtureServer.loadJsonState(fixtures, contractRegistry);
    await phishingPageServer.start();
    if (dapp) {
      if (dappOptions?.numberOfDapps) {
        numberOfDapps = dappOptions.numberOfDapps;
      }
      for (let i = 0; i < numberOfDapps; i++) {
        let dappDirectory;
        if (dappPath || (dappPaths && dappPaths[i])) {
          dappDirectory = path.resolve(__dirname, dappPath || dappPaths[i]);
        } else {
          dappDirectory = path.resolve(
            __dirname,
            '..',
            '..',
            'node_modules',
            '@metamask',
            'test-dapp',
            'dist',
          );
        }
        dappServer.push(createStaticServer(dappDirectory));
        dappServer[i].listen(`${dappBasePort + i}`);
        await new Promise((resolve, reject) => {
          dappServer[i].on('listening', resolve);
          dappServer[i].on('error', reject);
        });
      }
    }
    const mockedEndpoint = await setupMocking(mockServer, testSpecificMock, {
      chainId: ganacheOptions?.chainId || 1337,
    });
    if ((await detectPort(8000)) !== 8000) {
      throw new Error(
        'Failed to set up mock server, something else may be running on port 8000.',
      );
    }
    await mockServer.start(8000);

    driver = (await buildWebDriver(driverOptions)).driver;
    webDriver = driver.driver;

    if (process.env.SELENIUM_BROWSER === 'chrome') {
      await driver.checkBrowserForExceptions(failOnConsoleError);
      await driver.checkBrowserForConsoleErrors(failOnConsoleError);
    }

    let driverProxy;
    if (process.env.E2E_DEBUG === 'true') {
      driverProxy = new Proxy(driver, {
        get(target, prop, receiver) {
          const originalProperty = target[prop];
          if (typeof originalProperty === 'function') {
            return (...args) => {
              console.log(
                `[driver] Called '${prop}' with arguments ${JSON.stringify(
                  args,
                )}`,
              );
              return originalProperty.bind(target)(...args);
            };
          }
          return Reflect.get(target, prop, receiver);
        },
      });
    }

    await testSuite({
      driver: driverProxy ?? driver,
      contractRegistry,
      ganacheServer,
      secondaryGanacheServer,
      mockedEndpoint,
    });
  } catch (error) {
    failed = true;
    if (webDriver) {
      try {
        await driver.verboseReportOnFailure(title);
      } catch (verboseReportError) {
        console.error(verboseReportError);
      }
      if (driver.errors.length > 0 || driver.exceptions.length > 0) {
        /**
         * Navigate to the background
         * forcing background exceptions to be captured
         * proving more helpful context
         */
        await driver.navigate(PAGES.BACKGROUND);
      }
    }
    throw error;
  } finally {
    if (!failed || process.env.E2E_LEAVE_RUNNING !== 'true') {
      await fixtureServer.stop();
      await ganacheServer.quit();
      if (ganacheOptions?.concurrent) {
        await secondaryGanacheServer.quit();
      }
      if (webDriver) {
        await driver.quit();
      }
      if (dapp) {
        for (let i = 0; i < numberOfDapps; i++) {
          if (dappServer[i] && dappServer[i].listening) {
            await new Promise((resolve, reject) => {
              dappServer[i].close((error) => {
                if (error) {
                  return reject(error);
                }
                return resolve();
              });
            });
          }
        }
      }
      if (phishingPageServer.isRunning()) {
        await phishingPageServer.quit();
      }

      // Since mockServer could be stop'd at another location,
      // use a try/catch to avoid an error
      try {
        await mockServer.stop();
      } catch (e) {
        console.log('mockServer already stopped');
      }
    }
  }
}

/**
 * @param {*} driver - selinium driver
 * @param {*} handlesCount - total count of windows that should be loaded
 * @returns handles - an object with window handles, properties in object represent windows:
 *            1. extension: metamask extension window
 *            2. dapp: test-app window
 *            3. popup: metsmask extension popup window
 */
const getWindowHandles = async (driver, handlesCount) => {
  await driver.waitUntilXWindowHandles(handlesCount);
  const windowHandles = await driver.getAllWindowHandles();

  const extension = windowHandles[0];
  const dapp = await driver.switchToWindowWithTitle(
    'E2E Test Dapp',
    windowHandles,
  );
  const popup = windowHandles.find(
    (handle) => handle !== extension && handle !== dapp,
  );
  return { extension, dapp, popup };
};

const importSRPOnboardingFlow = async (driver, seedPhrase, password) => {
  // agree to terms of use
  await driver.clickElement('[data-testid="onboarding-terms-checkbox"]');

  // welcome
  await driver.clickElement('[data-testid="onboarding-import-wallet"]');

  // metrics
  await driver.clickElement('[data-testid="metametrics-no-thanks"]');

  await driver.waitForSelector('.import-srp__actions');
  // import with recovery phrase
  await driver.pasteIntoField(
    '[data-testid="import-srp__srp-word-0"]',
    seedPhrase,
  );
  await driver.clickElement('[data-testid="import-srp-confirm"]');

  // create password
  await driver.fill('[data-testid="create-password-new"]', password);
  await driver.fill('[data-testid="create-password-confirm"]', password);
  await driver.clickElement('[data-testid="create-password-terms"]');
  await driver.clickElement('[data-testid="create-password-import"]');
};

const completeImportSRPOnboardingFlow = async (
  driver,
  seedPhrase,
  password,
) => {
  await importSRPOnboardingFlow(driver, seedPhrase, password);

  // complete
  await driver.clickElement('[data-testid="onboarding-complete-done"]');

  // pin extension
  await driver.clickElement('[data-testid="pin-extension-next"]');
  await driver.clickElement('[data-testid="pin-extension-done"]');
};

const completeImportSRPOnboardingFlowWordByWord = async (
  driver,
  seedPhrase,
  password,
) => {
  // agree to terms of use
  await driver.clickElement('[data-testid="onboarding-terms-checkbox"]');

  // welcome
  await driver.clickElement('[data-testid="onboarding-import-wallet"]');

  // metrics
  await driver.clickElement('[data-testid="metametrics-no-thanks"]');

  // import with recovery phrase, word by word
  const words = seedPhrase.split(' ');
  for (const word of words) {
    await driver.pasteIntoField(
      `[data-testid="import-srp__srp-word-${words.indexOf(word)}"]`,
      word,
    );
  }
  await driver.clickElement('[data-testid="import-srp-confirm"]');

  // create password
  await driver.fill('[data-testid="create-password-new"]', password);
  await driver.fill('[data-testid="create-password-confirm"]', password);
  await driver.clickElement('[data-testid="create-password-terms"]');
  await driver.clickElement('[data-testid="create-password-import"]');

  // complete
  await driver.clickElement('[data-testid="onboarding-complete-done"]');

  // pin extension
  await driver.clickElement('[data-testid="pin-extension-next"]');
  await driver.clickElement('[data-testid="pin-extension-done"]');
};

/**
 * Begin the create new wallet flow on onboarding screen.
 *
 * @param {WebDriver} driver
 */
const onboardingBeginCreateNewWallet = async (driver) => {
  // agree to terms of use
  await driver.clickElement('[data-testid="onboarding-terms-checkbox"]');

  // welcome
  await driver.clickElement('[data-testid="onboarding-create-wallet"]');
};

/**
 * Choose either "I Agree" or "No Thanks" on the MetaMetrics onboarding screen
 *
 * @param {WebDriver} driver
 * @param {boolean} option - true to opt into metrics, default is false
 */
const onboardingChooseMetametricsOption = async (driver, option = false) => {
  const optionIdentifier = option ? 'i-agree' : 'no-thanks';
  // metrics
  await driver.clickElement(`[data-testid="metametrics-${optionIdentifier}"]`);
};

/**
 * Set a password for MetaMask during onboarding
 *
 * @param {WebDriver} driver
 * @param {string} password - Password to set
 */
const onboardingCreatePassword = async (driver, password) => {
  // create password
  await driver.fill('[data-testid="create-password-new"]', password);
  await driver.fill('[data-testid="create-password-confirm"]', password);
  await driver.clickElement('[data-testid="create-password-terms"]');
  await driver.clickElement('[data-testid="create-password-wallet"]');
};

/**
 * Choose to secure wallet, and then get recovery phrase and confirm the SRP
 * during onboarding flow.
 *
 * @param {WebDriver} driver
 */
const onboardingRevealAndConfirmSRP = async (driver) => {
  // secure my wallet
  await driver.clickElement('[data-testid="secure-wallet-recommended"]');

  // reveal SRP
  await driver.clickElement('[data-testid="recovery-phrase-reveal"]');

  const revealedSeedPhrase = await driver.findElement(
    '[data-testid="recovery-phrase-chips"]',
  );

  const recoveryPhrase = await revealedSeedPhrase.getText();

  await driver.clickElement('[data-testid="recovery-phrase-next"]');

  // confirm SRP
  const words = recoveryPhrase.split(/\s*(?:[0-9)]+|\n|\.|^$|$)\s*/u);
  const finalWords = words.filter((str) => str !== '');
  assert.equal(finalWords.length, 12);

  await driver.fill('[data-testid="recovery-phrase-input-2"]', finalWords[2]);
  await driver.fill('[data-testid="recovery-phrase-input-3"]', finalWords[3]);
  await driver.fill('[data-testid="recovery-phrase-input-7"]', finalWords[7]);

  await driver.clickElement('[data-testid="confirm-recovery-phrase"]');

  await driver.clickElement({ text: 'Confirm', tag: 'button' });
};

/**
 * Complete the onboarding flow by confirming completion. Final step before the
 * reminder to pin the extension.
 *
 * @param {WebDriver} driver
 */
const onboardingCompleteWalletCreation = async (driver) => {
  // complete
  await driver.findElement({ text: 'Wallet creation successful', tag: 'h2' });
  await driver.clickElement('[data-testid="onboarding-complete-done"]');
};

/**
 * Move through the steps of pinning extension after successful onboarding
 *
 * @param {WebDriver} driver
 */
const onboardingPinExtension = async (driver) => {
  // pin extension
  await driver.clickElement('[data-testid="pin-extension-next"]');
  await driver.clickElement('[data-testid="pin-extension-done"]');
};

const completeCreateNewWalletOnboardingFlow = async (driver, password) => {
  await onboardingBeginCreateNewWallet(driver);
  await onboardingChooseMetametricsOption(driver, false);
  await onboardingCreatePassword(driver, password);
  await onboardingRevealAndConfirmSRP(driver);
  await onboardingCompleteWalletCreation(driver);
  await onboardingPinExtension(driver);
};

const importWrongSRPOnboardingFlow = async (driver, seedPhrase) => {
  // agree to terms of use
  await driver.clickElement('[data-testid="onboarding-terms-checkbox"]');

  // welcome
  await driver.clickElement('[data-testid="onboarding-import-wallet"]');

  // metrics
  await driver.clickElement('[data-testid="metametrics-no-thanks"]');

  // import with recovery phrase
  await driver.pasteIntoField(
    '[data-testid="import-srp__srp-word-0"]',
    seedPhrase,
  );

  const warningText = 'Invalid Secret Recovery Phrase';
  const warnings = await driver.findElements('.import-srp__banner-alert-text');
  const warning = warnings[1];

  assert.equal(await warning.getText(), warningText);
};

const selectDropdownByNum = async (elements, index) => {
  await elements[index].click();
};

const testSRPDropdownIterations = async (options, driver, iterations) => {
  for (let i = 0; i < iterations; i++) {
    await selectDropdownByNum(options, i);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const formFields = await driver.findElements('.import-srp__srp-word-label');
    const expectedNumFields = 12 + i * 3;
    const actualNumFields = formFields.length;
    assert.equal(actualNumFields, expectedNumFields);
  }
};

const passwordUnlockOpenSRPRevealQuiz = async (driver) => {
  await driver.navigate();
  await driver.fill('#password', 'correct horse battery staple');
  await driver.press('#password', driver.Key.ENTER);

  // navigate settings to reveal SRP
  await driver.clickElement('[data-testid="account-options-menu-button"]');
  await driver.clickElement({ text: 'Settings', tag: 'div' });
  await driver.clickElement({ text: 'Security & privacy', tag: 'div' });
  await driver.clickElement('[data-testid="reveal-seed-words"]');
};

const completeSRPRevealQuiz = async (driver) => {
  // start quiz
  await driver.clickElement('[data-testid="srp-quiz-get-started"]');

  // tap correct answer 1
  await driver.clickElement('[data-testid="srp-quiz-right-answer"]');

  // tap Continue 1
  await driver.clickElement('[data-testid="srp-quiz-continue"]');

  // tap correct answer 2
  await driver.clickElement('[data-testid="srp-quiz-right-answer"]');

  // tap Continue 2
  await driver.clickElement('[data-testid="srp-quiz-continue"]');
};

const tapAndHoldToRevealSRP = async (driver) => {
  await driver.holdMouseDownOnElement(
    {
      text: tEn('holdToRevealSRP'),
      tag: 'span',
    },
    2000,
  );
};

const closeSRPReveal = async (driver) => {
  await driver.clickElement({
    text: tEn('close'),
    tag: 'button',
  });
  await driver.findVisibleElement({
    text: tEn('tokens'),
    tag: 'button',
  });
};

const DAPP_URL = 'http://127.0.0.1:8080';
const DAPP_ONE_URL = 'http://127.0.0.1:8081';

const openDapp = async (driver, contract = null, dappURL = DAPP_URL) => {
  contract
    ? await driver.openNewPage(`${dappURL}/?contract=${contract}`)
    : await driver.openNewPage(dappURL);
};

const PRIVATE_KEY =
  '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC';

const convertETHToHexGwei = (eth) => convertToHexValue(eth * 10 ** 18);

const defaultGanacheOptions = {
  accounts: [{ secretKey: PRIVATE_KEY, balance: convertETHToHexGwei(25) }],
};

const SERVICE_WORKER_URL = 'chrome://inspect/#service-workers';

const sendTransaction = async (driver, recipientAddress, quantity) => {
  await driver.clickElement('[data-testid="eth-overview-send"]');
  await driver.fill('[data-testid="ens-input"]', recipientAddress);
  await driver.fill('.unit-input__input', quantity);
  await driver.clickElement('[data-testid="page-container-footer-next"]');
  await driver.clickElement('[data-testid="page-container-footer-next"]');
  await driver.clickElement('[data-testid="home__activity-tab"]');
  await driver.waitForElementNotPresent('.transaction-list-item--unconfirmed');
  await driver.findElement('.transaction-list-item');
};

const findAnotherAccountFromAccountList = async (
  driver,
  itemNumber,
  accountName,
) => {
  await driver.clickElement('[data-testid="account-menu-icon"]');
  const accountMenuItemSelector = `.multichain-account-list-item:nth-child(${itemNumber})`;

  await driver.findElement({
    css: `${accountMenuItemSelector} .multichain-account-list-item__account-name__button`,
    text: accountName,
  });

  return accountMenuItemSelector;
};

const TEST_SEED_PHRASE =
  'forum vessel pink push lonely enact gentle tail admit parrot grunt dress';

const TEST_SEED_PHRASE_TWO =
  'phrase upgrade clock rough situate wedding elder clever doctor stamp excess tent';

// Usually happens when onboarded to make sure the state is retrieved from metamaskState properly
const assertAccountBalanceForDOM = async (driver, ganacheServer) => {
  const balance = await ganacheServer.getBalance();
  const balanceElement = await driver.findElement(
    '[data-testid="eth-overview__primary-currency"]',
  );
  assert.equal(`${balance}\nETH`, await balanceElement.getText());
};

// Usually happens after txn is made
const locateAccountBalanceDOM = async (driver, ganacheServer) => {
  const balance = await ganacheServer.getBalance();
  await driver.waitForSelector({
    css: '[data-testid="eth-overview__primary-currency"]',
    text: `${balance} ETH`,
  });
};
const DEFAULT_PRIVATE_KEY =
  '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC';
const WALLET_PASSWORD = 'correct horse battery staple';

const DEFAULT_GANACHE_OPTIONS = {
  accounts: [
    {
      secretKey: DEFAULT_PRIVATE_KEY,
      balance: convertETHToHexGwei(25),
    },
  ],
};

const generateGanacheOptions = (overrides) => ({
  ...DEFAULT_GANACHE_OPTIONS,
  ...overrides,
});

async function waitForAccountRendered(driver) {
  await driver.waitForSelector(
    '[data-testid="eth-overview__primary-currency"]',
  );
}
const WINDOW_TITLES = Object.freeze({
  ExtensionInFullScreenView: 'MetaMask',
  TestDApp: 'E2E Test Dapp',
  Notification: 'MetaMask Notification',
  ServiceWorkerSettings: 'Inspect with Chrome Developer Tools',
  InstalledExtensions: 'Extensions',
});

const unlockWallet = async (driver) => {
  await driver.fill('#password', 'correct horse battery staple');
  await driver.press('#password', driver.Key.ENTER);
};

const logInWithBalanceValidation = async (driver, ganacheServer) => {
  await unlockWallet(driver);
  await assertAccountBalanceForDOM(driver, ganacheServer);
};

async function sleepSeconds(sec) {
  return new Promise((resolve) => setTimeout(resolve, sec * 1000));
}

function roundToXDecimalPlaces(number, decimalPlaces) {
  return Math.round(number * 10 ** decimalPlaces) / 10 ** decimalPlaces;
}

function generateRandNumBetween(x, y) {
  const min = Math.min(x, y);
  const max = Math.max(x, y);
  const randomNumber = Math.random() * (max - min) + min;

  return randomNumber;
}

function genRandInitBal(minETHBal = 10, maxETHBal = 100, decimalPlaces = 4) {
  const initialBalance = roundToXDecimalPlaces(
    generateRandNumBetween(minETHBal, maxETHBal),
    decimalPlaces,
  );

  const initialBalanceInHex = convertETHToHexGwei(initialBalance);

  return { initialBalance, initialBalanceInHex };
}

async function terminateServiceWorker(driver) {
  await driver.openNewPage(SERVICE_WORKER_URL);

  await driver.waitForSelector({
    text: 'Service workers',
    tag: 'button',
  });
  await driver.clickElement({
    text: 'Service workers',
    tag: 'button',
  });

  await driver.delay(tinyDelayMs);
  const serviceWorkerElements = await driver.findClickableElements({
    text: 'terminate',
    tag: 'span',
  });

  // 1st one is app-init.js; while 2nd one is service-worker.js
  await serviceWorkerElements[serviceWorkerElements.length - 1].click();

  const serviceWorkerTab = await driver.switchToWindowWithTitle(
    WINDOW_TITLES.ServiceWorkerSettings,
  );

  await driver.closeWindowHandle(serviceWorkerTab);
}

/**
 * This method assumes the extension is open, the dapp is open and waits for a
 * third window handle to open (the notification window). Once it does it
 * switches to the new window.
 *
 * @param {WebDriver} driver
 */
async function switchToNotificationWindow(driver) {
  await driver.waitUntilXWindowHandles(3);
  const windowHandles = await driver.getAllWindowHandles();
  await driver.switchToWindowWithTitle('MetaMask Notification', windowHandles);
}

/**
 * When mocking the segment server and returning an array of mocks from the
 * mockServer method, this method will allow getting all of the seen requests
 * for each mock in the array.
 *
 * @param {WebDriver} driver
 * @param {import('mockttp').Mockttp} mockedEndpoints
 * @param {boolean} hasRequest
 * @returns {import('mockttp/dist/pluggable-admin').MockttpClientResponse[]}
 */
async function getEventPayloads(driver, mockedEndpoints, hasRequest = true) {
  await driver.wait(async () => {
    let isPending = true;
    for (const mockedEndpoint of mockedEndpoints) {
      isPending = await mockedEndpoint.isPending();
    }

    return isPending === !hasRequest;
  }, driver.timeout);
  const mockedRequests = [];
  for (const mockedEndpoint of mockedEndpoints) {
    mockedRequests.push(...(await mockedEndpoint.getSeenRequests()));
  }

  return mockedRequests.map((req) => req.body.json?.batch).flat();
}

// Asserts that  each request passes all assertions in one group of assertions, and the order does not matter.
function assertInAnyOrder(requests, assertions) {
  // Clone the array to avoid mutating the original
  const assertionsClone = [...assertions];

  return (
    requests.every((request) => {
      for (let a = 0; a < assertionsClone.length; a++) {
        const assertionArray = assertionsClone[a];

        const passed = assertionArray.reduce(
          (acc, currAssertionFn) => currAssertionFn(request) && acc,
          true,
        );

        if (passed) {
          // Remove the used assertion array
          assertionsClone.splice(a, 1);
          // Exit the loop early since we found a matching assertion
          return true;
        }
      }

      // No matching assertion found for this request
      return false;
    }) &&
    // Ensure all assertions were used
    assertionsClone.length === 0
  );
}

module.exports = {
  DAPP_URL,
  DAPP_ONE_URL,
  SERVICE_WORKER_URL,
  TEST_SEED_PHRASE,
  TEST_SEED_PHRASE_TWO,
  PRIVATE_KEY,
  getWindowHandles,
  convertToHexValue,
  tinyDelayMs,
  regularDelayMs,
  largeDelayMs,
  veryLargeDelayMs,
  withFixtures,
  importSRPOnboardingFlow,
  completeImportSRPOnboardingFlow,
  completeImportSRPOnboardingFlowWordByWord,
  completeCreateNewWalletOnboardingFlow,
  passwordUnlockOpenSRPRevealQuiz,
  completeSRPRevealQuiz,
  closeSRPReveal,
  tapAndHoldToRevealSRP,
  createDownloadFolder,
  importWrongSRPOnboardingFlow,
  testSRPDropdownIterations,
  openDapp,
  defaultGanacheOptions,
  sendTransaction,
  findAnotherAccountFromAccountList,
  unlockWallet,
  logInWithBalanceValidation,
  assertAccountBalanceForDOM,
  locateAccountBalanceDOM,
  waitForAccountRendered,
  generateGanacheOptions,
  WALLET_PASSWORD,
  WINDOW_TITLES,
  DEFAULT_GANACHE_OPTIONS,
  convertETHToHexGwei,
  roundToXDecimalPlaces,
  generateRandNumBetween,
  sleepSeconds,
  terminateServiceWorker,
  switchToNotificationWindow,
  getEventPayloads,
  onboardingBeginCreateNewWallet,
  onboardingChooseMetametricsOption,
  onboardingCreatePassword,
  onboardingRevealAndConfirmSRP,
  onboardingCompleteWalletCreation,
  onboardingPinExtension,
  assertInAnyOrder,
  genRandInitBal,
};

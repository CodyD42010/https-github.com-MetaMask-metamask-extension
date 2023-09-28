const { strict: assert } = require('assert');
const FixtureBuilder = require('../fixture-builder');
const {
  convertToHexValue,
  withFixtures,
  openDapp,
  regularDelayMs,
  unlockWallet,
  sleepSeconds,
  getEventPayloads,
  tinyDelayMs,
} = require('../helpers');
const { toHex } = require('@metamask/controller-utils');

describe('Custom network', function () {
  const chainID = '42161';
  const networkURL = 'https://arbitrum-mainnet.infura.io';
  const networkNAME = 'Arbitrum One';
  const currencySYMBOL = 'ETH';
  const blockExplorerURL = 'https://explorer.arbitrum.io';
  const ganacheOptions = {
    accounts: [
      {
        secretKey:
          '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
        balance: convertToHexValue(25000000000000000000),
      },
    ],
  };

  it('should show warning when adding chainId 0x1(ethereum) and be followed by an wrong chainId error', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        await openDapp(driver);
        await driver.executeScript(`
          var params = [{
            chainId: "0x1",
            chainName: "Fake Ethereum Network",
            nativeCurrency: {
              name: "",
              symbol: "ETH",
              decimals: 18
            },
            rpcUrls: ["https://customnetwork.com/api/customRPC"],
            blockExplorerUrls: [ "http://localhost:8080/api/customRPC" ]
          }]
          window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params
          })
        `);
        const windowHandles = await driver.waitUntilXWindowHandles(3);

        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );

        await driver.clickElement({
          tag: 'button',
          text: 'Approve',
        });

        const warningTxt =
          'You are adding a new RPC provider for Ethereum Mainnet';

        await driver.findElement({
          tag: 'h4',
          text: warningTxt,
        });

        await driver.clickElement({
          tag: 'button',
          text: 'Approve',
        });

        const errMsg =
          'Chain ID returned by the custom network does not match the submitted chain ID.';
        await driver.findElement({
          tag: 'span',
          text: errMsg,
        });

        const approveBtn = await driver.findElement({
          tag: 'button',
          text: 'Approve',
        });

        assert.equal(await approveBtn.isEnabled(), false);
        await driver.clickElement({
          tag: 'button',
          text: 'Cancel',
        });
      },
    );
  });

  it("don't add bad rpc custom network", async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        await openDapp(driver);
        await driver.executeScript(`
          var params = [{
            chainId: "0x123",
            chainName: "Antani",
            nativeCurrency: {
              name: "",
              symbol: "ANTANI",
              decimals: 18
            },
            rpcUrls: ["https://customnetwork.com/api/customRPC"],
            blockExplorerUrls: [ "http://localhost:8080/api/customRPC" ]
          }]
          window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params
          })
        `);
        const windowHandles = await driver.waitUntilXWindowHandles(3);

        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );

        const errMsg1 = 'verify the network details';
        await driver.findElement({
          tag: 'a',
          text: errMsg1,
        });

        await driver.clickElement({
          tag: 'button',
          text: 'Approve',
        });

        const errMsg2 =
          'Chain ID returned by the custom network does not match the submitted chain ID.';
        await driver.findElement({
          tag: 'span',
          text: errMsg2,
        });

        const approveBtn = await driver.findElement({
          tag: 'button',
          text: 'Approve',
        });

        assert.equal(await approveBtn.isEnabled(), false);
        await driver.clickElement({
          tag: 'button',
          text: 'Cancel',
        });
      },
    );
  });

  it("don't add unreachable custom network", async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        await openDapp(driver);
        await driver.executeScript(`
          var params = [{
            chainId: "0x123",
            chainName: "Antani",
            nativeCurrency: {
              name: "",
              symbol: "ANTANI",
              decimals: 18
            },
            rpcUrls: ["https://doesntexist.abc/customRPC"],
            blockExplorerUrls: [ "http://localhost:8080/api/customRPC" ]
          }]
          window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params
          })
        `);
        const windowHandles = await driver.waitUntilXWindowHandles(3);

        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.clickElement({
          tag: 'button',
          text: 'Approve',
        });

        await driver.findElement({
          tag: 'span',
          text: 'Error while connecting to the custom network.',
        });

        const approveBtn = await driver.findElement({
          tag: 'button',
          text: 'Approve',
        });

        assert.equal(await approveBtn.isEnabled(), false);
        await driver.clickElement({
          tag: 'button',
          text: 'Cancel',
        });
      },
    );
  });

  it('add custom network and switch the network', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        // Avoid a stale element error
        await driver.delay(regularDelayMs);

        await driver.clickElement('[data-testid="network-display"]');

        await driver.clickElement({ tag: 'button', text: 'Add network' });
        await driver.clickElement({
          tag: 'button',
          text: 'Add',
        });

        // verify network details
        const title = await driver.findElement({
          tag: 'h6',
          text: 'Arbitrum One',
        });

        assert.equal(
          await title.getText(),
          'Arbitrum One',
          'Title of popup should be selected network',
        );

        const [networkName, networkUrl, chainIdElement, currencySymbol] =
          await driver.findElements('.definition-list dd');

        assert.equal(
          await networkName.getText(),
          networkNAME,
          'Network name is not correctly displayed',
        );
        assert.equal(
          await networkUrl.getText(),
          networkURL,
          'Network Url is not correctly displayed',
        );
        assert.equal(
          await chainIdElement.getText(),
          chainID.toString(),
          'Chain Id is not correctly displayed',
        );
        assert.equal(
          await currencySymbol.getText(),
          currencySYMBOL,
          'Currency symbol is not correctly displayed',
        );

        await driver.clickElement({ tag: 'a', text: 'View all details' });

        const networkDetailsLabels = await driver.findElements('dd');
        assert.equal(
          await networkDetailsLabels[8].getText(),
          blockExplorerURL,
          'Block Explorer URL is not correct',
        );

        await driver.clickElement({ tag: 'button', text: 'Close' });
        await driver.clickElement({ tag: 'button', text: 'Approve' });
        await driver.clickElement({
          tag: 'h6',
          text: 'Switch to Arbitrum One',
        });
        // verify network switched
        const networkDisplayed = await driver.findElement({
          tag: 'p',
          text: 'Arbitrum One',
        });
        assert.equal(
          await networkDisplayed.getText(),
          'Arbitrum One',
          'You have not switched to Arbitrum Network',
        );
      },
    );
  });

  it('add custom network and not switch the network', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        // Avoid a stale element error
        await driver.delay(regularDelayMs);

        await driver.clickElement('[data-testid="network-display"]');
        await driver.clickElement({ tag: 'button', text: 'Add network' });

        // had to put all Add elements in list since list is changing and networks are not always in same order
        await driver.clickElement({
          tag: 'button',
          text: 'Add',
        });

        await driver.clickElement({ tag: 'button', text: 'Approve' });

        await driver.clickElement({
          tag: 'h6',
          text: 'Dismiss',
        });

        // verify if added network is in list of networks
        const networkDisplay = await driver.findElement(
          '[data-testid="network-display"]',
        );
        await networkDisplay.click();

        const arbitrumNetwork = await driver.findElements({
          text: 'Arbitrum One',
          tag: 'button',
        });
        assert.ok(arbitrumNetwork.length, 1);
      },
    );
  });

  it('Delete the Arbitrum network', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder()
          .withNetworkController({
            networkConfigurations: {
              networkConfigurationId: {
                rpcUrl: networkURL,
                chainId: chainID,
                nickname: networkNAME,
                ticker: currencySYMBOL,
                rpcPrefs: {},
              },
            },
          })
          .build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        await driver.clickElement(
          '[data-testid="account-options-menu-button"]',
        );
        await driver.clickElement({ text: 'Settings', tag: 'div' });
        await driver.clickElement({ text: 'Networks', tag: 'div' });

        const arbitrumNetwork = await driver.clickElement({
          text: 'Arbitrum One',
          tag: 'div',
        });

        // Click first Delete button
        await driver.clickElement('button.btn-danger');

        // Click modal Delete button
        await driver.clickElement('button.btn-danger-primary');

        // Checks if Arbitrum is deleted
        const existNetwork = await driver.isElementPresent(arbitrumNetwork);
        assert.equal(existNetwork, false, 'Network is not deleted');
      },
    );
  });

  it.skip('When the network details validation toggle is turned on, validate user inserted details against data from "chainid.network"', async function () {
    async function mockRPCURLAndChainId(mockServer) {
      return [
        await mockServer
          .forPost('https://unresponsive-rpc.url/')
          // 502 Error communicating with upstream server
          .thenCallback(() => ({ statusCode: 502 })),

        await mockServer
          .forGet('https://chainid.network/chains.json')
          .thenCallback(() => ({
            statusCode: 200,
            json: MOCK_CHAINLIST_RESPONSE,
          })),
      ];
    }

    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions,
        title: this.test.title,
        testSpecificMock: mockRPCURLAndChainId,
      },
      async ({ driver }) => {
        await driver.navigate();

        await unlockWallet(driver);

        await checkThatSafeChainsListValidationToggleIsOn(driver);

        await failCandidateNetworkValidation(driver);

        // await sleepSeconds(100);
      },
    );
  });

  it.only("When the network details validation toggle is turned off, don't validate user inserted details", async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();

        await unlockWallet(driver);

        await toggleOffSafeChainsListValidation(driver);

        await sleepSeconds(1);

        await candidateNetworkIsNotValidated(driver);

        await sleepSeconds(100);

        // await failCandidateNetworkValidation(driver);
      },
    );
  });

  it.skip('The user can search for the toggle using search', async function () {
    //...
  });
});

const MOCK_CHAINLIST_RESPONSE = [
  {
    name: 'Ethereum Mainnet',
    chain: 'ETH',
    icon: 'ethereum',
    rpc: [
      'https://mainnet.infura.io/v3/${INFURA_API_KEY}',
      'wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}',
      'https://api.mycryptoapi.com/eth',
      'https://cloudflare-eth.com',
      'https://ethereum.publicnode.com',
    ],
    features: [
      {
        name: 'EIP155',
      },
      {
        name: 'EIP1559',
      },
    ],
    faucets: [],
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    infoURL: 'https://ethereum.org',
    shortName: 'eth',
    chainId: 1,
    networkId: 1,
    slip44: 60,
    ens: {
      registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    },
    explorers: [
      {
        name: 'etherscan',
        url: 'https://etherscan.io',
        standard: 'EIP3091',
      },
      {
        name: 'blockscout',
        url: 'https://eth.blockscout.com',
        icon: 'blockscout',
        standard: 'EIP3091',
      },
    ],
  },
];

async function checkThatSafeChainsListValidationToggleIsOn(driver) {
  const accountOptionsMenuSelector =
    '[data-testid="account-options-menu-button"]';
  await driver.waitForSelector(accountOptionsMenuSelector);
  await driver.clickElement(accountOptionsMenuSelector);

  const globalMenuSettingsSelector = '[data-testid="global-menu-settings"]';
  await driver.waitForSelector(globalMenuSettingsSelector);
  await driver.clickElement(globalMenuSettingsSelector);

  const securityAndPrivacyTabRawLocator = {
    text: 'Security & privacy',
    tag: 'div',
  };
  await driver.clickElement(securityAndPrivacyTabRawLocator);

  const useSafeChainsListValidationToggleSelector =
    '[data-testid="useSafeChainsListValidation"]';
  const useSafeChainsListValidationToggleElement = await driver.waitForSelector(
    useSafeChainsListValidationToggleSelector,
  );
  const useSafeChainsListValidationToggleState =
    await useSafeChainsListValidationToggleElement.getText();

  assert.equal(
    useSafeChainsListValidationToggleState,
    'ON',
    'Safe chains list validation toggle is off',
  );

  // return to the home screen
  const appHeaderSelector = '[data-testid="app-header-logo"]';
  await driver.waitForSelector(appHeaderSelector);
  await driver.clickElement(appHeaderSelector);
}

async function failCandidateNetworkValidation(driver) {
  const networkMenuSelector = '[data-testid="network-display"]';
  await driver.waitForSelector(networkMenuSelector);
  await driver.clickElement(networkMenuSelector);

  await driver.clickElement({ text: 'Add network', tag: 'button' });

  const addNetworkManuallyButtonSelector =
    '[data-testid="add-network-manually"]';
  await driver.waitForSelector(addNetworkManuallyButtonSelector);
  await driver.clickElement(addNetworkManuallyButtonSelector);

  const [
    // first element is the search input that we don't need to fill
    _,
    networkNameInputEl,
    newRPCURLInputEl,
    chainIDInputEl,
    currencySymbolInputEl,
    blockExplorerURLInputEl,
  ] = await driver.findElements('input');

  await networkNameInputEl.fill('cheapETH');
  await newRPCURLInputEl.fill('https://unresponsive-rpc.url');
  await chainIDInputEl.fill(toHex(777));
  await currencySymbolInputEl.fill('cTH');
  await blockExplorerURLInputEl.fill('https://block-explorer.url');

  const chainIdValidationMessageRawLocator = {
    text: 'Could not fetch chain ID. Is your RPC URL correct?',
    tag: 'h6',
  };
  await driver.waitForSelector(chainIdValidationMessageRawLocator);

  const tickerSymbolValidationMessageRawLocator = {
    text: 'Ticker symbol verification data is currently unavailable, make sure that the symbol you have entered is correct. It will impact the conversion rates that you see for this network',
    tag: 'h6',
  };
  await driver.waitForSelector(tickerSymbolValidationMessageRawLocator);

  const saveButtonRawLocator = {
    text: 'Save',
    tag: 'button',
  };
  const saveButtonEl = await driver.findElement(saveButtonRawLocator);
  assert.equal(await saveButtonEl.isEnabled(), false);
}

async function toggleOffSafeChainsListValidation(driver) {
  const accountOptionsMenuSelector =
    '[data-testid="account-options-menu-button"]';
  await driver.waitForSelector(accountOptionsMenuSelector);
  await driver.clickElement(accountOptionsMenuSelector);

  const globalMenuSettingsSelector = '[data-testid="global-menu-settings"]';
  await driver.waitForSelector(globalMenuSettingsSelector);
  await driver.clickElement(globalMenuSettingsSelector);

  const securityAndPrivacyTabRawLocator = {
    text: 'Security & privacy',
    tag: 'div',
  };
  await driver.clickElement(securityAndPrivacyTabRawLocator);

  const useSafeChainsListValidationToggleSelector =
    '[data-testid="useSafeChainsListValidation"]';
  let useSafeChainsListValidationToggleElement = await driver.waitForSelector(
    useSafeChainsListValidationToggleSelector,
  );
  let useSafeChainsListValidationToggleState =
    await useSafeChainsListValidationToggleElement.getText();

  assert.equal(
    useSafeChainsListValidationToggleState,
    'ON',
    'Safe chains list validation toggle is OFF',
  );

  await useSafeChainsListValidationToggleElement.click();
  // wait for the toggle state change to finish
  await driver.delay(regularDelayMs);

  useSafeChainsListValidationToggleElement = await driver.waitForSelector(
    useSafeChainsListValidationToggleSelector,
  );

  useSafeChainsListValidationToggleState =
    await useSafeChainsListValidationToggleElement.getText();

  assert.equal(
    useSafeChainsListValidationToggleState,
    'OFF',
    'Safe chains list validation toggle is ON',
  );

  await sleepSeconds(1);

  // return to the home screen
  const appHeaderSelector = '[data-testid="app-header-logo"]';
  await driver.waitForSelector(appHeaderSelector);
  await driver.clickElement(appHeaderSelector);
}

async function candidateNetworkIsNotValidated(driver) {
  const networkMenuSelector = '[data-testid="network-display"]';
  await driver.waitForSelector(networkMenuSelector);
  await driver.clickElement(networkMenuSelector);

  await driver.clickElement({ text: 'Add network', tag: 'button' });

  const addNetworkManuallyButtonSelector =
    '[data-testid="add-network-manually"]';
  await driver.waitForSelector(addNetworkManuallyButtonSelector);
  await driver.clickElement(addNetworkManuallyButtonSelector);

  const [
    // first element is the search input that we don't need to fill
    _,
    networkNameInputEl,
    newRPCURLInputEl,
    chainIDInputEl,
    currencySymbolInputEl,
    blockExplorerURLInputEl,
  ] = await driver.findElements('input');

  await networkNameInputEl.fill('cheapETH');
  await newRPCURLInputEl.fill('https://mainnet.infura.io/v3/');
  await chainIDInputEl.fill(toHex(777));
  await currencySymbolInputEl.fill('cTH');
  await blockExplorerURLInputEl.fill('https://block-explorer.url');

  await sleepSeconds(100);

  const saveButtonRawLocator = {
    text: 'Save',
    tag: 'button',
  };
  const saveButtonEl = await driver.findElement(saveButtonRawLocator);
  assert.equal(await saveButtonEl.isEnabled(), true);
}

const { strict: assert } = require('assert');
const FixtureBuilder = require('../../fixture-builder');
const {
  withFixtures,
  openDapp,
  unlockWallet,
  DAPP_URL,
  DAPP_ONE_URL,
  regularDelayMs,
  WINDOW_TITLES,
  defaultGanacheOptions,
  largeDelayMs,
  veryLargeDelayMs,
  switchToNotificationWindow,
} = require('../../helpers');
const { PAGES } = require('../../webdriver/driver');

describe('Request Queuing for Multiple Dapps and Txs on different networks', function () {
  it('should batch confirmation txs for different dapps on different networks adds extra tx after.', async function () {
    const port = 8546;
    const chainId = 1338;
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withNetworkControllerDoubleGanache()
          .withPreferencesControllerUseRequestQueueEnabled()
          .build(),
        dappOptions: { numberOfDapps: 2 },
        ganacheOptions: {
          ...defaultGanacheOptions,
          concurrent: [
            {
              port,
              chainId,
              ganacheOptions2: defaultGanacheOptions,
            },
          ],
        },
        title: this.test.fullTitle(),
      },

      async ({ driver }) => {
        await unlockWallet(driver);

        // Navigate to extension home screen
        await driver.navigate(PAGES.HOME);

        // Open Dapp One
        await openDapp(driver, undefined, DAPP_URL);

        // Connect to dapp 1
        await driver.findClickableElement({ text: 'Connect', tag: 'button' });
        await driver.clickElement('#connectButton');

        await driver.delay(regularDelayMs);

        await switchToNotificationWindow(driver);

        await driver.clickElement({
          text: 'Next',
          tag: 'button',
          css: '[data-testid="page-container-footer-next"]',
        });

        await driver.clickElement({
          text: 'Connect',
          tag: 'button',
          css: '[data-testid="page-container-footer-next"]',
        });

        await driver.switchToWindowWithTitle(
          WINDOW_TITLES.ExtensionInFullScreenView,
        );

        // Network Selector
        await driver.clickElement('[data-testid="network-display"]');

        // Switch to second network
        await driver.clickElement({
          text: 'Localhost 8546',
          css: 'p',
        });

        // Wait for the first dapp's connect confirmation to disappear
        await driver.waitUntilXWindowHandles(2);

        // TODO: Request Queuing bug when opening both dapps at the same time will have them stuck on the same network, with will be incorrect for one of them.
        // Open Dapp Two
        await openDapp(driver, undefined, DAPP_ONE_URL);

        // Connect to dapp 2
        await driver.findClickableElement({ text: 'Connect', tag: 'button' });
        await driver.clickElement('#connectButton');

        await driver.delay(regularDelayMs);

        await switchToNotificationWindow(driver, 4);

        await driver.clickElement({
          text: 'Next',
          tag: 'button',
          css: '[data-testid="page-container-footer-next"]',
        });

        await driver.clickElement({
          text: 'Connect',
          tag: 'button',
          css: '[data-testid="page-container-footer-next"]',
        });

        // Dapp 1 send 2 tx
        await driver.switchToWindowWithUrl(DAPP_URL);
        await driver.delay(largeDelayMs);
        await driver.clickElement('#sendButton');
        await driver.clickElement('#sendButton');

        await driver.delay(largeDelayMs);

        // Dapp 2 send 2 tx
        await driver.switchToWindowWithUrl(DAPP_ONE_URL);
        await driver.delay(largeDelayMs);
        await driver.clickElement('#sendButton');
        await driver.clickElement('#sendButton');

        await driver.delay(largeDelayMs);

        // Dapp 1 send  1 tx
        await driver.switchToWindowWithUrl(DAPP_URL);
        await driver.delay(largeDelayMs);
        await driver.clickElement('#sendButton');

        await switchToNotificationWindow(driver, 4);

        let navigationElement = await driver.findElement(
          '.confirm-page-container-navigation',
        );

        let navigationText = await navigationElement.getText();

        assert.equal(navigationText.includes('1 of 2'), true);

        // Check correct network on confirm tx.
        await driver.findElement({
          css: '[data-testid="network-display"]',
          text: 'Localhost 8545',
        });

        // Reject All Transactions
        await driver.clickElement('.page-container__footer-secondary a');

        await driver.clickElement({ text: 'Reject all', tag: 'button' }); // TODO: Do we want to confirm here?

        // Wait for confirmations to close and transactions from the second dapp to open
        // Two very large delays to wait for confirmation spam opening/closing bug.
        await driver.delay(veryLargeDelayMs);
        await driver.delay(veryLargeDelayMs);

        // Wait for new confirmations queued from second dapp to open
        await switchToNotificationWindow(driver, 4);

        navigationElement = await driver.findElement(
          '.confirm-page-container-navigation',
        );

        navigationText = await navigationElement.getText();

        assert.equal(navigationText.includes('1 of 2'), true);

        // Check correct network on confirm tx.
        await driver.findElement({
          css: '[data-testid="network-display"]',
          text: 'Localhost 8546',
        });

        // Reject All Transactions
        await driver.clickElement('.page-container__footer-secondary a');

        await driver.clickElement({ text: 'Reject all', tag: 'button' });

        // Wait for confirmation to close
        await driver.waitUntilXWindowHandles(3);

        // Wait for new confirmations queued from second dapp to open
        await switchToNotificationWindow(driver, 4);

        // Check correct network on confirm tx.
        await driver.findElement({
          css: '[data-testid="network-display"]',
          text: 'Localhost 8545',
        });
      },
    );
  });
});

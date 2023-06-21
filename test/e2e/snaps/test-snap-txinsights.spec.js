const { strict: assert } = require('assert');
const { withFixtures } = require('../helpers');
const FixtureBuilder = require('../fixture-builder');
const { TEST_SNAPS_WEBSITE_URL } = require('./enums');

describe('Test Snap TxInsights', function () {
  it('tests tx insights functionality', async function () {
    const ganacheOptions = {
      accounts: [
        {
          secretKey:
            '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
        },
      ],
    };
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions,
        failOnConsoleError: false,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();

        // enter pw into extension
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        // navigate to test snaps page and connect
        await driver.driver.get(TEST_SNAPS_WEBSITE_URL);
        await driver.delay(1000);

        // find and scroll to the bip32 test and connect
        const snapButton1 = await driver.findElement('#connectInsightsSnap');
        await driver.scrollToElement(snapButton1);
        await driver.delay(1000);
        await driver.clickElement('#connectInsightsSnap');
        await driver.delay(1000);

        // switch to metamask extension and click connect
        let windowHandles = await driver.waitUntilXWindowHandles(
          2,
          1000,
          10000,
        );
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.clickElement({
          text: 'Connect',
          tag: 'button',
        });

        await driver.waitForSelector({ text: 'Install' });

        await driver.clickElement({
          text: 'Install',
          tag: 'button',
        });

        await driver.waitForSelector({ text: 'OK' });

        await driver.clickElement({
          text: 'OK',
          tag: 'button',
        });

        // switch to test-snaps page and get accounts
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);
        await driver.clickElement('#getAccounts');
        await driver.delay(1000);

        // switch back to MetaMask window and deal with dialogs
        windowHandles = await driver.waitUntilXWindowHandles(2, 1000, 10000);
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.clickElement({
          text: 'Next',
          tag: 'button',
        });
        await driver.delay(1000);
        await driver.clickElement({
          text: 'Connect',
          tag: 'button',
        });

        // switch to test-snaps page and send tx
        windowHandles = await driver.waitUntilXWindowHandles(1, 1000, 10000);
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);
        await driver.clickElement('#sendInsights');
        await driver.delay(1000);

        // switch back to MetaMask window and switch to tx insights pane
        windowHandles = await driver.waitUntilXWindowHandles(2, 1000, 10000);
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.delay(1000);
        await driver.clickElement({
          text: 'TxInsightsTest',
          tag: 'button',
        });

        // check that txinsightstest tab contains the right info
        await driver.delay(1000);
        const txInsightsResult = await driver.findElement(
          '.snap-ui-renderer__content',
        );
        assert.equal(await txInsightsResult.getText(), 'Test: Successful');
      },
    );
  });
});

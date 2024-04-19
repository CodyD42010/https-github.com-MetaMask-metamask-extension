const {
  defaultGanacheOptions,
  withFixtures,
  unlockWallet,
  WINDOW_TITLES,
} = require('../helpers');
const FixtureBuilder = require('../fixture-builder');
const { TEST_SNAPS_WEBSITE_URL } = require('./enums');

describe('Test Snap UI Links', function () {
  it('test link in confirmation snap_dialog type', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        failOnConsoleError: false,
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        // navigate to test snaps page and connect to dialog snap
        await driver.openNewPage(TEST_SNAPS_WEBSITE_URL);
        await driver.delay(1000);
        const dialogButton = await driver.findElement('#connectdialogs');
        await driver.scrollToElement(dialogButton);
        await driver.delay(1000);
        await driver.clickElement('#connectdialogs');
        await driver.delay(1000);

        // switch to metamask extension and click connect
        let windowHandles = await driver.waitUntilXWindowHandles(
          3,
          1000,
          10000,
        );
        await driver.switchToWindowWithTitle(
          WINDOW_TITLES.Dialog,
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

        // switch to test snaps tab
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);

        // wait for npm installation success
        await driver.waitForSelector({
          css: '#connectdialogs',
          text: 'Reconnect to Dialogs Snap',
        });

        // click conf button
        await driver.clickElement('#sendConfirmationButton');
        await driver.delay(500);

        // switch to dialog popup
        windowHandles = await driver.waitUntilXWindowHandles(3, 1000, 10000);
        await driver.switchToWindowWithTitle(
          WINDOW_TITLES.Dialog,
          windowHandles,
        );
        await driver.delay(500);

        // wait for link to appear and click it
        await driver.waitForSelector({
          text: 'That',
          tag: 'span',
        });
        await driver.clickElement({
          text: 'That',
          tag: 'span',
        });

        // wait for the link to be provided
        await driver.waitForSelector({
          text: 'snaps.metamask.io',
          tag: 'b',
        });

        // wait for and click visit site button
        await driver.waitForSelector({
          text: 'Visit site',
          tag: 'a',
        });
        await driver.clickElement({
          text: 'Visit site',
          tag: 'a',
        });

        // switch to new tab
        windowHandles = await driver.waitUntilXWindowHandles(4, 1000, 10000);
        await driver.switchToWindowWithTitle(
          'MetaMask Snaps Directory',
          windowHandles,
        );

        // check that the correct page has been opened
        await driver.waitForSelector({
          text: 'Most Popular',
          tag: 'h2',
        });

        // switch back to metamask window
        windowHandles = await driver.waitUntilXWindowHandles(4, 1000, 10000);
        await driver.switchToWindowWithTitle(
          WINDOW_TITLES.Dialog,
          windowHandles,
        );

        // wait for and click approve button
        await driver.waitForSelector({
          text: 'Approve',
          tag: 'button',
        });
        await driver.clickElement({
          text: 'Approve',
          tag: 'button',
        });

        // switch back to test snaps tab
        windowHandles = await driver.waitUntilXWindowHandles(4, 1000, 10000);
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);

        // check for false result
        await driver.waitForSelector({
          css: '#dialogResult',
          text: 'true',
        });
      },
    );
  });
});

const { strict: assert } = require('assert');
const { withFixtures } = require('../helpers');
const FixtureBuilder = require('../fixture-builder');
const { TEST_SNAPS_WEBSITE_URL } = require('./enums');

describe('Test Snap Notification', function () {
  it('can send 1 correctly read inapp notification', async function () {
    const ganacheOptions = {
      accounts: [
        {
          secretKey:
            '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
          balance: 25000000000000000000,
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

        // navigate to test snaps page
        await driver.openNewPage(TEST_SNAPS_WEBSITE_URL);
        await driver.delay(1000);

        // find and scroll down to snapId5 and connect
        const snapButton = await driver.findElement('#connectNotification');
        await driver.scrollToElement(snapButton);
        await driver.delay(500);
        await driver.clickElement('#connectNotification');

        // switch to metamask extension and click connect
        await driver.waitUntilXWindowHandles(3, 1000, 10000);
        let windowHandles = await driver.getAllWindowHandles();
        const extensionPage = windowHandles[0];
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.clickElement(
          {
            text: 'Connect',
            tag: 'button',
          },
          10000,
        );
        await driver.delay(2000);

        // approve install of snap
        await driver.waitUntilXWindowHandles(3, 1000, 10000);
        windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.clickElement({
          text: 'Approve & install',
          tag: 'button',
        });

        // click send inputs on test snap page
        await driver.waitUntilXWindowHandles(2, 1000, 10000);
        windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);
        await driver.delay(1000);
        await driver.clickElement('#sendInAppNotification');

        // switch back to the extension page
        await driver.switchToWindow(extensionPage);
        await driver.delay(1500);

        // check to see that there is one notification
        const notificationResult = await driver.findElement(
          '.account-menu__icon__notification-count',
        );
        assert.equal(await notificationResult.getText(), '1');

        // try to click on the account menu icon (via xpath)
        await driver.clickElement('.account-menu__icon');
        await driver.delay(1000);

        // try to click on the notification item (via xpath)
        await driver.clickElement({
          text: 'Notifications',
          tag: 'div',
        });
        await driver.delay(1000);

        // look for the correct text in notifications (via xpath)
        const notificationResultMessage = await driver.findElement(
          '.notifications__item__details__message',
        );
        assert.equal(
          await notificationResultMessage.getText(),
          'TEST INAPP NOTIFICATION',
        );
      },
    );
  });
});

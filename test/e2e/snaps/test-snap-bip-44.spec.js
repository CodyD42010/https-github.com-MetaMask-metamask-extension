const { strict: assert } = require('assert');
const { withFixtures } = require('../helpers');
const FixtureBuilder = require('../fixture-builder');
const { TEST_SNAPS_WEBSITE_URL } = require('./enums');

describe('Test Snap bip-44', function () {
  it('can pop up bip-44 snap and get private key result', async function () {
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

        // navigate to test snaps page and connect
        await driver.driver.get(TEST_SNAPS_WEBSITE_URL);
        const snapButton1 = await driver.findElement('#connectBip44Snap');
        await driver.scrollToElement(snapButton1);
        await driver.delay(1000);
        await driver.clickElement('#connectBip44Snap');

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
        await driver.clickElement(
          {
            text: 'Connect',
            tag: 'button',
          },
          10000,
        );

        await driver.delay(2000);

        // switch to metamask extension
        windowHandles = await driver.waitUntilXWindowHandles(2, 1000, 10000);

        // approve install of snap
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.clickElement({
          text: 'Approve & install',
          tag: 'button',
        });

        // deal with permissions popover
        await driver.delay(1000);
        await driver.clickElement('#key-access-bip44-1-0');
        await driver.clickElement({
          text: 'Confirm',
          tag: 'button',
        });

        // click send inputs on test snap page
        windowHandles = await driver.waitUntilXWindowHandles(1, 1000, 10000);
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);
        await driver.delay(1000);
        await driver.clickElement('#sendBip44Test');

        // check the results of the public key test
        await driver.delay(1000);
        const bip44Result = await driver.findElement('#bip44Result');
        assert.equal(
          await bip44Result.getText(),
          '"0x86debb44fb3a984d93f326131d4c1db0bc39644f1a67b673b3ab45941a1cea6a385981755185ac4594b6521e4d1e08d1"',
        );

        // enter a message to sign
        await driver.fill('#bip44Message', '1234');
        await driver.delay(1000);
        const snapButton3 = await driver.findElement('#signBip44Message');
        await driver.scrollToElement(snapButton3);
        await driver.delay(1000);
        await driver.clickElement('#signBip44Message');

        // Switch to approve signature message window and approve
        windowHandles = await driver.waitUntilXWindowHandles(2, 1000, 10000);
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.clickElement({
          text: 'Approve',
          tag: 'button',
        });

        // switch back to test-snaps page
        windowHandles = await driver.waitUntilXWindowHandles(1, 1000, 10000);
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);
        await driver.delay(1000);

        // check the results of the message signature
        const bip44SignResult = await driver.findElement('#bip44SignResult');
        assert.equal(
          await bip44SignResult.getText(),
          '"0xa41ab87ca50606eefd47525ad90294bbe44c883f6bc53655f1b8a55aa8e1e35df216f31be62e52c7a1faa519420e20810162e07dedb0fde2a4d997ff7180a78232ecd8ce2d6f4ba42ccacad33c5e9e54a8c4d41506bdffb2bb4c368581d8b086"',
        );
      },
    );
  });
});

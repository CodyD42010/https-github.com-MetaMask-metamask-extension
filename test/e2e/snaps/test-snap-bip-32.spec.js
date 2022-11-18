const { strict: assert } = require('assert');
const { withFixtures } = require('../helpers');
const FixtureBuilder = require('../fixture-builder');
const { TEST_SNAPS_WEBSITE_URL } = require('./enums');

describe('Test Snap bip-32', function () {
  it('tests various functions of bip-32', async function () {
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
        const snapButton1 = await driver.findElement('#connectBip32');
        await driver.scrollToElement(snapButton1);
        await driver.delay(1000);
        await driver.clickElement('#connectBip32');

        // switch to metamask extension and click connect
        await driver.waitUntilXWindowHandles(2, 5000, 10000);
        let windowHandles = await driver.getAllWindowHandles();
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
        await driver.waitUntilXWindowHandles(2, 5000, 10000);
        windowHandles = await driver.getAllWindowHandles();

        // approve install of snap
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.clickElement({
          text: 'Approve & install',
          tag: 'button',
        });

        // wait for permissions popover, click checkboxes and confirm
        await driver.delay(1000);
        await driver.clickElement('#key-access-bip32-m-44h-0h-secp256k1-0');
        await driver.clickElement('#key-access-bip32-m-44h-0h-ed25519-0');
        await driver.clickElement({
          text: 'Confirm',
          tag: 'button',
        });

        // switch back to test-snaps window
        await driver.waitUntilXWindowHandles(1, 5000, 10000);
        windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);

        // scroll to and click get public key
        await driver.delay(1000);
        const snapButton2 = await driver.findElement('#bip32GetPublic');
        await driver.scrollToElement(snapButton2);
        await driver.delay(1000);
        await driver.clickElement('#bip32GetPublic');

        // check for proper public key response
        await driver.delay(1000);
        const retrievePublicKeyResult1 = await driver.findElement(
          '#bip32PublicKeyResult',
        );
        assert.equal(
          await retrievePublicKeyResult1.getText(),
          '"0x043e98d696ae15caef75fa8dd204a7c5c08d1272b2218ba3c20feeb4c691eec366606ece56791c361a2320e7fad8bcbb130f66d51c591fc39767ab2856e93f8dfb"',
        );

        // scroll to and click get compressed public key
        await driver.delay(1000);
        const snapButton3 = await driver.findElement(
          '#bip32GetCompressedPublic',
        );
        await driver.scrollToElement(snapButton3);
        await driver.delay(1000);
        await driver.clickElement('#bip32GetCompressedPublic');

        // check for proper public key response
        await driver.delay(1000);
        const retrievePublicKeyResult2 = await driver.findElement(
          '#bip32PublicKeyResult',
        );
        assert.equal(
          await retrievePublicKeyResult2.getText(),
          '"0x033e98d696ae15caef75fa8dd204a7c5c08d1272b2218ba3c20feeb4c691eec366"',
        );

        // wait then run SECP256K1 test
        await driver.delay(1000);
        await driver.fill('#bip32Message-secp256k1', 'foo bar');
        await driver.clickElement('#sendBip32-secp256k1');

        // hit 'approve' on the custom confirm
        await driver.waitUntilXWindowHandles(2, 5000, 10000);
        windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.clickElement({
          text: 'Approve',
          tag: 'button',
        });

        await driver.waitUntilXWindowHandles(1, 5000, 10000);
        windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);

        // check result
        await driver.delay(1000);
        const secp256k1Result = await driver.findElement(
          '#bip32MessageResult-secp256k1',
        );
        assert.equal(
          await secp256k1Result.getText(),
          '"0x3045022100b3ade2992ea3e5eb58c7550e9bddad356e9554233c8b099ebc3cb418e9301ae2022064746e15ae024808f0ba5d860e44dc4c97e65c8cba6f5ef9ea2e8c819930d2dc"',
        );

        // scroll further into messages section
        await driver.delay(1000);
        const snapButton4 = await driver.findElement('#bip32Message-ed25519');
        await driver.scrollToElement(snapButton4);
        await driver.delay(1000);

        // wait then run ed25519 test
        await driver.delay(1000);
        await driver.fill('#bip32Message-ed25519', 'foo bar');
        await driver.clickElement('#sendBip32-ed25519');

        // hit 'approve' on the custom confirm
        await driver.waitUntilXWindowHandles(2, 5000, 10000);
        windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.clickElement({
          text: 'Approve',
          tag: 'button',
        });

        await driver.waitUntilXWindowHandles(1, 5000, 10000);
        windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);

        // check result
        await driver.delay(1000);
        const ed25519Result = await driver.findElement(
          '#bip32MessageResult-ed25519',
        );
        assert.equal(
          await ed25519Result.getText(),
          '"0xf3215b4d6c59aac7e01b4ceef530d1e2abf4857926b85a81aaae3894505699243768a887b7da4a8c2e0f25196196ba290b6531050db8dc15c252bdd508532a0a"',
        );
      },
    );
  });
});

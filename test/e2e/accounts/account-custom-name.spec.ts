import { Suite } from 'mocha';
import {
  unlockWallet,
  withFixtures,
  waitForAccountRendered,
  findAnotherAccountFromAccountList,
} from '../helpers';
import FixtureBuilder from '../fixture-builder';
import { Driver } from '../webdriver/driver';

const newAccountLabel = 'Custom name';
const anotherAccountLabel = '2nd custom name';

describe('Account Custom Name Persistence', function (this: Suite) {
  it('persists custom account name through account change and wallet lock', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        title: this.test?.fullTitle(),
      },
      async ({ driver }: { driver: Driver }) => {
        await unlockWallet(driver);

        // Change account name
        await driver.clickElement(
          '[data-testid="account-options-menu-button"]',
        );
        await driver.clickElement('[data-testid="account-list-menu-details"]');
        await driver.clickElement('[data-testid="editable-label-button"]');
        await driver.fill('input[placeholder="Account name"]', newAccountLabel);
        await driver.clickElement('[data-testid="save-account-label-input"]');
        await driver.clickElement('button[aria-label="Close"]');

        // Verify account name
        await driver.findElement({
          css: '[data-testid="account-menu-icon"]',
          text: newAccountLabel,
        });

        // Add new account
        await driver.clickElement('[data-testid="account-menu-icon"]');
        await driver.clickElement(
          '[data-testid="multichain-account-menu-popover-action-button"]',
        );
        await driver.clickElement(
          '[data-testid="multichain-account-menu-popover-add-account"]',
        );
        await driver.fill('[placeholder="Account 2"]', anotherAccountLabel);
        await driver.clickElement({ text: 'Create', tag: 'button' });
        await waitForAccountRendered(driver);

        // Verify account name after another account was active
        const accountOneSelector = await findAnotherAccountFromAccountList(
          driver,
          1,
          newAccountLabel,
        );
        await driver.clickElement(accountOneSelector);
        await driver.findElement({
          css: '[data-testid="account-menu-icon"]',
          text: newAccountLabel,
        });

        // Lock and unlock wallet
        await driver.waitForSelector(
          '[data-testid="account-options-menu-button"]',
        );
        await driver.clickElement(
          '[data-testid="account-options-menu-button"]',
        );
        await driver.clickElement({
          text: 'Lock MetaMask',
          tag: 'div',
        });
        await unlockWallet(driver);

        // Verify account name after unlock
        await driver.findElement({
          css: '[data-testid="account-menu-icon"]',
          text: newAccountLabel,
        });
      },
    );
  });
});

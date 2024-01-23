const { strict: assert } = require('assert');
const {
  defaultGanacheOptions,
  withFixtures,
  unlockWallet,
} = require('../helpers');
const FixtureBuilder = require('../fixture-builder');
const { tEn } = require('../../lib/i18n-helpers');

describe('Show account details', function () {
  const PASSWORD = 'correct horse battery staple';
  const wrongPassword = 'test test test test';

  async function revealPrivateKey(driver, useAccountMenu = true) {
    if (useAccountMenu) {
      await driver.clickElement('[data-testid="account-menu-icon"]');
      await driver.clickElement(
        '[data-testid="account-list-item-menu-button"]',
      );
      await driver.clickElement('[data-testid="account-list-menu-details"]');
    } else {
      // Global Menu
      await driver.clickElement('[data-testid="account-options-menu-button"]');
      await driver.clickElement('[data-testid="account-list-menu-details"]');
    }
    await driver.clickElement({ css: 'button', text: tEn('showPrivateKey') });

    await driver.fill('#account-details-authenticate', PASSWORD);
    await driver.press('#account-details-authenticate', driver.Key.ENTER);

    await driver.holdMouseDownOnElement(
      {
        text: tEn('holdToRevealPrivateKey'),
        tag: 'span',
      },
      2000,
    );

    const keyContainer = await driver.findElement(
      '[data-testid="account-details-key"]',
    );
    const key = await keyContainer.getText();
    return key;
  }

  it('should show the QR code for the account', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        await driver.clickElement('[data-testid="account-menu-icon"]');
        await driver.clickElement(
          '[data-testid="account-list-item-menu-button"]',
        );
        await driver.clickElement('[data-testid="account-list-menu-details"');

        const qrCode = await driver.findElement('.qr-code__wrapper');
        assert.equal(await qrCode.isDisplayed(), true);
      },
    );
  });

  it('should show the correct private key from account menu', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        const key = await revealPrivateKey(driver);
        assert.equal(
          key,
          '7c9529a67102755b7e6102d6d950ac5d5863c98713805cec576b945b15b71eac',
        );
      },
    );
  });

  it('should show the correct private key for an unselected account from account menu', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        // Create and focus on different account
        await driver.clickElement('[data-testid="account-menu-icon"]');
        await driver.clickElement(
          '[data-testid="multichain-account-menu-popover-action-button"]',
        );
        await driver.clickElement(
          '[data-testid="multichain-account-menu-popover-add-account"]',
        );
        await driver.fill('[placeholder="Account 2"]', '2nd account');
        await driver.clickElement({ text: tEn('create'), tag: 'button' });
        await driver.waitForElementNotPresent({
          text: tEn('create'),
          tag: 'button',
        });

        const key = await revealPrivateKey(driver);
        assert.equal(
          key,
          '7c9529a67102755b7e6102d6d950ac5d5863c98713805cec576b945b15b71eac',
        );
      },
    );
  });

  it('should show the correct private key from global menu', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        const key = await revealPrivateKey(driver, false);
        assert.equal(
          key,
          '7c9529a67102755b7e6102d6d950ac5d5863c98713805cec576b945b15b71eac',
        );
      },
    );
  });

  it('should show the correct private key for a second account from global menu', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        // Create and focus on different account
        await driver.clickElement('[data-testid="account-menu-icon"]');
        await driver.clickElement(
          '[data-testid="multichain-account-menu-popover-action-button"]',
        );
        await driver.clickElement(
          '[data-testid="multichain-account-menu-popover-add-account"]',
        );
        await driver.fill('[placeholder="Account 2"]', '2nd account');
        await driver.clickElement({ text: tEn('create'), tag: 'button' });
        await driver.waitForElementNotPresent({
          text: tEn('create'),
          tag: 'button',
        });

        const key = await revealPrivateKey(driver, false);
        assert.equal(
          key,
          'f444f52ea41e3a39586d7069cb8e8233e9f6b9dea9cbb700cce69ae860661cc8',
        );
      },
    );
  });

  it('should not reveal private key when password is incorrect', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        title: this.test.fullTitle(),
        failOnConsoleError: false,
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        // Attempt to reveal private key from account menu
        await driver.clickElement('[data-testid="account-menu-icon"]');
        await driver.clickElement(
          '[data-testid="account-list-item-menu-button"]',
        );
        await driver.clickElement('[data-testid="account-list-menu-details"]');
        await driver.clickElement({
          css: 'button',
          text: tEn('showPrivateKey'),
        });

        // Enter incorrect password
        await driver.fill('#account-details-authenticate', wrongPassword);
        await driver.press('#account-details-authenticate', driver.Key.ENTER);

        // Display error when password is incorrect
        const passwordErrorIsDisplayed = await driver.isElementPresent({
          css: '.mm-help-text',
          text: 'Incorrect Password.',
        });
        assert.equal(passwordErrorIsDisplayed, true);
      },
    );
  });
  it('should pin the account when pinned', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        await driver.clickElement('[data-testid="account-menu-icon"]');
        await driver.clickElement(
          '[data-testid="account-list-item-menu-button"]',
        );
        await driver.clickElement('[data-testid="account-list-menu-pin"]');

        const pinnedIcon = await driver.findElement('.account-pinned-icon');
        assert.equal(await pinnedIcon.isDisplayed(), true);
      },
    );
  });

  it('should unpin the account when unpin is clicked', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        await driver.clickElement('[data-testid="account-menu-icon"]');
        await driver.clickElement(
          '[data-testid="account-list-item-menu-button"]',
        );
        await driver.clickElement('[data-testid="account-list-menu-pin"]');
        const pinnedIcon = await driver.findElement('.account-pinned-icon');
        assert.equal(await pinnedIcon.isDisplayed(), true);
        await driver.clickElement(
          '[data-testid="account-list-item-menu-button"]',
        );
        await driver.clickElement('[data-testid="account-list-menu-pin"]');
        const exists = await driver.isElementPresent(pinnedIcon);
        assert.equal(exists, false, 'Unpinned Account');
      },
    );
  });

  it('should hide the account when Hide Account is clicked', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        await driver.clickElement('[data-testid="account-menu-icon"]');
        await driver.clickElement(
          '[data-testid="account-list-item-menu-button"]',
        );
        await driver.clickElement('[data-testid="account-list-menu-hide"]');
        const hiddenAccounts = await driver.findElement(
          '.hidden-accounts-list',
        );
        assert.equal(await hiddenAccounts.isDisplayed(), true);
      },
    );
  });

  it('should unhide the account when Show Account is clicked', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        await driver.clickElement('[data-testid="account-menu-icon"]');
        await driver.clickElement(
          '[data-testid="account-list-item-menu-button"]',
        );
        await driver.clickElement('[data-testid="account-list-menu-hide"]');

        await driver.clickElement('.hidden-accounts-list');

        await driver.clickElement(
          '.multichain-account-menu-popover__list--menu-item-hidden-account [data-testid="account-list-item-menu-button"]',
        );
        await driver.clickElement('[data-testid="account-list-menu-hide"]');

        const accounts = await driver.findElement(
          '.multichain-account-menu-popover__list--menu-item',
        );
        assert.equal(await accounts.isDisplayed(), true);
      },
    );
  });

  it('should unpin and hide the pinned account when hide Account is clicked', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        title: this.test.fullTitle(),
      },
      async ({ driver }) => {
        await unlockWallet(driver);

        await driver.clickElement('[data-testid="account-menu-icon"]');
        await driver.clickElement(
          '[data-testid="account-list-item-menu-button"]',
        );
        await driver.clickElement('[data-testid="account-list-menu-pin"]');
        const pinnedIcon = await driver.findElement('.account-pinned-icon');
        assert.equal(await pinnedIcon.isDisplayed(), true);
        await driver.clickElement(
          '[data-testid="account-list-item-menu-button"]',
        );
        await driver.clickElement('[data-testid="account-list-menu-hide"]');
        const hiddenAccounts = await driver.findElement(
          '.hidden-accounts-list',
        );
        assert.equal(await hiddenAccounts.isDisplayed(), true);
      },
    );
  });
});

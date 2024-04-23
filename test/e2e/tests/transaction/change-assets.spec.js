const {
  defaultGanacheOptions,
  withFixtures,
  logInWithBalanceValidation,
} = require('../../helpers');
const FixtureBuilder = require('../../fixture-builder');
const { SMART_CONTRACTS } = require('../../seeder/smart-contracts');

describe('Change assets', function () {
  if (!process.env.MULTICHAIN) {
    return;
  }

  it('sends the correct asset when switching from native currency to NFT', async function () {
    const smartContract = SMART_CONTRACTS.NFTS;
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder().withNftControllerERC721().build(),
        ganacheOptions: defaultGanacheOptions,
        smartContract,
        title: this.test.fullTitle(),
      },
      async ({ driver, ganacheServer }) => {
        await logInWithBalanceValidation(driver, ganacheServer);

        // Click the Send button
        await driver.clickElement('[data-testid="eth-overview-send"]');

        // Chose a recipient
        await driver.clickElement('.multichain-account-list-item');

        // Populate an amount, continue
        await driver.clickElement('[data-testid="currency-input"]');
        await driver.press('[data-testid="currency-input"]', '2');
        await driver.clickElement({ text: 'Continue', css: 'button' });

        // Validate the send amount
        await driver.waitForSelector({
          css: '.currency-display-component__text',
          text: '2.000042',
        });

        // Click edit
        await driver.clickElement(
          '[data-testid="confirm-page-back-edit-button"]',
        );

        // Open the Amount modal
        await driver.clickElement('.asset-picker__symbol');

        // Choose an NFT instead
        await driver.clickElement({ css: 'button', text: 'NFTs' });
        await driver.clickElement('[data-testid="nft-default-image"]');

        // Validate that an NFT is chosen in the AssetAmountPicker
        await driver.waitForSelector({
          css: '.asset-picker__symbol',
          text: 'TDN',
        });
        await driver.waitForSelector({ css: 'p', text: '#1' });

        // Click continue
        await driver.clickElement({ text: 'Continue', css: 'button' });

        // Ensure NFT is showing
        await driver.waitForSelector(
          '.confirm-page-container-summary__title img',
        );
        await driver.waitForSelector({ css: 'h3', text: 'Test Dapp NFTs #1' });

        // Send it!
        await driver.clickElement({ text: 'Confirm', css: 'button' });

        // Ensure it was sent
        await driver.waitForSelector({
          css: 'p',
          text: 'Send Test Dapp NFTs #1',
        });
      },
    );
  });

  it('sends the correct asset when switching from ERC20 to NFT', async function () {
    const smartContract = SMART_CONTRACTS.NFTS;
    const tokenContract = SMART_CONTRACTS.HST;
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withTokensControllerERC20()
          .withNftControllerERC721()
          .build(),
        ganacheOptions: defaultGanacheOptions,
        smartContract: [smartContract, tokenContract],
        title: this.test.fullTitle(),
      },
      async ({ driver, ganacheServer }) => {
        await logInWithBalanceValidation(driver, ganacheServer);

        // Click the Send button
        await driver.clickElement({
          css: '[data-testid="multichain-token-list-button"] span',
          text: 'TST',
        });
        await driver.clickElement('[data-testid="eth-overview-send"]');

        // Chose a recipient
        await driver.clickElement('.multichain-account-list-item');

        // Populate an amount, continue
        await driver.clickElement('[data-testid="currency-input"]');
        await driver.press('[data-testid="currency-input"]', '0');
        await driver.clickElement({ text: 'Continue', css: 'button' });

        // Validate the send amount
        await driver.waitForSelector({
          css: '.currency-display-component__text',
          text: '0.00008455',
        });

        // Click edit
        await driver.clickElement(
          '[data-testid="confirm-page-back-edit-button"]',
        );

        // Open the Amount modal
        await driver.clickElement('.asset-picker__symbol');

        // Choose an NFT instead
        await driver.clickElement({ css: 'button', text: 'NFTs' });
        await driver.clickElement('[data-testid="nft-default-image"]');

        // Validate that an NFT is chosen in the AssetAmountPicker
        await driver.waitForSelector({
          css: '.asset-picker__symbol',
          text: 'TDN',
        });
        await driver.waitForSelector({ css: 'p', text: '#1' });

        // Click continue
        await driver.clickElement({ text: 'Continue', css: 'button' });

        // Ensure NFT is showing
        await driver.waitForSelector(
          '.confirm-page-container-summary__title img',
        );
        await driver.waitForSelector({ css: 'h3', text: 'Test Dapp NFTs #1' });

        // Send it!
        await driver.clickElement({ text: 'Confirm', css: 'button' });

        // Ensure it was sent
        await driver.waitForSelector({
          css: 'p',
          text: 'Send Test Dapp NFTs #1',
        });
      },
    );
  });

  it('sends the correct asset when switching from NFT to native currency', async function () {
    const smartContract = SMART_CONTRACTS.NFTS;
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder().withNftControllerERC721().build(),
        ganacheOptions: defaultGanacheOptions,
        smartContract,
        title: this.test.fullTitle(),
      },
      async ({ driver, ganacheServer }) => {
        await logInWithBalanceValidation(driver, ganacheServer);

        // Choose the nft
        await driver.clickElement('[data-testid="home__nfts-tab"]');
        await driver.clickElement('[data-testid="nft-default-image"]');
        await driver.clickElement('[data-testid="nft-send-button"]');

        // Chose a recipient
        await driver.clickElement('.multichain-account-list-item');

        // Validate that an NFT is chosen in the AssetAmountPicker
        await driver.waitForSelector({
          css: '.asset-picker__symbol',
          text: 'TDN',
        });
        await driver.waitForSelector({ css: 'p', text: '#1' });
        await driver.clickElement({ text: 'Continue', css: 'button' });

        // Ensure NFT is showing
        await driver.waitForSelector(
          '.confirm-page-container-summary__title img',
        );
        await driver.waitForSelector({ css: 'h3', text: 'Test Dapp NFTs #1' });

        // Click edit
        await driver.clickElement(
          '[data-testid="confirm-page-back-edit-button"]',
        );

        // Open the Amount modal
        await driver.clickElement('.asset-picker__symbol');

        // Choose tokens
        await driver.clickElement({ css: 'button', text: 'Tokens' });
        await driver.clickElement(
          '[data-testid="multichain-token-list-button"]',
        );

        // Ensure correct token selected
        await driver.waitForSelector({
          css: '.asset-picker__symbol',
          text: 'ETH',
        });

        // Populate an amount, continue
        await driver.clickElement('[data-testid="currency-input"]');
        await driver.press('[data-testid="currency-input"]', '2');
        await driver.clickElement({ text: 'Continue', css: 'button' });

        // Validate the send amount
        await driver.waitForSelector({
          css: '.currency-display-component__text',
          text: '2.000042',
        });

        // Send it!
        await driver.clickElement({ text: 'Confirm', css: 'button' });

        // Ensure it was sent
        await driver.waitForSelector({ css: 'p', text: 'Send' });
        await driver.waitForSelector({
          css: '[data-testid="transaction-list-item-primary-currency"]',
          text: '-2 ETH',
        });
      },
    );
  });
});

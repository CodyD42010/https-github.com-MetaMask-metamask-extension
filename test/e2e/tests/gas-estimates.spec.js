const {
  convertToHexValue,
  withFixtures,
  logInWithBalanceValidation,
  openActionMenuAndStartSendFlow,
} = require('../helpers');
const FixtureBuilder = require('../fixture-builder');
const { CHAIN_IDS } = require('../../../shared/constants/network');

describe('Gas estimates generated by MetaMask', function () {
  const baseGanacheOptions = {
    accounts: [
      {
        secretKey:
          '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
        balance: convertToHexValue(25000000000000000000),
      },
    ],
  };
  const preLondonGanacheOptions = {
    ...baseGanacheOptions,
    hardfork: 'berlin',
  };
  const postLondonGanacheOptions = {
    ...baseGanacheOptions,
    hardfork: 'london',
  };

  describe('Send on a network that is EIP-1559 compatible', function () {
    it('show expected gas defaults', async function () {
      await withFixtures(
        {
          fixtures: new FixtureBuilder().build(),
          ganacheOptions: postLondonGanacheOptions,
          title: this.test.fullTitle,
        },
        async ({ driver, ganacheServer }) => {
          await driver.navigate();
          await logInWithBalanceValidation(driver, ganacheServer);

          await openActionMenuAndStartSendFlow(driver);
          if (process.env.MULTICHAIN) {
            return;
          }
          await driver.fill(
            'input[placeholder="Enter public address (0x) or ENS name"]',
            '0x2f318C334780961FB129D2a6c30D0763d9a5C970',
          );

          await driver.fill('.unit-input__input', '1');

          // Check that the gas estimation is what we expect
          await driver.findElement({
            cass: '[data-testid="confirm-gas-display"]',
            text: '0.00043983',
          });
        },
      );
    });

    it('show expected gas defaults when API is down', async function () {
      await withFixtures(
        {
          fixtures: new FixtureBuilder().build(),
          ganacheOptions: postLondonGanacheOptions,
          testSpecificMock: (mockServer) => {
            mockServer
              .forGet(
                'https://gas-api.metaswap.codefi.network/networks/1337/suggestedGasFees',
              )
              .thenCallback(() => {
                return {
                  json: {
                    error: 'cannot get gas prices for chain id 1337',
                  },
                  statusCode: 503,
                };
              });
          },
          title: this.test.fullTitle,
        },
        async ({ driver, ganacheServer }) => {
          await driver.navigate();
          await logInWithBalanceValidation(driver, ganacheServer);

          await openActionMenuAndStartSendFlow(driver);
          if (process.env.MULTICHAIN) {
            return;
          }
          await driver.fill(
            'input[placeholder="Enter public address (0x) or ENS name"]',
            '0x2f318C334780961FB129D2a6c30D0763d9a5C970',
          );

          await driver.fill('.unit-input__input', '1');

          // Check that the gas estimation is what we expect
          await driver.findElement({
            cass: '[data-testid="confirm-gas-display"]',
            text: '0.00043983',
          });
        },
      );
    });

    it('show expected gas defaults when the network is not supported', async function () {
      await withFixtures(
        {
          fixtures: new FixtureBuilder().build(),
          ganacheOptions: postLondonGanacheOptions,
          testSpecificMock: (mockServer) => {
            mockServer
              .forGet(
                'https://gas-api.metaswap.codefi.network/networks/1337/suggestedGasFees',
              )
              .thenCallback(() => {
                return {
                  statusCode: 422,
                };
              });
          },
          title: this.test.fullTitle,
        },
        async ({ driver, ganacheServer }) => {
          await driver.navigate();
          await logInWithBalanceValidation(driver, ganacheServer);

          await openActionMenuAndStartSendFlow(driver);
          if (process.env.MULTICHAIN) {
            return;
          }
          await driver.fill(
            'input[placeholder="Enter public address (0x) or ENS name"]',
            '0x2f318C334780961FB129D2a6c30D0763d9a5C970',
          );

          await driver.fill('.unit-input__input', '1');

          // Check that the gas estimation is what we expect
          await driver.findElement({
            cass: '[data-testid="confirm-gas-display"]',
            text: '0.00043983',
          });
        },
      );
    });
  });

  describe('Send on a network that is not EIP-1559 compatible', function () {
    it('show expected gas defaults on a network supported by legacy gas API', async function () {
      await withFixtures(
        {
          fixtures: new FixtureBuilder().build(),
          ganacheOptions: {
            ...preLondonGanacheOptions,
            chainId: parseInt(CHAIN_IDS.BSC, 16),
          },
          title: this.test.fullTitle,
        },
        async ({ driver, ganacheServer }) => {
          await driver.navigate();
          await logInWithBalanceValidation(driver, ganacheServer);

          await openActionMenuAndStartSendFlow(driver);
          if (process.env.MULTICHAIN) {
            return;
          }
          await driver.fill(
            'input[placeholder="Enter public address (0x) or ENS name"]',
            '0x2f318C334780961FB129D2a6c30D0763d9a5C970',
          );

          await driver.fill('.unit-input__input', '1');

          // Check that the gas estimation is what we expect
          await driver.findElement({
            cass: '[data-testid="confirm-gas-display"]',
            text: '0.000042',
          });
        },
      );
    });

    it('show expected gas defaults on a network supported by legacy gas API when that API is down', async function () {
      await withFixtures(
        {
          fixtures: new FixtureBuilder().build(),
          ganacheOptions: {
            ...preLondonGanacheOptions,
            chainId: parseInt(CHAIN_IDS.BSC, 16),
          },
          testSpecificMock: (mockServer) => {
            mockServer
              .forGet(
                `https://gas-api.metaswap.codefi.network/networks/${parseInt(
                  CHAIN_IDS.BSC,
                  16,
                )}/gasPrices`,
              )
              .thenCallback(() => {
                return {
                  statusCode: 422,
                };
              });
          },
          title: this.test.fullTitle,
        },
        async ({ driver, ganacheServer }) => {
          await driver.navigate();
          await logInWithBalanceValidation(driver, ganacheServer);

          await openActionMenuAndStartSendFlow(driver);
          if (process.env.MULTICHAIN) {
            return;
          }
          await driver.fill(
            'input[placeholder="Enter public address (0x) or ENS name"]',
            '0x2f318C334780961FB129D2a6c30D0763d9a5C970',
          );

          await driver.fill('.unit-input__input', '1');

          // Check that the gas estimation is what we expect
          await driver.findElement({
            cass: '[data-testid="confirm-gas-display"]',
            text: '0.000042',
          });
        },
      );
    });

    it('show expected gas defaults on a network not supported by legacy gas API', async function () {
      await withFixtures(
        {
          fixtures: new FixtureBuilder().build(),
          ganacheOptions: preLondonGanacheOptions,
          title: this.test.fullTitle,
        },
        async ({ driver, ganacheServer }) => {
          await driver.navigate();
          await logInWithBalanceValidation(driver, ganacheServer);

          await openActionMenuAndStartSendFlow(driver);
          if (process.env.MULTICHAIN) {
            return;
          }
          await driver.fill(
            'input[placeholder="Enter public address (0x) or ENS name"]',
            '0x2f318C334780961FB129D2a6c30D0763d9a5C970',
          );

          await driver.fill('.unit-input__input', '1');

          // Check that the gas estimation is what we expect
          await driver.findElement({
            cass: '[data-testid="confirm-gas-display"]',
            text: '0.000042',
          });
        },
      );
    });
  });
});

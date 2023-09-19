const { strict: assert } = require('assert');
const { withFixtures, openDapp, convertToHexValue } = require('../helpers');
const FixtureBuilder = require('../fixture-builder');

const SIGNATURE_TYPE = {
  TYPED_V3: 'v3',
  TYPED_V4: 'v4',
};

const ganacheOptions = {
  accounts: [
    {
      secretKey:
        '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
      balance: convertToHexValue(25000000000000000000),
    },
  ],
};

async function login(driver) {
  await driver.navigate();
  await driver.fill('#password', 'correct horse battery staple');
  await driver.press('#password', driver.Key.ENTER);
}

async function openTestSnaps(driver) {
  const handle = await driver.openNewPage('http://localhost:8081');
  await driver.delay(1000);
  return handle;
}

async function installNameLookupSnap(driver) {
  // Click Connect Button
  const connectButton = await driver.findElement('#connectNameLookupSnap');
  await driver.scrollToElement(connectButton);
  await driver.delay(1000);
  await connectButton.click();
  await driver.delay(1000);

  // Confirm Connect Modal
  focusNotification(driver);
  await driver.clickElement({
    text: 'Connect',
    tag: 'button',
  });

  // Confirm Install Modal
  await driver.waitForSelector({ text: 'Install' });
  await driver.clickElement({
    text: 'Install',
    tag: 'button',
  });

  // Success Modal
  await driver.waitForSelector({ text: 'OK' });
  await driver.clickElement({
    text: 'OK',
    tag: 'button',
  });
}

async function createSignatureRequest(driver, type) {
  const buttonId =
    type === SIGNATURE_TYPE.TYPED_V3 ? '#signTypedDataV3' : '#signTypedDataV4';

  await driver.clickElement(buttonId);
  await driver.delay(3000);
}

async function rejectSignatureRequest(driver) {
  await driver.clickElement({ text: 'Reject', tag: 'button' });
  await driver.delay(3000);
}

async function focusNotification(driver) {
  const windowHandles = await driver.getAllWindowHandles();
  await driver.switchToWindowWithTitle('MetaMask Notification', windowHandles);
  await driver.delay(3000);
}

async function focusTestDapp(driver) {
  const windowHandles = await driver.getAllWindowHandles();
  await driver.switchToWindowWithTitle('E2E Test Dapp', windowHandles);
  await driver.delay(3000);
}

async function showThirdPartyDetails(driver) {
  const verifyContractDetailsButton = await driver.findElement(
    '.signature-request-content__verify-contract-details',
  );

  verifyContractDetailsButton.click();

  await driver.delay(3000);

  return await driver.findElement('.contract-details-modal');
}

async function closeThirdPartyDetails(driver) {
  await driver.clickElement({ text: 'Got it', tag: 'button' });
}

async function getAddressesInMessage(driver) {
  return await driver.findElements(
    '.signature-request-data__node__value__address',
  );
}

async function expectName(
  parent,
  expectedValue,
  expectedProposedName,
  isSaved,
) {
  const value = await (
    await parent.nestedFindElement(isSaved ? '.name__name' : '.name__value')
  ).getText();

  assert.equal(value, expectedValue, 'Name value is incorrect');

  if (expectedProposedName) {
    const proposedName = (
      await (await parent.nestedFindElement(`.name__proposed`))?.getText()
    )
      ?.replace('“', '')
      .replace('”', '');

    assert.equal(
      proposedName,
      expectedProposedName,
      'Proposed name is incorrect',
    );
  }

  if (isSaved) {
    await parent.nestedFindElement(`.name__saved`);
  } else {
    await parent.nestedFindElement(`.name__missing`);
  }
}

async function saveName(driver, parent, name, proposedName) {
  (await parent.nestedFindElement('.name')).click();
  (await driver.findElement('.form-combo-field')).click();

  if (proposedName) {
    const options = await driver.findElements(
      '.form-combo-field__option-primary',
    );

    let found = false;

    for (const option of options) {
      const text = await option.getText();

      if (text === proposedName) {
        option.click();
        found = true;
        break;
      }
    }

    if (!found) {
      assert.fail('Could not find proposed name');
    }
  }

  if (name) {
    const input = await driver.findElement('.form-combo-field input');
    await input.fill(name);
    await input.press(driver.Key.ENTER);
  }

  await driver.clickElement({ text: 'Save', tag: 'button' });
}

async function getProposedNames(driver, parent) {
  (await parent.nestedFindElement('.name')).click();
  (await driver.findElement('.form-combo-field')).click();

  const primaryTextElements = await driver.findElements(
    '.form-combo-field__option-primary',
  );

  const secondaryTextElements = await driver.findElements(
    '.form-combo-field__option-secondary',
  );

  const proposedNames = [];

  for (let i = 0; i < primaryTextElements.length; i++) {
    const primaryText = await primaryTextElements[i].getText();
    const secondaryText = await secondaryTextElements[i].getText();

    proposedNames.push([primaryText, secondaryText]);
  }

  return proposedNames;
}

describe('Petnames', function () {
  it('can save names for addresses in type 3 signatures', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .withNoNames()
          .build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await login(driver);
        await openDapp(driver);
        await createSignatureRequest(driver, SIGNATURE_TYPE.TYPED_V3);
        await focusNotification(driver);

        let addresses = await getAddressesInMessage(driver);

        await expectName(addresses[0], '0xCD2...D826', 'test.lens', false);
        await expectName(addresses[1], '0xbBb...BBbB', 'test2.lens', false);

        await saveName(driver, addresses[0], undefined, 'test.lens');
        await saveName(driver, addresses[1], undefined, 'test2.lens');

        let contractDetailsModal = await showThirdPartyDetails(driver);

        await expectName(
          contractDetailsModal,
          '0xCcC...cccC',
          'test3.lens',
          false,
        );

        await saveName(driver, contractDetailsModal, 'Custom Name');
        await closeThirdPartyDetails(driver);
        await rejectSignatureRequest(driver);
        await focusTestDapp(driver);
        await createSignatureRequest(driver, SIGNATURE_TYPE.TYPED_V3);
        await focusNotification(driver);

        addresses = await getAddressesInMessage(driver);

        await expectName(addresses[0], 'test.lens', undefined, true);
        await expectName(addresses[1], 'test2.lens', undefined, true);

        contractDetailsModal = await showThirdPartyDetails(driver);

        await expectName(contractDetailsModal, 'Custom Name', undefined, true);
      },
    );
  });

  it('can save names for addresses in type 4 signatures', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .withNoNames()
          .build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await login(driver);
        await openDapp(driver);
        await createSignatureRequest(driver, SIGNATURE_TYPE.TYPED_V4);
        await focusNotification(driver);

        let addresses = await getAddressesInMessage(driver);

        await expectName(addresses[0], '0xCD2...D826', 'test.lens', false);
        await expectName(addresses[1], '0xDea...beeF', 'Test Token', false);
        await expectName(addresses[2], '0xbBb...BBbB', 'test2.lens', false);
        await expectName(addresses[3], '0xB0B...Ea57', 'Test Token 2', false);
        await expectName(addresses[4], '0xB0B...0000', undefined, false);

        await saveName(driver, addresses[0], undefined, 'test.lens');
        await saveName(driver, addresses[3], undefined, 'Test Token 2');

        let contractDetailsModal = await showThirdPartyDetails(driver);

        await expectName(
          contractDetailsModal,
          '0xCcC...cccC',
          'test3.lens',
          false,
        );

        await saveName(driver, contractDetailsModal, 'Custom Name');
        await closeThirdPartyDetails(driver);
        await rejectSignatureRequest(driver);
        await focusTestDapp(driver);
        await createSignatureRequest(driver, SIGNATURE_TYPE.TYPED_V4);
        await focusNotification(driver);

        addresses = await getAddressesInMessage(driver);

        await expectName(addresses[0], 'test.lens', undefined, true);
        await expectName(addresses[3], 'Test Token 2', undefined, true);

        contractDetailsModal = await showThirdPartyDetails(driver);

        await expectName(contractDetailsModal, 'Custom Name', undefined, true);
      },
    );
  });

  it('can propose names using installed snaps', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .withNoNames()
          .build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await login(driver);
        await openDapp(driver);
        await openTestSnaps(driver);
        await installNameLookupSnap(driver);
        await focusTestDapp(driver);
        await createSignatureRequest(driver, SIGNATURE_TYPE.TYPED_V4);
        await focusNotification(driver);

        const addresses = await getAddressesInMessage(driver);

        assert.deepEqual(await getProposedNames(driver, addresses[0]), [
          ['Test Token - 0xCD2 / 0x539', 'MetaMask Name Lookup Test Snap'],
          ['test.lens', 'Lens Protocol'],
        ]);
      },
    );
  });
});

const reactTriggerChange = require('react-trigger-change')
const {
  timeout,
  queryAsync,
  findAsync,
} = require('../../lib/util')

QUnit.module('Add token flow')

QUnit.test('successful add token flow', (assert) => {
  const done = assert.async()
  runAddTokenFlowTest(assert)
    .then(done)
    .catch(err => {
      assert.notOk(err, `Error was thrown: ${err.stack}`)
      done()
    })
})

async function runAddTokenFlowTest (assert, done) {
  const selectState = await queryAsync($, 'select')
  selectState.val('add token')
  reactTriggerChange(selectState[0])

  // Check that no tokens have been added
  assert.ok($('.token-list-item').length === 0, 'no tokens added')

  // Go to Add Token screen
  let addTokenButton = await queryAsync($, 'button.btn-primary.wallet-view__add-token-button')
  assert.ok(addTokenButton[0], 'add token button present')
  addTokenButton[0].click()

  // Verify Add Token screen
  let addTokenWrapper = await queryAsync($, '.add-token__wrapper')
  assert.ok(addTokenWrapper[0], 'add token wrapper renders')

  let addTokenTitle = await queryAsync($, '.add-token__header__title')
  assert.equal(addTokenTitle[0].textContent, 'Add Tokens', 'add token title is correct')

  // Cancel Add Token
  const cancelAddTokenButton = await queryAsync($, 'button.btn-secondary--lg.add-token__cancel-button')
  assert.ok(cancelAddTokenButton[0], 'cancel add token button present')
  cancelAddTokenButton.click()

  assert.ok($('.wallet-view')[0], 'cancelled and returned to account detail wallet view')

  // Return to Add Token Screen
  addTokenButton = await queryAsync($, 'button.btn-primary.wallet-view__add-token-button')
  assert.ok(addTokenButton[0], 'add token button present')
  addTokenButton[0].click()

  // Verify Add Token Screen
  addTokenWrapper = await queryAsync($, '.add-token__wrapper')
  addTokenTitle = await queryAsync($, '.add-token__header__title')
  assert.ok(addTokenWrapper[0], 'add token wrapper renders')
  assert.equal(addTokenTitle[0].textContent, 'Add Tokens', 'add token title is correct')

  // Search for token
  const searchInput = await queryAsync($, 'input.add-token__input')
  searchInput.val('a')
  reactTriggerChange(searchInput[0])

  // Click token to add
  const tokenWrapper = await queryAsync($, 'div.add-token__token-wrapper')
  assert.ok(tokenWrapper[0], 'token found')
  const tokenImageProp = tokenWrapper.find('.add-token__token-icon').css('background-image')
  const tokenImageUrl = tokenImageProp.slice(5, -2)
  tokenWrapper[0].click()

  // Click Next button
  let nextButton = await queryAsync($, 'button.btn-primary--lg')
  assert.equal(nextButton[0].textContent, 'Next', 'next button rendered')
  nextButton[0].click()

  // Confirm Add token
  assert.equal(
    $('.add-token__description')[0].textContent,
    'Token balance(s)',
    'confirm add token rendered'
  )
  assert.ok($('button.btn-primary--lg')[0], 'confirm add token button found')
  $('button.btn-primary--lg')[0].click()

  // Verify added token image
  let heroBalance = await queryAsync($, '.hero-balance')
  assert.ok(heroBalance, 'rendered hero balance')
  assert.ok(tokenImageUrl.indexOf(heroBalance.find('img').attr('src')) > -1, 'token added')

  // Return to Add Token Screen
  addTokenButton = await queryAsync($, 'button.btn-primary.wallet-view__add-token-button')
  assert.ok(addTokenButton[0], 'add token button present')
  addTokenButton[0].click()

  const addTokenTabs = await queryAsync($, '.add-token__header__tabs__tab')
  assert.equal(addTokenTabs.length, 2, 'expected number of tabs')
  assert.equal(addTokenTabs[1].textContent, 'Custom Token', 'Custom Token tab present')
  assert.ok(addTokenTabs[1], 'add custom token tab present')
  addTokenTabs[1].click()

  // Input token contract address
  const customInput = await queryAsync($, 'input.add-token__add-custom-input')
  customInput.val('0x177af043D3A1Aed7cc5f2397C70248Fc6cDC056c')
  reactTriggerChange(customInput[0])

  // Click Next button
  nextButton = await queryAsync($, 'button.btn-primary--lg')
  assert.equal(nextButton[0].textContent, 'Next', 'next button rendered')
  nextButton[0].click()

  // Verify symbol length error since contract address won't return symbol
  const errorMessage = await queryAsync($, '.add-token__add-custom-error-message')
  assert.ok(errorMessage[0], 'error rendered')

  $('button.btn-secondary--lg')[0].click()

  // // Confirm Add token
  // assert.equal(
  //   $('.add-token__description')[0].textContent,
  //   'Would you like to add these tokens?',
  //   'confirm add token rendered'
  // )
  // assert.ok($('button.btn-primary--lg')[0], 'confirm add token button found')
  // $('button.btn-primary--lg')[0].click()

  // // Verify added token image
  // heroBalance = await queryAsync($, '.hero-balance')
  // assert.ok(heroBalance, 'rendered hero balance')
  // assert.ok(heroBalance.find('.identicon')[0], 'token added')
}

const reactTriggerChange = require('react-trigger-change')

const PASSWORD = 'password123'

QUnit.module('confirm sig requests')

QUnit.test('successful confirmation of sig requests', (assert) => {
  const done = assert.async()
  runConfirmSigRequestsTest(assert).then(done).catch((err) => {
    assert.notOk(err, `Error was thrown: ${err.stack}`)
    done()
  })
})

async function runConfirmSigRequestsTest(assert, done) {
  let selectState = $('select')
  selectState.val('confirm sig requests')
  reactTriggerChange(selectState[0])

  await timeout(2000)

  let confirmSigHeadline = $('.request-signature__headline')
  assert.equal(confirmSigHeadline[0].textContent, 'Your signature is being requested')

  let confirmSigRowValue = $('.request-signature__row-value')
  assert.ok(confirmSigRowValue[0].textContent.match(/^\#\sTerms\sof\sUse/))

  let confirmSigSignButton = $('.request-signature__footer__sign-button')
  confirmSigSignButton[0].click()

  await timeout(2000)

  confirmSigHeadline = $('.request-signature__headline')
  assert.equal(confirmSigHeadline[0].textContent, 'Your signature is being requested')

  let confirmSigMessage = $('.request-signature__notice')
  assert.ok(confirmSigMessage[0].textContent.match(/^Signing\sthis\smessage/))

  confirmSigRowValue = $('.request-signature__row-value')
  assert.equal(confirmSigRowValue[0].textContent, '0x879a053d4800c6354e76c7985a865d2922c82fb5b3f4577b2fe08b998954f2e0')

  confirmSigSignButton = $('.request-signature__footer__sign-button')
  confirmSigSignButton[0].click()

  await timeout(2000)

  confirmSigHeadline = $('.request-signature__headline')
  assert.equal(confirmSigHeadline[0].textContent, 'Your signature is being requested')

  confirmSigRowValue = $('.request-signature__row-value')
  assert.equal(confirmSigRowValue[0].textContent, 'Hi, Alice!')
  assert.equal(confirmSigRowValue[1].textContent, '1337')

  confirmSigSignButton = $('.request-signature__footer__sign-button')
  confirmSigSignButton[0].click()

  await timeout(2000)

  const txView = $('.tx-view')
  assert.ok(txView[0], 'Should return to the account details screen after confirming')
}

function timeout (time) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time || 1500)
  })
}
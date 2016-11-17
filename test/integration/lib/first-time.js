QUnit.test('agree to terms', function (assert) {
  var done = assert.async()
  let app

  wait().then(function() {
    app = $('iframe').contents().find('#app-content .mock-app-root')
    app.find('.markdown').prop('scrollTop', 100000000)
    return wait()
  }).then(function() {
    var title = app.find('h1').text()
    assert.equal(title, 'MetaMask', 'title screen')

    done()
  })
})

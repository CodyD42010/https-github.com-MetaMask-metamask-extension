// import Ganache from 'ganache-core'
import CGanache from '@yqrashawn/conflux-local-network-lite'
import nock from 'nock'
import Enzyme from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import log from 'loglevel'

Enzyme.configure({ adapter: new Adapter() })
// disallow promises from swallowing errors
enableFailureOnUnhandledPromiseRejection()

const server = new CGanache({ genBlockInterval: 300 })
before(done => {
  server
    .start()
    .then(() => {
      console.log('Ganache Testrpc is running on "http://localhost:12539"')
      nock.disableNetConnect()
      nock.enableNetConnect('localhost')
      done()
    })
    .catch(err => {
      console.error(err)
    })
})

// ganache server
// const server = Ganache.server()
// server.listen(8545, () => {
//   console.log('Ganache Testrpc is running on "http://localhost:8545"')
// })

log.setDefaultLevel(5)
global.log = log

//
// polyfills
//

// fetch
global.fetch = require('isomorphic-fetch')
require('abortcontroller-polyfill/dist/polyfill-patch-fetch')

// dom
require('jsdom-global')()

// localStorage
window.localStorage = {}

// crypto.getRandomValues
if (!window.crypto) {
  window.crypto = {}
}
if (!window.crypto.getRandomValues) {
  window.crypto.getRandomValues = require('polyfill-crypto.getrandomvalues')
}

function enableFailureOnUnhandledPromiseRejection () {
  // overwrite node's promise with the stricter Bluebird promise
  global.Promise = require('bluebird')

  // modified from https://github.com/mochajs/mocha/issues/1926#issuecomment-180842722

  // rethrow unhandledRejections
  if (typeof process !== 'undefined') {
    process.on('unhandledRejection', function (reason) {
      throw reason
    })
  } else if (typeof window !== 'undefined') {
    // 2016-02-01: No browsers support this natively, however bluebird, when.js,
    // and probably other libraries do.
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('unhandledrejection', function (evt) {
        throw evt.detail.reason
      })
    } else {
      const oldOHR = window.onunhandledrejection
      window.onunhandledrejection = function (evt) {
        if (typeof oldOHR === 'function') {
          oldOHR.apply(this, arguments)
        }
        throw evt.detail.reason
      }
    }
  } else if (
    typeof console !== 'undefined' &&
    typeof (console.error || console.log) === 'function'
  ) {
    ;(console.error || console.log)('Unhandled rejections will be ignored!')
  }
}

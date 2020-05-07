const injectCss = require('inject-css')
const OldMetaMaskUiCss = require('../../old-ui/css')
const startPopup = require('./popup-core')
const PortStream = require('extension-port-stream')
const { getEnvironmentType } = require('./lib/util')
import extension from 'extensionizer'
const ExtensionPlatform = require('./platforms/extension')
const setupRaven = require('./lib/setupRaven')
const log = require('loglevel')

start().catch(log.error)

async function start () {

  // create platform global
  global.platform = new ExtensionPlatform()

  // setup sentry error reporting
  const release = global.platform.getVersion()
  setupRaven({ release })

  // inject css
  // const css = MetaMaskUiCss()
  // injectCss(css)

  // identify window type (popup, notification)
  const windowType = getEnvironmentType(window.location.href)
  global.METAMASK_UI_TYPE = windowType

  // setup stream to background
  const extensionPort = extension.runtime.connect({ name: windowType })
  const connectionStream = new PortStream(extensionPort)

  // start ui
  const container = document.getElementById('app-content')
  startPopup({ container, connectionStream }, (err, store) => {
    if (err) return displayCriticalError(err)

    // Code commented out until we begin auto adding users to NewUI
    // const { isMascara, identities = {}, featureFlags = {} } = store.getState().metamask
    // const firstTime = Object.keys(identities).length === 0

    // Code commented out until we begin auto adding users to NewUI

    const css = OldMetaMaskUiCss()
    injectCss(css)
  })


  function displayCriticalError (err) {
    container.innerHTML = '<div class="critical-error">The Nifty Wallet app failed to load: please open and close Nifty Wallet again to restart.</div>'
    container.style.height = '80px'
    log.error(err.stack)
    throw err
  }

}

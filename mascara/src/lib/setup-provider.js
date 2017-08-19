const setupIframe = require('./setup-iframe.js')
const MetamaskInpageProvider = require('../../../app/scripts/lib/inpage-provider.js')

module.exports = getProvider


function getProvider(opts){
  var iframeStream = setupIframe({
    zeroClientProvider: opts.mascaraUrl,
    sandboxAttributes: ['allow-scripts', 'allow-popups', 'allow-same-origin'],
    container: document.body,
  })
  var inpageProvider = new MetamaskInpageProvider(iframeStream)
  global.mascaraProvider = inpageProvider

  if (global.web3) {
    console.log('MetaMask ZeroClient - using environmental web3 provider')
    return global.web3.currentProvider
  }

  console.log('MetaMask ZeroClient - injecting zero-client iframe!')
  return inpageProvider

}

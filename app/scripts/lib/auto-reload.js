
// TODO:deprecate:2020

export default function setupDappAutoReload (web3, observable) {
  // export web3 as a global, checking for usage
  let reloadInProgress = false
  let lastTimeUsed
  let lastSeenNetwork
  let hasBeenWarned = false

  const web3Proxy = new Proxy(web3, {
    get: (_web3, key) => {
      // get the time of use
      lastTimeUsed = Date.now()
      // show warning once on web3 access
      if (!hasBeenWarned && key !== 'currentProvider') {
        console.warn(`MetaMask: We will stop injecting web3 in Q4 2020.\nPlease see this article for more information: https://medium.com/metamask/no-longer-injecting-web3-js-4a899ad6e59e`)
        hasBeenWarned = true
      }
      // return value normally
      return _web3[key]
    },
    set: (_web3, key, value) => {
      // set value normally
      _web3[key] = value
    },
  })

  Object.defineProperty(global, 'web3', {
    enumerable: false,
    writable: true,
    configurable: true,
    value: web3Proxy,
  })

  observable.subscribe(function (state) {
    // if the auto refresh on network change is false do not
    // do anything
    if (!window.ethereum.autoRefreshOnNetworkChange) {
      return
    }

    // if reload in progress, no need to check reload logic
    if (reloadInProgress) {
      return
    }

    const currentNetwork = state.networkVersion

    // set the initial network
    if (!lastSeenNetwork) {
      lastSeenNetwork = currentNetwork
      return
    }

    // skip reload logic if web3 not used
    if (!lastTimeUsed) {
      return
    }

    // if network did not change, exit
    if (currentNetwork === lastSeenNetwork) {
      return
    }

    // initiate page reload
    reloadInProgress = true
    const timeSinceUse = Date.now() - lastTimeUsed
    // if web3 was recently used then delay the reloading of the page
    if (timeSinceUse > 500) {
      triggerReset()
    } else {
      setTimeout(triggerReset, 500)
    }
  })
}

// reload the page
function triggerReset () {
  global.location.reload()
}

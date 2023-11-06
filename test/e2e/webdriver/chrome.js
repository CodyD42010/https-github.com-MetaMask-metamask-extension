const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const proxy = require('selenium-webdriver/proxy');
const { ThenableWebDriver } = require('selenium-webdriver'); // eslint-disable-line no-unused-vars -- this is imported for JSDoc

/**
 * Proxy host to use for HTTP and HTTPS requests
 *
 * @type {string}
 */
const PROXY_HOST = '127.0.0.1:8000';

/**
 * A wrapper around a {@code WebDriver} instance exposing Chrome-specific functionality
 */
class ChromeDriver {
<<<<<<< HEAD
  static async build({ responsive, port }) {
    const args = [`load-extension=dist/chrome`];
    if (responsive) {
=======
  static async build({ openDevToolsForTabs, port }) {
    const args = [`load-extension=${process.cwd()}/dist/chrome`];
    if (openDevToolsForTabs) {
>>>>>>> upstream/multichain-swaps-controller
      args.push('--auto-open-devtools-for-tabs');
    }
    args.push('--log-level=3');
    // Proxy localhost on Chrome
    args.push('--proxy-bypass-list=<-loopback>');
    const options = new chrome.Options().addArguments(args);
    options.setProxy(proxy.manual({ http: PROXY_HOST, https: PROXY_HOST }));
    options.setAcceptInsecureCerts(true);
    const builder = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options);
    const service = new chrome.ServiceBuilder();

    // Enables Chrome logging. Default: enabled
    // Especially useful for discovering why Chrome has crashed, but can also
    // be useful for revealing console errors (from the page or background).
    if (process.env.ENABLE_CHROME_LOGGING !== 'false') {
      service.setStdio('inherit').enableChromeLogging();
    }
    if (port) {
      service.setPort(port);
    }
    builder.setChromeService(service);
    const driver = builder.build();
    const chromeDriver = new ChromeDriver(driver);
    const extensionId = await chromeDriver.getExtensionIdByName('MetaMask');

    return {
      driver,
      extensionUrl: `chrome-extension://${extensionId}`,
    };
  }

  /**
   * @param {!ThenableWebDriver} driver - a {@code WebDriver} instance
   */
  constructor(driver) {
    this._driver = driver;
  }

  /**
   * Returns the extension ID for the given extension name
   *
   * @param {string} extensionName - the extension name
   * @returns {Promise<string|undefined>} the extension ID
   */
  async getExtensionIdByName(extensionName) {
    await this._driver.get('chrome://extensions');
    return await this._driver.executeScript(`
      const extensions = document.querySelector("extensions-manager").shadowRoot
        .querySelector("extensions-item-list").shadowRoot
        .querySelectorAll("extensions-item")

      for (let i = 0; i < extensions.length; i++) {
        const extension = extensions[i].shadowRoot
        const name = extension.querySelector('#name').textContent
        if (name.startsWith("${extensionName}")) {
          return extensions[i].getAttribute("id")
        }
      }

      return undefined
    `);
  }
}

module.exports = ChromeDriver;

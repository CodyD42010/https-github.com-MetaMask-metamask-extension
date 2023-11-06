const { promises: fs } = require('fs');
const { strict: assert } = require('assert');
<<<<<<< HEAD
const { until, error: webdriverError, By } = require('selenium-webdriver');
=======
const {
  By,
  Condition,
  error: webdriverError,
  Key,
  until,
  ThenableWebDriver, // eslint-disable-line no-unused-vars -- this is imported for JSDoc
  WebElement, // eslint-disable-line no-unused-vars -- this is imported for JSDoc
} = require('selenium-webdriver');
>>>>>>> upstream/multichain-swaps-controller
const cssToXPath = require('css-to-xpath');
const { retry } = require('../../../development/lib/retry');

const PAGES = {
  BACKGROUND: 'background',
  HOME: 'home',
  NOTIFICATION: 'notification',
  POPUP: 'popup',
};

/**
 * Temporary workaround to patch selenium's element handle API with methods
 * that match the playwright API for Elements
 *
<<<<<<< HEAD
 * @param {Object} element - Selenium Element
 * @param driver
 * @returns {Object} modified Selenium Element
=======
 * @param {object} element - Selenium Element
 * @param {!ThenableWebDriver} driver
 * @returns {object} modified Selenium Element
>>>>>>> upstream/multichain-swaps-controller
 */
function wrapElementWithAPI(element, driver) {
  element.press = (key) => element.sendKeys(key);
  element.fill = async (input) => {
    // The 'fill' method in playwright replaces existing input
    await element.clear();
    await element.sendKeys(input);
  };
  element.waitForElementState = async (state, timeout) => {
    switch (state) {
      case 'hidden':
        return await driver.wait(until.stalenessOf(element), timeout);
      case 'visible':
        return await driver.wait(until.elementIsVisible(element), timeout);
      default:
        throw new Error(`Provided state: '${state}' is not supported`);
    }
  };
  return element;
}

<<<<<<< HEAD
=======
until.elementIsNotPresent = function elementIsNotPresent(locator) {
  return new Condition(`Element not present`, function (driver) {
    return driver.findElements(locator).then(function (elements) {
      return elements.length === 0;
    });
  });
};

>>>>>>> upstream/multichain-swaps-controller
/**
 * This is MetaMask's custom E2E test driver, wrapping the Selenium WebDriver.
 * For Selenium WebDriver API documentation, see:
 * https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_WebDriver.html
 */
class Driver {
  /**
   * @param {!ThenableWebDriver} driver - A {@code WebDriver} instance
   * @param {string} browser - The type of browser this driver is controlling
   * @param extensionUrl
   * @param {number} timeout
   */
  constructor(driver, browser, extensionUrl, timeout = 10000) {
    this.driver = driver;
    this.browser = browser;
    this.extensionUrl = extensionUrl;
    this.timeout = timeout;
    // The following values are found in
    // https://github.com/SeleniumHQ/selenium/blob/trunk/javascript/node/selenium-webdriver/lib/input.js#L50-L110
    // These should be replaced with string constants 'Enter' etc for playwright.
    this.Key = {
      BACK_SPACE: '\uE003',
      ENTER: '\uE007',
    };
  }

  async executeAsyncScript(script, ...args) {
    return this.driver.executeAsyncScript(script, args);
  }

  async executeScript(script, ...args) {
    return this.driver.executeScript(script, args);
  }

  buildLocator(locator) {
    if (typeof locator === 'string') {
      // If locator is a string we assume its a css selector
      return By.css(locator);
    } else if (locator.value) {
      // For backwards compatibility, checking if the locator has a value prop
      // tells us this is a Selenium locator
      return locator;
    } else if (locator.xpath) {
      // Providing an xpath prop to the object will consume the locator as an
      // xpath locator.
      return By.xpath(locator.xpath);
    } else if (locator.text) {
      // Providing a text prop, and optionally a tag or css prop, will use
      // xpath to look for an element with the tag that has matching text.
      if (locator.css) {
        // When providing css prop we use cssToXPath to build a xpath string
        // We provide two cases to check for, first a text node of the
        // element that matches the text provided OR we test the stringified
        // contents of the element in the case where text is split across
        // multiple children. In the later case non literal spaces are stripped
        // so we do the same with the input to provide a consistent API.
        const xpath = cssToXPath
          .parse(locator.css)
          .where(
            cssToXPath.xPathBuilder
              .string()
              .contains(locator.text)
              .or(
                cssToXPath.xPathBuilder
                  .string()
                  .contains(locator.text.split(' ').join('')),
              ),
          )
          .toXPath();
        return By.xpath(xpath);
      }
      // The tag prop is optional and further refines which elements match
      return By.xpath(
        `//${locator.tag ?? '*'}[contains(text(), '${locator.text}')]`,
      );
    }
    throw new Error(
      `The locator '${locator}' is not supported by the E2E test driver`,
    );
  }

  async fill(rawLocator, input) {
    const element = await this.findElement(rawLocator);
    await element.fill(input);
    return element;
  }

  async press(rawLocator, keys) {
    const element = await this.findElement(rawLocator);
    await element.press(keys);
    return element;
  }

  async delay(time) {
    await new Promise((resolve) => setTimeout(resolve, time));
  }

  async wait(condition, timeout = this.timeout) {
    await this.driver.wait(condition, timeout);
  }

  async waitForSelector(
    rawLocator,
    { timeout = this.timeout, state = 'visible' } = {},
  ) {
    // Playwright has a waitForSelector method that will become a shallow
    // replacement for the implementation below. It takes an option options
    // bucket that can include the state attribute to wait for elements that
    // match the selector to be removed from the DOM.
    const selector = this.buildLocator(rawLocator);
    let element;
    if (!['visible', 'detached'].includes(state)) {
      throw new Error(`Provided state selector ${state} is not supported`);
    }
    if (state === 'visible') {
      element = await this.driver.wait(until.elementLocated(selector), timeout);
    } else if (state === 'detached') {
      element = await this.driver.wait(
        until.stalenessOf(await this.findElement(selector)),
        timeout,
      );
    }
    return wrapElementWithAPI(element, this);
  }

<<<<<<< HEAD
  async waitForAbsenceOfSelector(rawLocator, { timeout = this.timeout } = {}) {
    const selector = this.buildLocator(rawLocator);
    await this.driver.wait(
      async (driver) => {
        const elements = await driver.findElements(selector);
        return elements.length === 0;
      },
      timeout,
      'Timed out waiting for element to not exist',
    );
=======
  async waitForNonEmptyElement(element) {
    await this.driver.wait(async () => {
      const elemText = await element.getText();
      const empty = elemText === '';
      return !empty;
    }, this.timeout);
  }

  async waitForElementNotPresent(rawLocator) {
    const locator = this.buildLocator(rawLocator);
    return await this.driver.wait(until.elementIsNotPresent(locator));
>>>>>>> upstream/multichain-swaps-controller
  }

  async quit() {
    await this.driver.quit();
  }

  // Element interactions

  /**
   * @param {*} rawLocator
   * @returns {WebElement}
   */
  async findElement(rawLocator) {
    const locator = this.buildLocator(rawLocator);
    const element = await this.driver.wait(
      until.elementLocated(locator),
      this.timeout,
    );
    return wrapElementWithAPI(element, this);
  }

  async findVisibleElement(rawLocator) {
    const locator = this.buildLocator(rawLocator);
    const element = await this.findElement(locator);
    await this.driver.wait(until.elementIsVisible(element), this.timeout);
    return wrapElementWithAPI(element, this);
  }

  async findClickableElement(rawLocator) {
    const locator = this.buildLocator(rawLocator);
    const element = await this.findElement(locator);
    await Promise.all([
      this.driver.wait(until.elementIsVisible(element), this.timeout),
      this.driver.wait(until.elementIsEnabled(element), this.timeout),
    ]);
    return wrapElementWithAPI(element, this);
  }

  async findElements(rawLocator) {
    const locator = this.buildLocator(rawLocator);
    const elements = await this.driver.wait(
      until.elementsLocated(locator),
      this.timeout,
    );
    return elements.map((element) => wrapElementWithAPI(element, this));
  }

  async findClickableElements(rawLocator) {
    const locator = this.buildLocator(rawLocator);
    const elements = await this.findElements(locator);
    await Promise.all(
      elements.reduce((acc, element) => {
        acc.push(
          this.driver.wait(until.elementIsVisible(element), this.timeout),
          this.driver.wait(until.elementIsEnabled(element), this.timeout),
        );
        return acc;
      }, []),
    );
    return elements.map((element) => wrapElementWithAPI(element, this));
  }

  async clickElement(rawLocator) {
    const locator = this.buildLocator(rawLocator);
    const element = await this.findClickableElement(locator);
    await element.click();
  }

  async clickPoint(rawLocator, x, y) {
    const locator = this.buildLocator(rawLocator);
    const element = await this.findElement(locator);
    await this.driver
      .actions()
      .move({ origin: element, x, y })
      .click()
      .perform();
  }

  async scrollToElement(element) {
    await this.driver.executeScript(
      'arguments[0].scrollIntoView(true)',
      element,
    );
  }

  async assertElementNotPresent(rawLocator) {
    const locator = this.buildLocator(rawLocator);
    let dataTab;
    try {
      dataTab = await this.findElement(locator);
    } catch (err) {
      assert(
        err instanceof webdriverError.NoSuchElementError ||
          err instanceof webdriverError.TimeoutError,
      );
    }
    assert.ok(!dataTab, 'Found element that should not be present');
  }

  async isElementPresent(element) {
    try {
      await this.findElement(element);
      return true;
    } catch (err) {
      return false;
    }
  }

  // Navigation

<<<<<<< HEAD
  async navigate(page = Driver.PAGES.HOME) {
    return await this.driver.get(`${this.extensionUrl}/${page}.html`);
=======
  async navigate(page = PAGES.HOME) {
    const response = await this.driver.get(`${this.extensionUrl}/${page}.html`);
    // Wait for asyncronous JavaScript to load
    await this.driver.wait(
      until.elementLocated(this.buildLocator('.metamask-loaded')),
      10 * 1000,
    );
    return response;
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
>>>>>>> upstream/multichain-swaps-controller
  }

  // Metrics

  async collectMetrics() {
    return await this.driver.executeScript(collectMetrics);
  }

  // Window management

  async openNewPage(url) {
    const newHandle = await this.driver.switchTo().newWindow();
    await this.driver.get(url);
    return newHandle;
  }

  async switchToWindow(handle) {
    await this.driver.switchTo().window(handle);
  }

  async getAllWindowHandles() {
    return await this.driver.getAllWindowHandles();
  }

  async waitUntilXWindowHandles(x, delayStep = 1000, timeout = 5000) {
    let timeElapsed = 0;
    let windowHandles = [];
    while (timeElapsed <= timeout) {
      windowHandles = await this.driver.getAllWindowHandles();
      if (windowHandles.length === x) {
        return windowHandles;
      }
      await this.delay(delayStep);
      timeElapsed += delayStep;
    }
    throw new Error('waitUntilXWindowHandles timed out polling window handles');
  }

  async switchToWindowWithTitle(
    title,
    initialWindowHandles,
    delayStep = 1000,
<<<<<<< HEAD
    timeout = 5000,
=======
    timeout = this.timeout,
    { retries = 8, retryDelay = 2500 } = {},
>>>>>>> upstream/multichain-swaps-controller
  ) {
    let windowHandles =
      initialWindowHandles || (await this.driver.getAllWindowHandles());
    let timeElapsed = 0;

    while (timeElapsed <= timeout) {
      for (const handle of windowHandles) {
<<<<<<< HEAD
        await this.driver.switchTo().window(handle);
        const handleTitle = await this.driver.getTitle();
=======
        const handleTitle = await retry(
          {
            retries,
            delay: retryDelay,
          },
          async () => {
            await this.driver.switchTo().window(handle);
            return await this.driver.getTitle();
          },
        );

>>>>>>> upstream/multichain-swaps-controller
        if (handleTitle === title) {
          return handle;
        }
      }
      await this.delay(delayStep);
      timeElapsed += delayStep;
      // refresh the window handles
      windowHandles = await this.driver.getAllWindowHandles();
    }

    throw new Error(`No window with title: ${title}`);
  }

  /**
   * Closes all windows except those in the given list of exceptions
   *
   * @param {Array<string>} exceptions - The list of window handle exceptions
   * @param {Array} [windowHandles] - The full list of window handles
   * @returns {Promise<void>}
   */
  async closeAllWindowHandlesExcept(exceptions, windowHandles) {
    // eslint-disable-next-line no-param-reassign
    windowHandles = windowHandles || (await this.driver.getAllWindowHandles());

    for (const handle of windowHandles) {
      if (!exceptions.includes(handle)) {
        await this.driver.switchTo().window(handle);
        await this.delay(1000);
        await this.driver.close();
        await this.delay(1000);
      }
    }
  }

  // Error handling

  async verboseReportOnFailure(title, error) {
    if (process.env.CIRCLECI) {
      console.error(
        `Failure in ${title}, for more information see the artifacts tab in CI\n`,
      );
    } else {
      console.error(
        `Failure in ${title}, for more information see the test-artifacts folder\n`,
      );
    }
    console.error(`${error}\n`);
    const artifactDir = `./test-artifacts/${this.browser}/${title}`;
    const filepathBase = `${artifactDir}/test-failure`;
    await fs.mkdir(artifactDir, { recursive: true });
    const screenshot = await this.driver.takeScreenshot();
    await fs.writeFile(`${filepathBase}-screenshot.png`, screenshot, {
      encoding: 'base64',
    });
    const htmlSource = await this.driver.getPageSource();
    await fs.writeFile(`${filepathBase}-dom.html`, htmlSource);
    const uiState = await this.driver.executeScript(
      () => window.getCleanAppState && window.getCleanAppState(),
    );
    await fs.writeFile(
      `${filepathBase}-state.json`,
      JSON.stringify(uiState, null, 2),
    );
  }

  async checkBrowserForConsoleErrors() {
    const ignoredLogTypes = ['WARNING'];
    const ignoredErrorMessages = [
      // Third-party Favicon 404s show up as errors
      'favicon.ico - Failed to load resource: the server responded with a status of 404',
      // Sentry rate limiting
      'Failed to load resource: the server responded with a status of 429',
      // 4Byte
      'Failed to load resource: the server responded with a status of 502 (Bad Gateway)',
    ];
    const browserLogs = await this.driver.manage().logs().get('browser');
    const errorEntries = browserLogs.filter(
      (entry) => !ignoredLogTypes.includes(entry.level.toString()),
    );
    const errorObjects = errorEntries.map((entry) => entry.toJSON());
    return errorObjects.filter(
      (entry) =>
        !ignoredErrorMessages.some((message) =>
          entry.message.includes(message),
        ),
    );
  }

  // Fetch mocks

  /**
   * Add runtime request handlers to the mock service worker.
   *
   * @param {() => void} setupRequestHandlers - The function that sets up request handlers.
   */
  async addRequestHandlers(setupRequestHandlers) {
    const currentWindowHandle = await this.driver.getWindowHandle();
    await this.openNewPage(`${this.extensionUrl}/background.html`);
    await this.delay(1000);
    await this.driver.executeScript(setupRequestHandlers);
    await this.driver.close();
    await this.driver.switchTo().window(currentWindowHandle);
  }
}

function collectMetrics() {
  const results = {
    paint: {},
    navigation: [],
  };

  window.performance.getEntriesByType('paint').forEach((paintEntry) => {
    results.paint[paintEntry.name] = paintEntry.startTime;
  });

  window.performance
    .getEntriesByType('navigation')
    .forEach((navigationEntry) => {
      results.navigation.push({
        domContentLoaded: navigationEntry.domContentLoadedEventEnd,
        load: navigationEntry.loadEventEnd,
        domInteractive: navigationEntry.domInteractive,
        redirectCount: navigationEntry.redirectCount,
        type: navigationEntry.type,
      });
    });

  return results;
}

<<<<<<< HEAD
Driver.PAGES = {
  BACKGROUND: 'background',
  HOME: 'home',
  NOTIFICATION: 'notification',
  POPUP: 'popup',
  BACKGROUND: 'background',
};

module.exports = Driver;
=======
module.exports = { Driver, PAGES };
>>>>>>> upstream/multichain-swaps-controller

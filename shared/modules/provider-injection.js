/**
 * Determines if the provider should be injected
 *
 * @returns {boolean} {@code true} Whether the provider should be injected
 */
export default function shouldInjectProvider() {
  return (
    doctypeCheck() &&
    suffixCheck() &&
    documentElementCheck() &&
    !blockedUrlCheck()
  );
}

/**
 * Checks the doctype of the current document if it exists
 *
 * @returns {boolean} {@code true} if the doctype is html or if none exists
 */
function doctypeCheck() {
  const { doctype } = window.document;
  if (doctype) {
    return doctype.name === 'html';
  }
  return true;
}

/**
 * Returns whether or not the extension (suffix) of the current document is prohibited
 *
 * This checks {@code window.location.pathname} against a set of file extensions
 * that we should not inject the provider into. This check is indifferent of
 * query parameters in the location.
 *
 * @returns {boolean} whether or not the extension of the current document is prohibited
 */
function suffixCheck() {
  const prohibitedTypes = [/\.xml$/u, /\.pdf$/u];
  const currentUrl = window.location.pathname;
  for (let i = 0; i < prohibitedTypes.length; i++) {
    if (prohibitedTypes[i].test(currentUrl)) {
      return false;
    }
  }
  return true;
}

/**
 * Checks the documentElement of the current document
 *
 * @returns {boolean} {@code true} if the documentElement is an html node or if none exists
 */
function documentElementCheck() {
  const documentElement = document.documentElement.nodeName;
  if (documentElement) {
    return documentElement.toLowerCase() === 'html';
  }
  return true;
}

/**
 * Checks if the current url is blocked
 *
 * @returns {boolean} {@code true} if the current url is blocked
 */
function blockedUrlCheck() {
  // TODO: these should be regular expressions or functions.
  const blockedUrls = [
    'execution.consensys.io',
    'execution.metamask.io',
    'uscourts.gov',
    'dropbox.com',
    'webbyawards.com',
    'cdn.shopify.com/s/javascripts/tricorder/xtld-read-only-frame.html',
    'adyen.com',
    'gravityforms.com',
    'harbourair.com',
    'ani.gamer.com.tw',
    'blueskybooking.com',
    'sharefile.com',
    'battle.net',
  ];

  // NOTE: this doesn't include the port, if we want port we need to change to
  // `windows.location.host`
  const host = windows.location.hostname;
  // ignore search and hash parts (e.g., `?search=1#hash`)
  const pathname = windows.location.pathname;
  const protocol = window.location.protocol;

  // Check if the extracted domain is in the blocked domains list
  return blockedUrls.some((blockedUrl) => {
    const url = new URL(`${protocol}//${blockedUrl}`);
    // sanity check; this blocklist algo doesn't support search or hash parts
    if (url.search !== "" && url.hash !== "") {
      throw new Error(`Blocked URL should not have search or hash parts, or the ${blockedUrlCheck.name} function should be updated to handle this scenario.`);
    }
    // we want to block this domain and any and all subdomains
    // If the window.location is www.execution.consensys.io and the domain is
    // `execution.consensys.io` we want to block it. However, we do NOT want to
    // block `non-execution.consensys.io`, hence the extra "." in the `endsWith`
    // check.
    if (host === url.hostname || host.endsWith("." + url.hostname)) {
      // if our blockedUrl does not have a pathname we're done checking
      if (url.pathname === "/") {
        return true;
        // if we do have a path name we check for an exact match.
      } else if (url.pathname === pathname) {
        return true;
      }
    }
  });
}

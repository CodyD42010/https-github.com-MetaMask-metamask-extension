// cross-browser connection to extension i18n API
const extension = require('extensionizer')
const log = require('loglevel')


class Translator {

  async setLocale(localeName) {
    this.localeName = localeName
    this.locale = await fetchLocale(localeName)
  }

  getMessage (key, substitutions) {
    // check locale is loaded
    if (!this.locale) {
      throw new Error('Translator - has not loaded a locale yet')
    }
    // check entry is present
    const entry = this.locale[key]
    if (!entry) {
      log.error(`Translator - Unable to find value for "${key}"`)
      throw new Error(`Translator - Unable to find value for "${key}"`)
    }
    let phrase = entry.message
    // perform substitutions
    if (substitutions && substitutions.length) {
      phrase = phrase.replace(/\$1/g, substitutions[0])
      if (substitutions.length > 1) {
        phrase = phrase.replace(/\$2/g, substitutions[1])
      }
    }
    return phrase
  }

}

async function fetchLocale (localeName) {
  const response = await fetch(`/_locales/${localeName}/messages.json`)
  const locale = await response.json()
  return locale
}

module.exports = Translator

const locales = ['af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bg', 'bs', 'my',
'ca', 'ceb', 'zh', 'zh-CN', 'zh-TW', 'co', 'hr', 'cs', 'da', 'nl', 'en', 'eo', 'et', 'fa', 'fi',
'fr', 'fy', 'gd', 'gl', 'ka', 'de', 'el', 'gu', 'ht', 'ha', 'haw', 'he', 'hi', 'hmn', 'hu', 'is',
'ig', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'rw', 'ky', 'ko', 'ku', 'lo', 'la', 'lv',
'lt', 'lb', 'mk', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mn', 'ne', 'no', 'ny', 'or', 'fa', 'pl',
'pt', 'ps', 'pa', 'ro', 'ru', 'sm', 'sn', 'sd', 'si', 'sr', 'sk', 'sl', 'so', 'st', 'es', 'su',
'sw', 'sv', 'tl', 'tg', 'ta', 'tt', 'te', 'th', 'tr', 'tk', 'ug', 'uk', 'ur', 'uz', 'vi', 'cy',
'xh', 'yi', 'yo', 'zu']


const localesMap = locales.reduce((langMap, lang) => {
  return {
    [lang]: lang,
    ...langMap
  }
}, {});

const mmToHcaptchaMap = {
  'zh_CN': 'zh-CN',
  'zh_TW': 'zh-TW',
  'es_419': 'es',
  'pt_BR': 'pt',
  'pt_PT': 'pt',
}

export function getWidgetLang(mmLocale) {
  const DEFAULT_LANG = 'en';

  if(!mmLocale) {
    return DEFAULT_LANG;
  }

  if(localesMap[mmLocale]) {
    return localesMap[mmLocale];
  }

  if(mmToHcaptchaMap[mmLocale]) {
    return mmToHcaptchaMap[mmLocale];
  }

  return DEFAULT_LANG;
}

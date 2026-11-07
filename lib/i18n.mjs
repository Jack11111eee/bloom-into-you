import fs from 'node:fs';
import { load } from 'cheerio';

export const LOCALES = [
  { code: 'en', lang: 'en', og: 'en_US', name: 'English', nativeName: 'English' },
  { code: 'zh-cn', lang: 'zh-Hans', og: 'zh_CN', name: 'Simplified Chinese', nativeName: '简体中文' },
  { code: 'zh-tw', lang: 'zh-Hant', og: 'zh_TW', name: 'Traditional Chinese', nativeName: '繁體中文' },
  { code: 'ja', lang: 'ja', og: 'ja_JP', name: 'Japanese', nativeName: '日本語' },
];
const readData = name => JSON.parse(fs.readFileSync(new URL(`../src/_data/${name}.json`, import.meta.url), 'utf8'));
const routesFromData = () => [
  ...Object.values(readData('pages').pages).map(page => page.canonical),
  ...readData('characters').characters.map(entry => entry.href),
  ...readData('insights').insights.map(entry => entry.href),
];
export const ROUTES = routesFromData();
export const localizedPath = (path, code) => code === 'en' ? path : `/${code}${path}`;
export const meaningfulText = text => /\p{L}/u.test(text) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
const catalogs = new Map();
export function clearCatalogCache() {
  catalogs.clear();
  ROUTES.splice(0, ROUTES.length, ...routesFromData());
}
export function catalogFor(code) {
  if (!LOCALES.some(l => l.code === code)) throw new Error(`Unknown locale: ${code}`);
  if (!catalogs.has(code)) {
    const catalog = JSON.parse(fs.readFileSync(new URL(`../src/_data/translations/${code}.json`, import.meta.url), 'utf8'));
    if (code !== 'en') {
      const english = catalogFor('en');
      const missing = Object.keys(english).filter(k => typeof catalog[k] !== 'string' || !catalog[k].trim());
      const extra = Object.keys(catalog).filter(k => !Object.hasOwn(english, k));
      if (missing.length || extra.length) throw new Error(`${code}: missing ${missing.join(', ')}, extra ${extra.join(', ')}`);
    }
    catalogs.set(code, catalog);
  }
  return catalogs.get(code);
}
export function translate(text, code) {
  const key = text.trim();
  if (!meaningfulText(key)) return text;
  const catalog = catalogFor(code);
  if (!Object.hasOwn(catalog, key)) throw new Error(`${code}: Unregistered text: ${key}`);
  return text.slice(0, text.indexOf(key)) + catalog[key] + text.slice(text.indexOf(key) + key.length);
}

const TEXT_META = 'meta[name=description],meta[property="og:title"],meta[property="og:description"],meta[property="og:site_name"],meta[property="twitter:title"],meta[property="twitter:description"]';
export function localizeHtml(content) {
  const $ = load(content);
  const code = $('html').attr('data-locale') || 'en';
  const locale = LOCALES.find(l => l.code === code);
  if (!locale) throw new Error(`Unknown page locale: ${code}`);
  const path = $('html').attr('data-path');
  if (!ROUTES.includes(path)) throw new Error(`Unregistered logical path: ${path}`);
  catalogFor(code); // Validate the whole catalog, including currently dormant interface text.
  $('html').attr('lang', locale.lang);
  $('meta[property="og:locale"]').attr('content', locale.og);

  // Every SVG in the current site is decorative; its title must not enter the accessibility tree.
  $('svg').attr('aria-hidden', 'true').attr('focusable', 'false');
  $('svg title').remove();
  // Language choices already point at their own locale and must stay as rendered.
  $('[href]:not([data-language]),form[action]').each((_, node) => {
    for (const attr of ['href', 'action']) {
      const value = $(node).attr(attr);
      if (ROUTES.includes(value)) $(node).attr(attr, localizedPath(value, code));
    }
  });
  for (const other of LOCALES) {
    $('head').append(`<link rel="alternate" hreflang="${other.lang}" href="${localizedPath(path, other.code)}" data-localized-meta>`);
  }
  $('head').append(`<link rel="alternate" hreflang="x-default" href="${path}" data-localized-meta>`);
  $('head').append('<script src="/assets/js/i18n-preference.js"></script>');
  function walk(node) {
    if (node.type === 'text') {
      // H2 and language names: [data-i18n-skip] marks the nine-language opening and native names.
      if (!['script', 'style'].includes(node.parent?.name) && !$(node.parent).closest('[data-i18n-skip]').length) {
        node.data = translate(node.data, code);
        if (node.data.trim().includes('\n')) $(node.parent).addClass('copy-multiline');
      }
    } else if (node.children) node.children.forEach(walk);
  }
  walk($.root()[0]);
  $('[alt],[placeholder],[aria-label],[title],input[type=submit]').each((_, node) => {
    for (const attr of ['alt', 'placeholder', 'aria-label', 'title', ...(node.name === 'input' && node.attribs.type === 'submit' ? ['value'] : [])]) {
      const value = $(node).attr(attr);
      if (value) $(node).attr(attr, translate(value, code));
    }
  });
  $(TEXT_META).each((_, node) => $(node).attr('content', translate($(node).attr('content'), code)));
  return $.html();
}

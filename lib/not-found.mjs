import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { LOCALES } from './i18n.mjs';

// Pages serves this single file at arbitrary missing URLs. Keep every language
// local so selecting the requested locale never needs another network request.
export function writeNotFoundFallback(output) {
  const $ = load(fs.readFileSync(path.join(output, '404/index.html'), 'utf8'));
  $('html').attr('data-not-found-fallback', '');
  for (const locale of LOCALES.filter(locale => locale.code !== 'en')) {
    const translated = load(fs.readFileSync(path.join(output, locale.code, '404/index.html'), 'utf8'));
    const template = $('<template>' + translated('body').html() + '</template>').attr({
      'data-not-found-locale': locale.code,
      'data-lang': locale.lang,
      'data-title': translated('title').text(),
      'data-description': translated('meta[name=description]').attr('content'),
      'data-og-locale': locale.og,
    });
    $('body').append(template);
  }
  fs.writeFileSync(path.join(output, '404.html'), $.html());
}

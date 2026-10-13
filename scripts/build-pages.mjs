#!/usr/bin/env node
// Keep local root-path builds intact; publish only the checked website output.
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { ROUTES, LOCALES, localizedPath } from '../lib/i18n.mjs';

const site = new URL(process.env.PAGES_URL || 'https://jack11111eee.github.io/bloom-into-you/');
if (!site.pathname.endsWith('/')) throw new Error('PAGES_URL must end with /');
const base = site.pathname.replace(/\/$/, '');
const routes = new Set(LOCALES.flatMap(l => ROUTES.map(p => localizedPath(p, l.code))));
const out = 'dist-pages';
const rooted = value => value.startsWith('/') && !value.startsWith('//');
function url(value) {
  if (!rooted(value)) return value;
  const [, pathname, suffix] = value.match(/^([^?#]*)(.*)$/);
  return base + pathname + (routes.has(pathname) && !pathname.endsWith('/') ? '/' : '') + suffix;
}
const css = text => text.replace(/url\((['"]?)(\/[^)'"\s]+)\1\)/g, (_, q, value) => `url(${q}${url(value)}${q})`);
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync('dist', out, { recursive: true });
let pages = 0;
for (const file of fs.readdirSync(out, { recursive: true })) {
  const dest = path.join(out, file);
  if (file.endsWith('.css')) fs.writeFileSync(dest, css(fs.readFileSync(dest, 'utf8')));
  if (!file.endsWith('.html')) continue;
  const $ = load(fs.readFileSync(dest, 'utf8'));
  $('html').attr('data-site-base', base);
  $('[href],[src],[action],[poster],[data-src],[data-background],[data-bg]').each((_, node) => {
    for (const attr of ['href', 'src', 'action', 'poster', 'data-src', 'data-background', 'data-bg']) {
      const value = $(node).attr(attr);
      if (value) $(node).attr(attr, url(value));
    }
  });
  $('[srcset],[data-srcset]').each((_, node) => {
    for (const attr of ['srcset', 'data-srcset']) {
      const value = $(node).attr(attr);
      if (value) $(node).attr(attr, value.replace(/(^|,\s*)(\/[^\s,]+)/g, (_, sep, value) => sep + url(value)));
    }
  });
  $('[style]').each((_, node) => $(node).attr('style', css($(node).attr('style'))));
  $('style').each((_, node) => $(node).text(css($(node).text())));
  $('link[rel=canonical],link[rel=alternate]').each((_, node) => $(node).attr('href', new URL($(node).attr('href'), site).href));
  $('meta[property="og:image"],meta[property="twitter:image"]').each((_, node) => $(node).attr('content', new URL(url($(node).attr('content')), site).href));
  fs.writeFileSync(dest, $.html());
  pages++;
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`PAGES BUILD: ${pages} pages for ${site.href} → ${out}/`);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { ROUTES, LOCALES, localizedPath } from '../lib/i18n.mjs';

const site = new URL(process.env.PAGES_URL || 'https://jack11111eee.github.io/bloom-into-you/');
const base = site.pathname.replace(/\/$/, '');
const root = path.resolve('dist-pages');
let references = 0;
function check(value, pageUrl) {
  if (!value || /^(#|mailto:|tel:|data:|javascript:)/i.test(value)) return;
  const target = new URL(value, pageUrl);
  if (target.origin !== site.origin) return;
  assert(target.pathname.startsWith(base + '/'), `Escaped project path: ${value}`);
  const file = path.join(root, decodeURIComponent(target.pathname.slice(base.length)));
  assert(file.startsWith(root + path.sep));
  const candidates = [file, path.join(file, 'index.html')];
  assert(candidates.some(p => fs.existsSync(p) && fs.statSync(p).isFile()), `Missing ${target.href}`);
  references++;
}
let pages = 0;
for (const locale of LOCALES) for (const route of ROUTES) {
  const logical = localizedPath(route, locale.code);
  const relative = logical.replace(/^\//, '') + (logical.endsWith('/') ? '' : '/') + 'index.html';
  const $ = load(fs.readFileSync(path.join(root, relative), 'utf8'));
  const original = load(fs.readFileSync(path.join('dist', relative), 'utf8'));
  const pageUrl = new URL(base + logical + (logical.endsWith('/') ? '' : '/'), site);
  assert.equal($('html').attr('data-site-base'), base);
  assert.equal($('html').attr('lang'), locale.lang);
  assert.equal($('html').attr('data-path'), route);
  assert.equal($('body').text(), original('body').text(), `Changed copy: ${logical}`);
  assert.equal($('link[rel=canonical]').attr('href'), pageUrl.href);
  assert.equal($('a[data-language]').length, 8);
  $('a[data-language]').each((_, node) => {
    const code = $(node).attr('data-language');
    const expected = base + localizedPath(route, code);
    assert.equal($(node).attr('href'), expected + (expected.endsWith('/') ? '' : '/'));
  });
  $('[href],[src],[action],[poster],[data-src],[data-background]').each((_, node) => {
    for (const attr of ['href', 'src', 'action', 'poster', 'data-src', 'data-background']) check($(node).attr(attr), pageUrl);
  });
  $('[srcset],[data-srcset]').each((_, node) => {
    for (const attr of ['srcset', 'data-srcset']) for (const item of ($(node).attr(attr) || '').split(',')) check(item.trim().split(/\s+/)[0], pageUrl);
  });
  const styles = $('style').text() + $('[style]').map((_, node) => $(node).attr('style')).get().join('\n');
  for (const match of styles.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) check(match[1], pageUrl);
  $('meta[property="og:image"],meta[property="twitter:image"]').each((_, node) => check($(node).attr('content'), pageUrl));
  pages++;
}
for (const file of fs.readdirSync(root, { recursive: true })) {
  assert(!/^(docs|reference|baselines|scripts|node_modules)(\/|$)/.test(file), `Non-site file: ${file}`);
  if (!file.endsWith('.css')) continue;
  for (const match of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) check(match[1], new URL(file, site));
}
assert.equal(pages, ROUTES.length * LOCALES.length);
console.log(`PAGES CHECK PASS: ${pages} pages, ${references} references, unchanged copy, four-language routes and metadata`);

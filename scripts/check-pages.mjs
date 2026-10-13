#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { ROUTES, LOCALES, localizedPath } from '../lib/i18n.mjs';
import { validatePublishedRights } from '../lib/rights.mjs';

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
  $('[href],[src],[action],[poster],[data-src],[data-background],[data-bg]').each((_, node) => {
    for (const attr of ['href', 'src', 'action', 'poster', 'data-src', 'data-background', 'data-bg']) check($(node).attr(attr), pageUrl);
  });
  $('[srcset],[data-srcset]').each((_, node) => {
    for (const attr of ['srcset', 'data-srcset']) for (const item of ($(node).attr(attr) || '').split(',')) check(item.trim().split(/\s+/)[0], pageUrl);
  });
  const styles = $('style').text() + $('[style]').map((_, node) => $(node).attr('style')).get().join('\n');
  for (const match of styles.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) check(match[1], pageUrl);
  $('meta[property="og:image"],meta[property="twitter:image"]').each((_, node) => check($(node).attr('content'), pageUrl));
  for (const selector of ['meta[property="og:image"]', 'meta[property="twitter:image"]']) {
    assert.equal($(selector).attr('content'), new URL(`${base}/assets/img/share-card.png`, site).href,
      `${logical}: expected original share artwork`);
  }
  assert.equal($('.nav-bar .credit').text().includes('©'), false, `${logical}: ambiguous work copyright mark`);
  pages++;
}
for (const file of fs.readdirSync(root, { recursive: true })) {
  assert(!/^(docs|reference|baselines|scripts|node_modules)(\/|$)/.test(file), `Non-site file: ${file}`);
  if (!file.endsWith('.css')) continue;
  for (const match of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) check(match[1], new URL(file, site));
}
assert.equal(pages, ROUTES.length * LOCALES.length);
// Public copies must carry the complete notices, not just a license URL in a header.
const licenses = JSON.parse(fs.readFileSync('src/assets/licenses/manifest.json', 'utf8'));
for (const entry of licenses.entries) {
  for (const output of ['dist', 'dist-pages']) {
    const file = path.join(output, entry.file);
    const bytes = fs.readFileSync(file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `Changed/missing license: ${file}`);
  }
}
for (const output of ['dist', 'dist-pages']) {
  assert.equal(fs.readFileSync(path.join(output, 'assets/licenses/THIRD_PARTY_NOTICES.md'), 'utf8'),
    fs.readFileSync('THIRD_PARTY_NOTICES.md', 'utf8'), `${output}: missing rights boundaries`);
  for (const file of [
    'media/site/89d468b455-1646837228/meta-image-bloom-into-you-860x540-crop-q72.jpg',
    'media/pages/about/d289927735-1646837228/meta-about-860x540-crop-q72.jpg',
  ]) assert(!fs.existsSync(path.join(output, file)), `${output}: obsolete third-party share copy ${file}`);
}
console.log(`PAGES CHECK PASS: ${pages} pages, ${references} references, unchanged copy, four-language routes and metadata`);
console.log(`LICENSE CHECK PASS: ${licenses.entries.length} complete license/notice copies and rights boundaries in both outputs`);
console.log(`RIGHTS CHECK PASS: ${validatePublishedRights(root, process.cwd(), site.origin)} registered resources; local runtime, inactive form, pinned vendor bodies and withdrawal checks`);

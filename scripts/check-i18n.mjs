#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { LOCALES, ROUTES, localizedPath, catalogFor, meaningfulText, translate } from '../lib/i18n.mjs';
const fails = [];
const assert = (condition, message) => { if (!condition) fails.push(message); };
const fileFor = route => path.join('dist', route, 'index.html');
const assetSignature = $ => $('img,source,[style]').map((_, node) => ({tag:node.name,...Object.fromEntries(Object.entries(node.attribs).filter(([key]) => ['src','data-src','srcset','sizes','width','height','style'].includes(key)))})).get();
const source = JSON.parse(fs.readFileSync('docs/i18n/source.json', 'utf8'));
const essay = JSON.parse(fs.readFileSync('src/_data/aboutEssay.json', 'utf8'));
assert(JSON.stringify(Object.keys(source).sort()) === JSON.stringify(Object.keys(catalogFor('en')).sort()), 'English catalog/source keys differ');
try { translate('Unregistered wording must stop a build', 'en'); fails.push('Missing source text was silently accepted'); } catch (error) { assert(error.message.includes('Unregistered text'), 'Wrong missing-text error'); }
let checked = 0;
for (const locale of LOCALES) {
  const catalog = catalogFor(locale.code);
  const allowed = new Set(Object.values(catalog).map(s=>s.trim()));
  // H4: four user-authored fan asides explicitly retain their style markers.
  const styleAsides = new Set(['Recognition, Choice', 'Attention', 'A direction to choose', 'Confession'].map(k=>catalog[k]));
  // H5: only these three essay fields may retain the author's four fan tokens.
  const essayAsides = new Set([2,4,5].map(i=>catalog[essay.paragraphs[i][0].text]));
  for (const route of ROUTES) {
    const url = localizedPath(route, locale.code);
    const file = fileFor(url);
    assert(fs.existsSync(file), `Missing page ${url}`);
    if (!fs.existsSync(file)) continue;
    const $ = load(fs.readFileSync(file, 'utf8'));
    checked++;
    assert($('html').attr('lang') === locale.lang, `${url}: wrong lang`);
    assert($('html').attr('data-locale') === locale.code, `${url}: wrong locale`);
    assert($('html').attr('data-path') === route, `${url}: wrong logical path`);
    assert($('link[rel=canonical]').attr('href') === url, `${url}: canonical mismatch`);
    assert($('link[rel=alternate]').length === 5, `${url}: missing alternate links`);
    for (const other of LOCALES) assert($(`link[hreflang="${other.lang}"]`).attr('href') === localizedPath(route, other.code), `${url}: alternate ${other.code} mismatch`);
    assert($('meta[property="og:locale"]').toArray().every(e=>e.attribs.content===locale.og), `${url}: og:locale mismatch`);
    const title = $('title').text();
    assert($('meta[property="og:title"]').attr('content') === title && $('meta[property="twitter:title"]').attr('content') === title, `${url}: title mismatch`);
    assert($('main[data-barba=container]').length === 1, `${url}: container count`);
    assert($('.loading-words h2').length === 22, `${url}: loader topology`);
    const opening = ['终将成为你', '終將成為妳', 'やがて君になる', 'Bloom Into You', '이윽고 네가 된다', 'Gdy zakwitnie w nas miłość', 'В конечном счёте я стану твоей', 'Θα γίνω τελικά εσύ', 'ท้ายที่สุดฉันจะกลายเป็นเธอ'];
    assert(JSON.stringify($('.loading-words > h2.home-active, .loading-words > h2.home-active-last').map((_,e)=>$(e).text().trim()).get()) === JSON.stringify(opening), `${url}: original multilingual home opening changed`);
    assert($('.language-row a').length === 4, `${url}: missing language choices`);
    $('a[data-language]').each((_, node) => {
      const code = node.attribs['data-language'];
      assert(node.attribs.href === localizedPath(route, code), `${url}: switch loses logical page`);
      assert(Object.hasOwn(node.attribs,'data-barba-prevent'), `${url}: cross-language Barba transition enabled`);
    });
    $('a[href],link[rel=canonical],form[action]').each((_,node) => {
      const href = node.attribs.href || node.attribs.action;
      if (!href.startsWith('/') || href.startsWith('/assets/') || href.startsWith('/media/')) return;
      assert(fs.existsSync(fileFor(href)), `${url}: broken internal link ${href}`);
      if (!node.attribs['data-language']) assert(locale.code === 'en' ? !/^\/(zh-cn|zh-tw|ja)(\/|$)/.test(href) : href.startsWith('/'+locale.code+'/'), `${url}: mixed route ${href}`);
    });
    const values = [];
    function walk(node) {
      if(node.type==='text') {
        if(!['style','script'].includes(node.parent?.name) && !$(node.parent).hasClass('locale-code') && !$(node.parent).closest('.loading-words > h2.home-active, .loading-words > h2.home-active-last').length) values.push(node.data.trim());
      } else if(node.children) node.children.forEach(walk);
    }
    walk($.root()[0]);
    $('[alt],[placeholder],[aria-label],[title],input[type=submit]').each((_,node)=>{
      for(const attr of ['alt','placeholder','aria-label','title',...(node.attribs.type==='submit'?['value']:[])])if(node.attribs[attr])values.push(node.attribs[attr].trim());
    });
    $('meta[name=description],meta[property="og:title"],meta[property="og:description"],meta[property="og:site_name"],meta[property="twitter:title"],meta[property="twitter:description"]').each((_,node)=>values.push(node.attribs.content.trim()));
    for(const value of values.filter(meaningfulText)) {
      assert(allowed.has(value), `${url}: text absent from locale catalog: ${value}`);
      const languageText=essayAsides.has(value) ? value.replace(/\b(?:www|xp|he|ACG)\b/g, '') : styleAsides.has(value) ? value.replace(/(?:www|ing|T-T)$/, '') : value;
      assert(locale.code === 'en' ? !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Cyrillic}\p{Script=Greek}]/u.test(value) : !/[A-Za-z]/.test(languageText.replace(/[^\s@]+@[^\s@]+\.[^\s@。]+/g, '')), `${url}: foreign-language residue: ${value}`);
    }
    assert($('svg:not([aria-hidden=true])').length === 0 && $('svg title').length===0, `${url}: decorative SVG exposes title`);
    const english = load(fs.readFileSync(fileFor(route),'utf8'));
    assert(JSON.stringify(assetSignature($))===JSON.stringify(assetSignature(english)), `${url}: shared assets or framing changed`);
    assert($('.count-nr').text()===english('.count-nr').text(), `${url}: derived footer counts changed`);
  }
}
assert(checked === 44, `Expected 44 checked pages, got ${checked}`);
if (fails.length) { console.error(fails.join('\n')); console.error(`I18N FAIL: ${fails.length} findings`); process.exitCode=1; }
else console.log('I18N PASS: 44 pages, catalogs, language purity, metadata, routes, switches, shared media/framing and counts');

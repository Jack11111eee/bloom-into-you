#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { LOCALES, ROUTES, localizedPath, catalogFor, meaningfulText, translate } from '../lib/i18n.mjs';
const fails = [];
const assert = (condition, message) => { if (!condition) fails.push(message); };
const fileFor = route => path.join('dist', route, 'index.html');
const assetSignature = $ => $('img,source,[style]').map((_, node) => ({tag:node.name,...Object.fromEntries(Object.entries(node.attribs).filter(([key]) => ['src','data-src','srcset','sizes','width','height','style'].includes(key)))})).get();
const essay = JSON.parse(fs.readFileSync('src/_data/aboutEssay.json', 'utf8'));
const copyright = JSON.parse(fs.readFileSync('src/_data/copyright.json', 'utf8'));
const site = JSON.parse(fs.readFileSync('src/_data/site.json', 'utf8'));
const quotationSources = JSON.parse(fs.readFileSync('src/_data/quotationSources.json', 'utf8'));
const privacy = JSON.parse(fs.readFileSync('src/_data/privacy.json', 'utf8'));
const contentLicense = JSON.parse(fs.readFileSync('src/_data/contentLicense.json', 'utf8'));
const imageSources = JSON.parse(fs.readFileSync('src/_data/imageSources.json', 'utf8'));
const imageSourceEntries = imageSources.groups.flatMap(group => group.entries);
const imageSourceIds = new Set(imageSourceEntries.map(entry => entry.id));
// H11: remove only the owner's exact work/publisher identifiers from the
// language-purity check, and only in their registered declaration fields.
const rightsKeys = ['footerIntro', 'intro', 'affiliation', 'mangaCredit', 'animeCredit'].map(key => copyright[key]);
// The current catalogs are the build inputs; historical drafts are local-only.
for (const locale of LOCALES) catalogFor(locale.code);
try { translate('Unregistered wording must stop a build', 'en'); fails.push('Missing source text was silently accepted'); } catch (error) { assert(error.message.includes('Unregistered text'), 'Wrong missing-text error'); }
let checked = 0;
for (const locale of LOCALES) {
  const catalog = catalogFor(locale.code);
  const allowed = new Set(Object.values(catalog).map(s=>s.trim()));
  // H4: four user-authored fan asides explicitly retain their style markers.
  const styleAsides = new Set(['Recognition, Choice', 'Attention', 'A direction to choose', 'Confession'].map(k=>catalog[k]));
  // H5: only these three essay fields may retain the author's four fan tokens.
  const essayAsides = new Set([2,4,5].flatMap(i=>essay.paragraphs[i].map(part=>catalog[part.text])));
  const rightsFields = new Set(rightsKeys.map(key => catalog[key]));
  const privacyNameFields = new Set(privacy.properNameFields.map(key => catalog[key]));
  assert(catalog[copyright.animeCredit] === '©2018 仲谷 鳰／ＫＡＤＯＫＡＷＡ／やがて君になる製作委員会', `${locale.code}: official anime credit changed`);
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
    assert($('.loading-words h2').length === site.loaderWords.length, `${url}: loader topology`);
    assert($('.footer-legal').length === 1, `${url}: missing shared copyright notice`);
    assert($('.footer-legal a').eq(0).attr('href') === localizedPath('/copyright/', locale.code), `${url}: wrong copyright link`);
    assert($('.footer-legal a').eq(1).attr('href') === localizedPath('/contact', locale.code), `${url}: lost contact link`);
    assert($('.footer-legal a').last().attr('href') === localizedPath('/privacy/', locale.code), `${url}: missing privacy link`);
    assert($('.footer-legal a').toArray().every(node => node.attribs.href !== localizedPath('/image-sources/', locale.code)), `${url}: source index must not be linked in ordinary footers`);
    assert($('.footer-legal .copyright-credit[lang=ja]').text() === copyright.animeCredit, `${url}: wrong footer anime credit`);
    assert($('.footer-legal > p').eq(0).text() === catalog[copyright.footerIntro], `${url}: altered short notice`);
    assert($('.footer-legal > p').eq(2).text() === Object.values(copyright.footerLinks).map(key => catalog[key]).join(''), `${url}: altered legal/contact wording`);
    if (route === '/copyright/') {
      assert($('h1').text() === catalog[copyright.title], `${url}: wrong copyright heading`);
      const paragraphs = ['intro', 'affiliation', 'materials', 'permission', 'respect', 'request', 'emailLabel', 'response', 'corrections', 'thanks'].map(key => catalog[copyright[key]] + (key === 'emailLabel' ? ' ' + site.contact.email : ''));
      assert(JSON.stringify($('.copyright-reading p').map((_, node) => $(node).text()).get()) === JSON.stringify(paragraphs), `${url}: full notice changed or omitted`);
      assert($('.copyright-reading .copyright-credit[lang=ja]').text() === copyright.animeCredit, `${url}: wrong full-page anime credit`);
      assert($('.content-license-reading').length === 1, `${url}: missing scoped content licence`);
      assert($('.content-license-reading .license-identifier').text() === contentLicense.identifier, `${url}: wrong content licence identifier`);
      assert($('.content-license-reading .license-identifier').attr('href') === contentLicense.legalUrl, `${url}: wrong CC terms link`);
      assert($('.content-license-reading a').last().attr('href') === '/assets/licenses/CONTENT-LICENSING.md', `${url}: missing article scope and exclusions`);
      assert($('.rights-reading > p').last().find('a').attr('href') === localizedPath('/image-sources/', locale.code), `${url}: source index must be at the bottom of the copyright page`);
    }
    if (route === '/image-sources/') {
      assert($('.image-source-entry').length === imageSourceEntries.length, `${url}: source entry count mismatch`);
      for (const entry of imageSourceEntries) {
        const item = $(`.image-source-entry[data-source-id="${entry.id}"]`);
        assert(item.find('.image-source-id').text() === entry.id, `${url}: wrong source identifier`);
        assert(item.find('.site-image-link').attr('href') === entry.asset, `${url}: wrong local image`);
        assert(JSON.stringify(item.find('.source-page-link').map((_, node) => node.attribs.href).get()) === JSON.stringify([entry.sourcePage, ...entry.additionalPages]), `${url}: wrong source-page references`);
        assert(item.find('a').toArray().every(node => node.attribs.target === '_blank' && node.attribs.rel === 'noopener noreferrer' && Object.hasOwn(node.attribs, 'data-barba-prevent')), `${url}: unsafe image reference navigation`);
      }
    }
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
      let languageText=essayAsides.has(value) ? value.replace(/\b(?:www|xp|he|ACG)\b/g, '') : styleAsides.has(value) ? value.replace(/(?:www|ing|T-T)$/, '') : value;
      if (rightsFields.has(value)) languageText = languageText.replace(copyright.animeCredit, '').replaceAll('やがて君になる', '').replaceAll('Bloom Into You', '').replaceAll('KADOKAWA', '');
      // Keep this single registered bibliographic citation in its original script.
      if (value === catalog[quotationSources.englishCitation]) languageText = '';
      if (privacyNameFields.has(value)) languageText = languageText.replaceAll('GitHub Pages', '');
      if (value === catalog[contentLicense.identifier]) languageText = '';
      // Only registered image identifiers on this page retain their literal spelling.
      if (route === '/image-sources/' && imageSourceIds.has(value)) languageText = '';
      assert(locale.code === 'en' ? !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Cyrillic}\p{Script=Greek}]/u.test(languageText) : !/[A-Za-z]/.test(languageText.replace(/[^\s@]+@[^\s@]+\.[^\s@。]+/g, '')), `${url}: foreign-language residue: ${value}`);
    }
    assert($('svg:not([aria-hidden=true])').length === 0 && $('svg title').length===0, `${url}: decorative SVG exposes title`);
    const english = load(fs.readFileSync(fileFor(route),'utf8'));
    assert(JSON.stringify(assetSignature($))===JSON.stringify(assetSignature(english)), `${url}: shared assets or framing changed`);
    assert($('.count-nr').text()===english('.count-nr').text(), `${url}: derived footer counts changed`);
  }
}
const expectedPages = ROUTES.length * LOCALES.length;
assert(checked === expectedPages, `Expected ${expectedPages} checked pages, got ${checked}`);
if (fails.length) { console.error(fails.join('\n')); console.error(`I18N FAIL: ${fails.length} findings`); process.exitCode=1; }
else console.log(`I18N PASS: ${checked} pages, catalogs, language purity, metadata, routes, switches, copyright notices, shared media/framing and counts`);

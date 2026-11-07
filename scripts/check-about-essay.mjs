#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { LOCALES, localizedPath, catalogFor } from '../lib/i18n.mjs';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=json('src/_data/aboutEssay.json');
const quotationSources=json('src/_data/quotationSources.json');
const keys=[data.title,...data.paragraphs.flat().map(p=>p.text)];
assert.equal(keys.length,15);
for(const locale of LOCALES){
 const $=load(fs.readFileSync('dist'+localizedPath('/about',locale.code)+'/index.html','utf8'));
 const catalog=catalogFor(locale.code);
 keys.forEach(key=>assert.equal(typeof catalog[key],'string',`${locale.code}: missing essay text ${key}`));
 assert.equal($('.about-essay h2').text(),catalog[data.title]);
 const paragraphs=$('.about-essay p').map((_,e)=>$(e).text()).get();
 assert.equal(paragraphs.length,10);
 assert.deepEqual(paragraphs,data.paragraphs.map(p=>p.map(part=>catalog[part.text]).join('')));
 assert.equal($('.about-essay strong').length,2);
 assert.deepEqual($('.about-essay strong').map((_,e)=>$(e).text()).get(),data.paragraphs.flat().filter(p=>p.emphasis).map(p=>catalog[p.text]));
 assert.equal($('.about-essay [data-reveal]').length,0);
 assert($('.about-essay').prev().hasClass('about-story'));
 assert($('.about-essay').next().hasClass('about-scope'));
 assert.equal($('.quotation-source a').text(),catalog[quotationSources.englishCitation]);
 assert.equal($('.quotation-source a').attr('href'),quotationSources.englishUrl);
 assert.equal($('.quotation-source a').attr('data-barba-prevent'),'');
}
console.log('ABOUT ESSAY PASS: current source and catalogs, 9 paragraphs + dated sign-off, 2 emphases, 15 fields in four locales, section placement');

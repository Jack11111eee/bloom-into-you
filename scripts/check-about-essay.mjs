#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { LOCALES, localizedPath, catalogFor } from '../lib/i18n.mjs';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const source=fs.readFileSync('docs/about-essay/source-zh-cn.md','utf8').trim().split(/\n\s*\n/);
assert.equal(source.length,11);assert(!source.join('').includes('视弱'));
const data=json('src/_data/aboutEssay.json');
const keys=[data.title,...data.paragraphs.flat().map(p=>p.text)];
assert.equal(keys.length,13);
for(const locale of LOCALES){
 const $=load(fs.readFileSync('dist'+localizedPath('/about',locale.code)+'/index.html','utf8'));
 const drafts=json(`docs/about-essay/${locale.code}.json`),catalog=catalogFor(locale.code);
 assert.equal(Object.keys(catalog).length,201);
 keys.forEach((key,i)=>assert.equal(catalog[key],drafts[i]));
 assert.equal($('.about-essay h2').text(),drafts[0]);
 const paragraphs=$('.about-essay p').map((_,e)=>$(e).text()).get();
 assert.equal(paragraphs.length,10);
 assert.deepEqual(paragraphs,data.paragraphs.map(p=>p.map(part=>catalog[part.text]).join('')));
 assert.equal($('.about-essay strong').length,1);
 assert.equal($('.about-essay strong').text(),drafts[6]);
 assert.equal($('.about-essay .animate,.about-essay .fade-in').length,0);
 assert($('.about-essay').prev().hasClass('about-image'));
 assert($('.about-essay').next().hasClass('about-services'));
 if(locale.code==='zh-cn'){
  assert.equal($('.about-essay h2').text(),source[0].replace(/^# /,''));
  assert.deepEqual(paragraphs,source.slice(1).map(s=>s.replaceAll('**','')));
  assert.equal($('.about-essay strong').text(),source[5].match(/\*\*(.*?)\*\*/)[1]);
 }
}
console.log('ABOUT ESSAY PASS: verbatim Chinese source, 9 paragraphs + dated sign-off, 1 emphasis, 13 new fields in four locales, section placement');

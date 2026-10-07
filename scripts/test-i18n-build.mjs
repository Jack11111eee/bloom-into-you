#!/usr/bin/env node
// Exercise missing translations and repeated builds in an isolated fixture, never in site data.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Eleventy from '@11ty/eleventy';
import { LOCALES } from '../lib/i18n.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'bloom-i18n-build-'));
try {
 fs.mkdirSync(path.join(root,'lib'));fs.copyFileSync('lib/i18n.mjs',path.join(root,'lib/i18n.mjs'));
 fs.symlinkSync(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
 fs.mkdirSync(path.join(root,'src/_data/translations'),{recursive:true});
 for(const name of ['site','pages','characters','insights'])fs.copyFileSync(`src/_data/${name}.json`,path.join(root,`src/_data/${name}.json`));
 for(const locale of LOCALES)fs.copyFileSync(`src/_data/translations/${locale.code}.json`,path.join(root,`src/_data/translations/${locale.code}.json`));
 const module=await import(pathToFileURL(path.join(root,'lib/i18n.mjs')));
 const config=path.join(root,'eleventy.config.mjs');
 fs.writeFileSync(config,`import { localizeHtml, clearCatalogCache } from './lib/i18n.mjs';\nexport default function(config){config.on('eleventy.before',clearCatalogCache);config.addTransform('localize',content=>localizeHtml(content));return {templateFormats:['html']};}`);
 fs.mkdirSync(path.join(root,'input'));
 fs.writeFileSync(path.join(root,'input/index.html'),'<!doctype html><html data-locale="zh-cn" data-path="/"><head><title>Home</title></head><body><p>Home</p></body></html>');
 const file=path.join(root,'src/_data/translations/zh-cn.json');
 const data=JSON.parse(fs.readFileSync(file));data.Home='首页甲';fs.writeFileSync(file,JSON.stringify(data));
 const engine=new Eleventy(path.join(root,'input'),path.join(root,'output'),{configPath:config,quietMode:true});
 await engine.write();if(!fs.readFileSync(path.join(root,'output/index.html'),'utf8').includes('首页甲'))throw Error('Initial build missed translation');
 data.Home='首页乙';fs.writeFileSync(file,JSON.stringify(data));await engine.write();
 if(!fs.readFileSync(path.join(root,'output/index.html'),'utf8').includes('首页乙'))throw Error('Repeated build used stale translation');
 delete data.Home;fs.writeFileSync(file,JSON.stringify(data));module.clearCatalogCache();
 let missing=false;try{module.catalogFor('zh-cn');}catch(e){missing=e.message.includes('missing Home');}if(!missing)throw Error('Missing translation accepted');
 data.Home='首页乙';data['Unregistered extra']='额外';fs.writeFileSync(file,JSON.stringify(data));module.clearCatalogCache();
 let extra=false;try{module.catalogFor('zh-cn');}catch(e){extra=e.message.includes('extra Unregistered extra');}if(!extra)throw Error('Extra translation accepted');
 console.log('I18N BUILD PASS: same-process rebuilding updates copy; missing/extra keys fail');
}finally{fs.rmSync(root,{recursive:true,force:true});}

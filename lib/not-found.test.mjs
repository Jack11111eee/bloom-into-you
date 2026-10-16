import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load } from 'cheerio';
import { writeNotFoundFallback } from './not-found.mjs';
import { LOCALES } from './i18n.mjs';

test('the fallback retains complete inert locale bodies and absolute project links', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-not-found-'));
  try {
    for (const locale of LOCALES) {
      const relative = locale.code === 'en' ? '' : '/' + locale.code;
      const file = path.join(directory, relative, '404/index.html');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `<!doctype html><html data-site-base="/project" lang="${locale.lang}"><head><title>${locale.name} &amp; 404</title><meta name="description" content="Missing &quot;page&quot; ${locale.code}"><meta name="robots" content="noindex, follow"></head><body><div id="not-found"><h1>${locale.code}</h1><a href="/project${relative}/">Home</a></div></body></html>`);
    }
    writeNotFoundFallback(directory);
    const first = fs.readFileSync(path.join(directory, '404.html'), 'utf8');
    const $ = load(first);
    assert.equal($('html').attr('data-site-base'), '/project');
    assert($('html').is('[data-not-found-fallback]'));
    assert.equal($('body > #not-found h1').text(), 'en');
    assert.equal($('template[data-not-found-locale]').length, 3);
    for (const locale of LOCALES.filter(locale => locale.code !== 'en')) {
      const template = $(`template[data-not-found-locale="${locale.code}"]`);
      const body = load(template.html());
      assert.equal(template.attr('data-title'), locale.name + ' & 404');
      assert.equal(template.attr('data-description'), 'Missing "page" ' + locale.code);
      assert.equal(body('#not-found h1').text(), locale.code);
      assert.equal(body('a').attr('href'), `/project/${locale.code}/`);
    }
    writeNotFoundFallback(directory);
    assert.equal(fs.readFileSync(path.join(directory, '404.html'), 'utf8'), first);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

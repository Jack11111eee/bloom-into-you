import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { LOCALES, catalogFor, localizedPath } from './i18n.mjs';

const music = JSON.parse(fs.readFileSync('src/_data/music.json', 'utf8'));
const source = catalogFor('zh-cn');
const hash = text => createHash('sha256').update(text).digest('hex');

test('the four Chinese stories retain the complete owner-supplied wording', () => {
  assert.deepEqual(music.tracks.map(track => track.title), ['君にふれて', 'hectopascal', '好き、以外の言葉で', 'rise']);
  assert.deepEqual(music.tracks.map(track => track.paragraphs.length), [19, 23, 25, 31]);
  music.tracks.forEach((track, index) => {
    const original = track.paragraphs.map(key => source[key]).join(index < 2 ? '\n\n' : '\n');
    assert.equal(hash(original), track.sourceSha256, track.id + ': original wording changed');
  });
});

test('every published locale contains every story, original artwork, and accessible reader', () => {
  for (const locale of LOCALES) {
    const catalog = catalogFor(locale.code);
    const route = localizedPath('/music/', locale.code);
    const $ = load(fs.readFileSync('dist' + route + 'index.html', 'utf8'));
    assert.equal($('h1').text().trim(), catalog['music.heading']);
    assert.equal($('.vr-song').length, 4);
    assert.equal($('audio,video,iframe').length, 0);
    assert.equal($('.vr-reader-body[tabindex="0"][role="region"]').length, 1);
    assert.equal($('.vr-return').text(), catalog['music.back']);
    for (const track of music.tracks) {
      assert.deepEqual($(`[data-story="${track.id}"] p`).map((_, el) => $(el).text()).get(), track.paragraphs.map(key => catalog[key]));
      assert.equal($(`[data-song="${track.id}"] img`).attr('src'), track.art);
      assert.equal($(`[data-song="${track.id}"]`).attr('aria-controls'), 'vr-reading-pane');
    }
    assert.equal($('.nav-bar .active a').attr('href'), route);
    const sources = load(fs.readFileSync('dist' + localizedPath('/image-sources/', locale.code) + 'index.html', 'utf8'));
    assert.equal(sources('.original-music-entry').length, 5);
    assert.equal(sources('.original-music-sources > p').text(), catalog['music.original.notice']);
    assert.equal($('.original-music-sources').length, 0);
  }
});

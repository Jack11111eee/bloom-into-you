import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCorpus, inspect, normalize, scan, baselineAvailable, BASELINE } from './originality.mjs';

const block = count => Array.from({ length: count }, (_, i) => `let item${i} = measure(${i});`).join('\n');

test('six shared meaningful lines fail while five pass', () => {
  const corpus = buildCorpus([['old.js', block(12)]]);
  assert.equal(inspect('six.js', block(6), corpus).failures.length, 1);
  assert.equal(inspect('five.js', block(5), corpus).failures.length, 0);
});

test('formatting, comments and lone braces do not hide a copy', () => {
  const source = ['a {', '  color: red;', '  margin: 0;', '}', 'b {', '  color: blue;', '  margin: 1px;', '}'].join('\n');
  const disguised = ['/* moved */', 'a{', 'color :  RED;', '', 'margin:0;', '}', 'b{color:blue;', 'margin: 1px;}'].join('\n');
  const corpus = buildCorpus([['old.css', source]]);
  assert.ok(normalize(disguised, 'new.css').length >= 6);
  assert.equal(inspect('new.css', disguised, corpus).failures.length > 0, true);
});

test('generated @font-face subsets are not compared as code', () => {
  const face = "@font-face {\n  font-family: 'A';\n  src: url(a.woff2);\n  font-weight: 400;\n  font-style: normal;\n  font-display: swap;\n  unicode-range: U+41;\n}";
  assert.deepEqual(normalize(face, 'fonts.css'), []);
});

test('multi-line comments are ignored', () => {
  const text = ['/*', 'a', 'b', 'c', 'd', 'e', 'f', '*/', 'x { top: 0; }'].join('\n');
  assert.deepEqual(normalize(text).map(line => line.text), ['x{top:0;}']);
});

test('renamed copies are reported as shape warnings', () => {
  const old = Array.from({ length: 8 }, (_, i) => `const alpha${i} = beta(${i});`).join('\n');
  const renamed = Array.from({ length: 8 }, (_, i) => `const gamma${i} = delta(${i + 3});`).join('\n');
  const result = inspect('new.js', renamed, buildCorpus([['old.js', old]]));
  assert.equal(result.failures.length, 0);
  assert.equal(result.warnings.length, 1);
});

test('compressed stylesheets cannot evade the line rule', () => {
  const result = inspect('dense.css', '.a { top: 0; left: 0; }', buildCorpus([]));
  assert.match(result.failures[0], /more than one declaration/);
});

test('site code shares no six-line block with any code from the baseline', { skip: !baselineAvailable() && !process.env.CI && `baseline ${BASELINE} unavailable` }, () => {
  const report = scan();
  assert.deepEqual(report.failures, []);
});

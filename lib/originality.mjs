// Originality guard: site code must not share six consecutive meaningful lines
// with the reference-derived shell recorded at the baseline commit.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const BASELINE = '352831d';
export const WINDOW = 6;
export const SHAPE_WINDOW = 8;
export const MAX_LINE = 160;

// Files at the baseline that carried the reference-derived shell.
export const DERIVED = [
  'src/assets/css/style-new.css',
  'src/assets/css/styleguide.css',
  'src/assets/css/components.css',
  'src/assets/css/home-mobile.css',
  'src/assets/css/i18n.css',
  'src/assets/css/typography.css',
  'src/assets/js/index-new.js',
  'src/_includes/layouts/base.njk',
  ...['bottom-footer', 'case-intro-image', 'case-intro', 'case-top', 'chrome', 'cursor', 'fixed-nav',
    'footer-case', 'footer-contact', 'footer', 'footer-rounded', 'hamburger', 'head', 'icon-arrow',
    'icon-hanger', 'loader', 'nav-bar'].map(name => `src/_includes/partials/${name}.njk`),
  ...['device', 'dispatch', 'fullwidth', 'mobile-devices', 'pause', 'screenshot', 'reading']
    .map(name => `src/_includes/blocks/${name}.njk`),
  ...['index', 'about', 'characters', 'insights', 'gallery', 'contact', 'single'].map(name => `src/${name}.njk`),
];

// Owner-authored files that may move unchanged; edits here need review.
export const OWNER_ORIGINAL = new Set([
  'src/assets/js/music.js',
  'src/assets/js/not-found.js',
  'src/assets/js/i18n-preference.js',
  'src/assets/css/music.css',
  'src/assets/css/not-found.css',
  'src/assets/css/reading-fonts.css',
]);

const CODE = /\.(?:css|js|mjs|njk|html)$/;
const SKIPPED_DIRS = ['src/assets/vendor/', 'src/_data/', 'src/media/'];

function meaningful(raw) {
  const text = raw
    .replace(/\/\*.*?\*\/|<!--.*?-->|\{#.*?#\}/g, '')
    .replace(/(^|\s)\/\/.*$/, '$1')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}():;,>+~=])\s*/g, '$1')
    .toLowerCase();
  const trivial = /^[{}()[\];,]*$/.test(text)
    || /^<\/[a-z0-9-]+>$/.test(text)
    || /^\{%-?\s*(?:end\w*|else)\s*-?%\}$/.test(text);
  return trivial ? null : text;
}

// Stylesheets are compared statement by statement so re-wrapping cannot hide a copy.
const statements = text => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/([{};])/g, '$1\n');

export function normalize(text, name = '') {
  if (name.endsWith('.css')) text = statements(text);
  let inComment = false;
  const out = [];
  text.split('\n').forEach((line, index) => {
    let source = line;
    if (inComment) {
      const end = source.search(/\*\/|-->|#\}/);
      if (end < 0) return;
      source = source.slice(end + 2).replace(/^[>}]/, '');
      inComment = false;
    }
    const open = source.search(/\/\*(?!.*\*\/)|<!--(?!.*-->)|\{#(?!.*#\})/);
    if (open >= 0) {
      source = source.slice(0, open);
      inComment = true;
    }
    const kept = meaningful(source);
    if (kept) out.push({ line: index + 1, text: kept });
  });
  return out;
}

const shapeOf = text => text
  .replace(/(["'`]).*?\1/g, 's')
  .replace(/-?\d*\.?\d+(?:e-?\d+)?/g, 'n')
  .replace(/[a-z_$][\w$-]*/g, 'i');

function windows(lines, size, map = text => text) {
  const keys = [];
  for (let i = 0; i + size <= lines.length; i++) {
    keys.push({ line: lines[i].line, key: lines.slice(i, i + size).map(entry => map(entry.text)).join('\n') });
  }
  return keys;
}

export function readBaseline(file, repository = process.cwd()) {
  return execFileSync('git', ['show', `${BASELINE}:${file}`], { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

export function baselineAvailable(repository = process.cwd()) {
  try {
    execFileSync('git', ['cat-file', '-e', `${BASELINE}^{commit}`], { cwd: repository, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function buildCorpus(sources) {
  const exact = new Map();
  const shape = new Map();
  for (const [name, text] of sources) {
    const lines = normalize(text, name);
    for (const { line, key } of windows(lines, WINDOW)) if (!exact.has(key)) exact.set(key, `${name}:${line}`);
    for (const { line, key } of windows(lines, SHAPE_WINDOW, shapeOf)) if (!shape.has(key)) shape.set(key, `${name}:${line}`);
  }
  return { exact, shape };
}

export function inspect(name, text, corpus) {
  const lines = normalize(text, name);
  const failures = [];
  const warnings = [];
  const seen = new Set();
  for (const { line, key } of windows(lines, WINDOW)) {
    if (corpus.exact.has(key)) failures.push(`${name}:${line} repeats ${corpus.exact.get(key)}`);
    else if (seen.has(key)) warnings.push(`${name}:${line} repeats an earlier block in the same file`);
    seen.add(key);
  }
  for (const { line, key } of windows(lines, SHAPE_WINDOW, shapeOf)) {
    if (corpus.shape.has(key)) warnings.push(`${name}:${line} has the same shape as ${corpus.shape.get(key)}`);
  }
  text.split('\n').forEach((raw, index) => {
    if (raw.length > MAX_LINE && !/unicode-range|^\s*(?:<p>|"|<svg|<path)|\{\{.*\}\}|https?:/.test(raw)) {
      failures.push(`${name}:${index + 1} exceeds ${MAX_LINE} characters`);
    }
    if (name.endsWith('.css') && /;\s*[a-z-]+\s*:[^;]+;/.test(raw.replace(/url\([^)]*\)/g, '')) && !/@font-face/.test(raw)) {
      failures.push(`${name}:${index + 1} holds more than one declaration`);
    }
  });
  return { failures, warnings };
}

function siteFiles(repository) {
  const root = path.join(repository, 'src');
  return fs.readdirSync(root, { recursive: true })
    .map(file => path.posix.join('src', file.split(path.sep).join('/')))
    .filter(file => CODE.test(file) && !file.endsWith('.min.js') && !SKIPPED_DIRS.some(dir => file.startsWith(dir)))
    .filter(file => fs.statSync(path.join(repository, file)).isFile())
    .sort();
}

function unchangedSinceBaseline(file, text, repository) {
  try {
    return readBaseline(file, repository) === text;
  } catch {
    return false;
  }
}

export function scan({ repository = process.cwd(), strict = false, extraCorpus = [] } = {}) {
  const baseline = new Map(DERIVED.map(file => [file, readBaseline(file, repository)]));
  const corpus = buildCorpus([...baseline, ...extraCorpus]);
  const report = { failures: [], warnings: [], pending: [], checked: 0 };
  for (const file of siteFiles(repository)) {
    const text = fs.readFileSync(path.join(repository, file), 'utf8');
    if (baseline.get(file) === text) {
      report.pending.push(file);
      continue;
    }
    if (OWNER_ORIGINAL.has(file) || unchangedSinceBaseline(file, text, repository)) continue;
    const result = inspect(file, text, corpus);
    report.failures.push(...result.failures);
    report.warnings.push(...result.warnings);
    report.checked++;
  }
  if (strict) report.failures.push(...report.pending.map(file => `${file} is an unchanged reference-derived file`));
  return report;
}

export function referenceCorpus(repository = process.cwd()) {
  const root = path.join(repository, 'reference');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { recursive: true })
    .filter(file => /\.(?:css|js|html)$/.test(file) && !/\.min\./.test(file))
    .map(file => [`reference/${file}`, fs.readFileSync(path.join(root, file), 'utf8')]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const extraCorpus = process.argv.includes('--with-reference') ? referenceCorpus() : [];
  const report = scan({ strict, extraCorpus });
  for (const warning of report.warnings) console.warn(`WARN ${warning}`);
  for (const failure of report.failures) console.error(`FAIL ${failure}`);
  console.log(`ORIGINALITY: ${report.checked} checked, ${report.pending.length} legacy pending, ${report.failures.length} failures`);
  if (report.failures.length) process.exitCode = 1;
}

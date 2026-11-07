// Originality guard: site code must not share six consecutive meaningful lines
// with any site code recorded at the baseline commit, before the rewrite.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const BASELINE = '352831d';
export const WINDOW = 6;
export const SHAPE_WINDOW = 8;
export const MAX_LINE = 160;

const CODE = /\.(?:css|js|mjs|njk|html)$/;
// Third-party libraries and media are not site code; content lives in JSON.
const outsideSiteCode = file => !CODE.test(file)
  || file.endsWith('.min.js')
  || ['src/assets/vendor/', 'src/media/'].some(dir => file.startsWith(dir));

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
// @font-face blocks are generated subset data (font, range), not authored code.
const statements = text => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/@font-face\s*\{[^}]*\}/g, '')
  .replace(/([{};])/g, '$1\n');

// Templates are compared tag by tag so joining markup onto one line cannot hide a copy.
const tags = text => text.replace(/>\s*</g, '>\n<');

export function normalize(text, name = '') {
  if (name.endsWith('.css')) text = statements(text);
  if (/\.(?:njk|html)$/.test(name)) text = tags(text);
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
  // Declaration lists all share one shape, so structural comparison covers scripts and markup.
  const shapes = name.endsWith('.css') ? [] : windows(lines, SHAPE_WINDOW, shapeOf);
  for (const { line, key } of shapes) {
    if (corpus.shape.has(key)) warnings.push(`${name}:${line} has the same shape as ${corpus.shape.get(key)}`);
  }
  text.split('\n').forEach((raw, index) => {
    if (/\.(?:css|js|mjs)$/.test(name) && raw.length > MAX_LINE && !/unicode-range|https?:/.test(raw)) {
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
    .filter(file => !outsideSiteCode(file) && fs.statSync(path.join(repository, file)).isFile())
    .sort();
}

export function baselineFiles(repository = process.cwd()) {
  return execFileSync('git', ['ls-tree', '-r', '--name-only', BASELINE, 'src'], { cwd: repository, encoding: 'utf8' })
    .split('\n')
    .filter(file => file && !outsideSiteCode(file));
}

export function scan({ repository = process.cwd(), extraCorpus = [] } = {}) {
  const baseline = baselineFiles(repository).map(file => [file, readBaseline(file, repository)]);
  const corpus = buildCorpus([...baseline, ...extraCorpus]);
  const report = { failures: [], warnings: [], checked: 0 };
  for (const file of siteFiles(repository)) {
    const result = inspect(file, fs.readFileSync(path.join(repository, file), 'utf8'), corpus);
    report.failures.push(...result.failures);
    report.warnings.push(...result.warnings);
    report.checked++;
  }
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
  const extraCorpus = process.argv.includes('--with-reference') ? referenceCorpus() : [];
  const report = scan({ extraCorpus });
  for (const warning of report.warnings) console.warn(`WARN ${warning}`);
  for (const failure of report.failures) console.error(`FAIL ${failure}`);
  console.log(`ORIGINALITY: ${report.checked} files checked against ${BASELINE}, ${report.failures.length} failures`);
  if (report.failures.length) process.exitCode = 1;
}

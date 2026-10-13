import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const mediaRoots = ['src/media', 'src/assets/img', 'src/assets/fonts'];
const mediaTypes = /\.(?:jpe?g|png|webp|gif|svg|avif|ico|mp4|webm|woff2?|otf|ttf)$/i;
const approvedBases = new Set(['original', 'license', 'quotation']);
const validDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
  Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
function filesBelow(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { recursive: true })
    .map(file => path.join(root, file)).filter(file => fs.statSync(file).isFile());
}
export function policyDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
function reviewed(entry, day) {
  assert(approvedBases.has(entry.basis), `${entry.path}: missing original/license/quotation basis`);
  for (const key of ['author', 'source', 'scope', 'reviewedBy', 'reviewedOn']) {
    assert(typeof entry[key] === 'string' && entry[key].trim(), `${entry.path}: missing ${key}`);
  }
  assert(validDay(entry.reviewedOn) && entry.reviewedOn <= day, `${entry.path}: invalid review date`);
  if (entry.basis === 'license') assert(/^https:\/\//.test(entry.licenseUrl || ''), `${entry.path}: missing public license source`);
  if (entry.basis === 'quotation') {
    for (const key of ['commentary', 'necessaryExtent']) assert(entry[key]?.trim(), `${entry.path}: missing quotation review ${key}`);
  }
  if (entry.expiresOn) assert(validDay(entry.expiresOn) && entry.expiresOn >= day, `${entry.path}: expired or invalid permission`);
}

export function validateRightsSources(repository = process.cwd(), day = policyDay()) {
  const policy = read(path.join(repository, 'lib/rights-register.json'));
  const baseline = read(path.join(repository, 'lib/rights-baseline.json'));
  const seen = new Set();
  for (const entry of policy.assets) {
    assert(!seen.has(entry.path), `Duplicate rights record: ${entry.path}`);
    seen.add(entry.path);
    assert(mediaRoots.some(root => entry.path.startsWith(root + '/')) && !entry.path.includes('\\') && path.posix.normalize(entry.path) === entry.path && !entry.path.split('/').includes('..'), `Unsafe media path: ${entry.path}`);
    const file = path.join(repository, entry.path);
    assert(['legacy-unverified', 'approved', 'retired', 'suspended'].includes(entry.status), `${entry.path}: invalid rights status`);
    const withdrawn = ['retired', 'suspended'].includes(entry.status);
    assert(withdrawn || fs.existsSync(file), `Registered resource missing: ${entry.path}`);
    if (fs.existsSync(file)) assert.equal(digest(fs.readFileSync(file)), entry.sha256, `${entry.path}: changed media requires rights review`);
    if (entry.status === 'legacy-unverified') {
      assert.equal(baseline.assets[entry.path], entry.sha256, `${entry.path}: new/changed media cannot inherit legacy-unverified status`);
    } else if (entry.status === 'approved') reviewed(entry, day);
    else {
      assert(entry.reason?.trim(), `${entry.path}: missing withdrawal/suspension reason`);
      if (fs.existsSync(file) && baseline.assets[entry.path] !== entry.sha256) reviewed(entry, day);
    }
    if (entry.licenseFile) {
      assert(/^\/assets\/fonts\/[a-zA-Z0-9/_.-]+\.txt$/.test(entry.licenseFile) && !entry.licenseFile.includes('..'), `${entry.path}: unsafe license file`);
      assert(fs.existsSync(path.join(repository, 'src' + entry.licenseFile)), `${entry.path}: missing font license`);
    }
  }
  for (const directory of mediaRoots) for (const file of filesBelow(path.join(repository, directory))) {
    const relative = path.relative(repository, file).split(path.sep).join('/');
    if (mediaTypes.test(file)) assert(seen.has(relative), `Unregistered media: ${relative}`);
  }
  const runtime = fs.readFileSync(path.join(repository, 'src/assets/js/index-new.js'), 'utf8');
  assert(!/initTricksWords\s*\(|You have the license to use this code in your projects but not redistribute/i.test(runtime), 'Retired restricted word-splitting code returned');
  for (const vendor of read(path.join(repository, 'src/assets/vendor/manifest.json')).scripts) {
    assert(/^\/assets\/(?:vendor|js)\/[^/]+\.js$/.test(vendor.file) && !vendor.file.includes('..'), `Unsafe vendor path: ${vendor.file}`);
    const bytes = fs.readFileSync(path.join(repository, 'src' + vendor.file));
    assert.equal(digest(bytes), vendor.sha256, `Changed pinned vendor: ${vendor.file}`);
    assert.equal(digest(bytes.subarray(vendor.licenseHeaderBytes)), vendor.upstreamSha256, `Changed vendor runtime body: ${vendor.file}`);
    for (const notice of vendor.licenseFiles) {
      assert(/^\/assets\/licenses\/[^/]+\.txt$/.test(notice) && !notice.includes('..'), `Unsafe license path: ${notice}`);
      assert(fs.existsSync(path.join(repository, 'src' + notice)), `Missing vendor license: ${notice}`);
    }
  }
  return policy;
}

const automaticResources = 'script[src],link[rel=stylesheet],link[rel=preload],link[rel=modulepreload],link[rel=prefetch],link[rel=preconnect],link[rel=dns-prefetch],link[rel~=icon],link[rel=manifest],img,source,video,audio,iframe,object[data],embed[src],image[href],use[href],[data-src],[data-background],[data-srcset]';
const remote = value => /^(?:https?:)?\/\//i.test(value.trim());
export function assertLocalResources(html, label = 'page', allowedOrigin = null) {
  const $ = load(html);
  const check = value => {
    if (!value || !remote(value)) return;
    assert(allowedOrigin && new URL(value, allowedOrigin).origin === allowedOrigin, `${label}: automatic third-party resource ${value}`);
  };
  $(automaticResources).each((_, node) => {
    for (const attr of ['src', 'href', 'poster', 'data', 'data-src', 'data-background']) check(node.attribs[attr]);
    for (const attr of ['srcset', 'data-srcset']) for (const item of (node.attribs[attr] || '').split(',')) check(item.trim().split(/\s+/)[0]);
  });
  const styles = $('style').text() + $('[style]').map((_, node) => node.attribs.style).get().join('\n');
  for (const match of styles.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) check(match[1]);
  if ($('main').attr('data-barba-namespace') === 'contact') {
    assert.equal($('form').length, 0, `${label}: unavailable form must have no submit endpoint`);
    assert($('.form[data-form-unavailable]').length === 1, `${label}: missing unavailable form preview`);
    assert($('.form .field').toArray().every(node => Object.hasOwn(node.attribs, 'disabled')), `${label}: preview fields must stay disabled`);
    $('.form label[for]').each((_, node) => assert($(`[id="${node.attribs.for}"]`).length === 1, `${label}: broken input label`));
  }
}

export function validatePublishedRights(output, repository = process.cwd(), allowedOrigin = null) {
  const policy = validateRightsSources(repository);
  for (const entry of policy.assets) {
    const file = path.join(output, entry.path.slice(4));
    if (['retired', 'suspended'].includes(entry.status)) assert(!fs.existsSync(file), `${output}: withdrawn resource returned: ${entry.path}`);
    else assert.equal(digest(fs.readFileSync(file)), entry.sha256, `${output}: changed registered resource ${entry.path}`);
  }
  const registered = new Set(policy.assets.map(entry => entry.path.slice(4)));
  const withdrawn = policy.assets.filter(entry => ['retired', 'suspended'].includes(entry.status)).map(entry => '/' + entry.path.slice(4));
  for (const vendor of read(path.join(repository, 'src/assets/vendor/manifest.json')).scripts) {
    assert.equal(digest(fs.readFileSync(path.join(output, vendor.file))), vendor.sha256, `${output}: changed vendor ${vendor.file}`);
  }
  for (const file of filesBelow(output)) {
    const relative = path.relative(output, file).split(path.sep).join('/');
    if (/^(?:media\/|assets\/(?:img|fonts)\/)/.test(relative) && mediaTypes.test(relative)) assert(registered.has(relative), `${output}: unregistered output resource ${relative}`);
    if (file.endsWith('.html')) {
      const html = fs.readFileSync(file, 'utf8');
      assertLocalResources(html, relative, allowedOrigin);
      const $ = load(html);
      $('[src],[href],[poster],[data-src],[data-background],[srcset],[data-srcset]').each((_, node) => {
        for (const attribute of ['src', 'href', 'poster', 'data-src', 'data-background', 'srcset', 'data-srcset']) {
          for (const item of (node.attribs[attribute] || '').split(',')) {
            const url = item.trim().split(/\s+/)[0];
            if (!url || /^(?:data:|mailto:|#)/.test(url)) continue;
            const pathname = decodeURIComponent(new URL(url, 'https://build.invalid/').pathname);
            assert(!withdrawn.some(removed => pathname.endsWith(removed)), `${relative}: link to withdrawn resource`);
          }
        }
      });
    }
    if (file.endsWith('.css')) {
      const css = fs.readFileSync(file, 'utf8');
      assert(!/@import\s+(?:url\()?['"]?(?:https?:)?\/\//i.test(css), `${relative}: remote CSS import`);
      for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) assert(!remote(match[1]), `${relative}: remote CSS resource`);
      for (const removed of withdrawn) assert(!css.includes(removed), `${relative}: withdrawn CSS resource`);
    }
  }
  return policy.assets.length;
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateRightsSources, validatePublishedRights, assertLocalResources, digest } from './rights.mjs';
import { caseStore } from './rights-cases.mjs';

const temporary = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-rights-test-'));
const write = (directory, file, value) => {
  const target = path.join(directory, file); fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === 'object' ? JSON.stringify(value) : value);
};
function fixture() {
  const directory = temporary();
  const entry = { path: 'src/assets/img/preserved.png', sha256: digest('original'), status: 'legacy-unverified' };
  write(directory, entry.path, 'original');
  write(directory, 'lib/rights-register.json', { assets: [entry] });
  write(directory, 'lib/rights-baseline.json', { assets: { [entry.path]: entry.sha256 } });
  write(directory, 'src/assets/vendor/manifest.json', { scripts: [] });
  write(directory, 'src/assets/js/index-new.js', 'function initWordSpans() {}');
  return { directory, entry };
}
test('legacy files cannot silently change, grow or inherit an expired licence', () => {
  const { directory, entry } = fixture();
  try {
    validateRightsSources(directory);
    write(directory, 'src/assets/img/new.png', 'new');
    assert.throws(() => validateRightsSources(directory), /Unregistered media/);
    fs.unlinkSync(path.join(directory, 'src/assets/img/new.png'));
    write(directory, entry.path, 'changed'); entry.sha256 = digest('changed');
    write(directory, 'lib/rights-register.json', { assets: [entry] });
    assert.throws(() => validateRightsSources(directory), /cannot inherit/);
    Object.assign(entry, { status: 'approved', basis: 'license', author: 'creator', source: 'https://example.org/source', licenseUrl: 'https://example.org/license', scope: 'website', reviewedBy: 'owner', reviewedOn: '2026-10-12', expiresOn: '2026-10-12' });
    write(directory, 'lib/rights-register.json', { assets: [entry] });
    assert.throws(() => validateRightsSources(directory, '2026-10-13'), /expired/);
    entry.expiresOn = '2027-10-13'; write(directory, 'lib/rights-register.json', { assets: [entry] });
    validateRightsSources(directory, '2026-10-13');
    write(directory, 'src/assets/js/index-new.js', 'function initTricksWords() {}');
    assert.throws(() => validateRightsSources(directory, '2026-10-13'), /restricted/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('suspended resources must disappear from output and links', () => {
  const { directory, entry } = fixture(); const output = path.join(directory, 'output');
  try {
    entry.status = 'suspended'; entry.reason = 'review requested';
    write(directory, 'lib/rights-register.json', { assets: [entry] });
    write(output, 'assets/img/preserved.png', 'original');
    assert.throws(() => validatePublishedRights(output, directory), /withdrawn resource returned/);
    fs.unlinkSync(path.join(output, 'assets/img/preserved.png'));
    write(output, 'index.html', '<img src="/assets/img/preserved.png">');
    assert.throws(() => validatePublishedRights(output, directory), /withdrawn resource/);
    write(output, 'index.html', '<p>Review pending</p>');
    validatePublishedRights(output, directory);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('owner-reviewed edits remain unverified and cannot enrol unrelated media', () => {
  const { directory, entry } = fixture();
  try {
    const original = entry.sha256;
    write(directory, entry.path, 'dialogue removed');
    entry.sha256 = digest('dialogue removed'); entry.status = 'edited-unverified';
    entry.editReview = { sourceSha256: original, operation: 'remove-dialogue-and-balloons', permission: 'unconfirmed', ownerRequest: 'owner requested visual cleanup', reviewedBy: 'maintainer', reviewedOn: '2026-10-13' };
    const save = () => write(directory, 'lib/rights-register.json', { assets: [entry] });
    save(); validateRightsSources(directory, '2026-10-13');
    entry.status = 'suspended'; entry.reason = 'review requested'; save();
    validateRightsSources(directory, '2026-10-13');
    entry.status = 'edited-unverified';
    entry.editReview.sourceSha256 = digest('another source'); save();
    assert.throws(() => validateRightsSources(directory), /exact established source/);
    entry.editReview.sourceSha256 = original; entry.editReview.permission = 'approved'; save();
    assert.throws(() => validateRightsSources(directory), /unverified edit scope/);
    entry.editReview.permission = 'unconfirmed'; entry.path = 'src/assets/img/unrelated.png';
    write(directory, entry.path, 'dialogue removed'); save();
    assert.throws(() => validateRightsSources(directory), /exact established source/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('third-party automatic loads and contact submission cannot return', () => {
  assertLocalResources('<script src="/assets/vendor/local.js"></script><a href="https://example.org">Source</a>');
  for (const html of ['<script src="https://cdn.example.org/app.js"></script>', '<img data-src="//external.example.org/a.png">', '<link rel="stylesheet" href="https://fonts.example.org/font.css">', '<div data-bg="https://external.example.org/background.png"></div>']) {
    assert.throws(() => assertLocalResources(html), /third-party/);
  }
  assert.throws(() => assertLocalResources('<main data-barba-namespace="contact"><form action="/send"><input></form></main>'), /submit endpoint/);
  assert.throws(() => assertLocalResources('<main data-barba-namespace="contact"><div class="form" data-form-unavailable><input class="field"></div></main>'), /disabled/);
});
test('private cases require review, evidence, owner decision, verified action and recorded notification', () => {
  const directory = temporary(); const now = () => new Date('2026-10-13T01:00:00Z'); const store = caseStore(directory, now); const id = 'CR-20261013-fixture';
  try {
    assert.throws(() => store.create('../outside', {}), /CR-/);
    store.create(id, { receivedOn: '2026-10-13', material: '/gallery/', claim: 'fixture only', replyContact: 'fixture@example.invalid', operator: 'test' });
    assert.throws(() => store.transition(id, 'closed', { operator: 'test' }), /Cannot move/);
    store.transition(id, 'acknowledged', { operator: 'test', correspondenceRef: 'fixture acknowledgement' });
    store.transition(id, 'reviewing', { operator: 'test', reason: 'fixture review' });
    assert.throws(() => store.transition(id, 'planned', { operator: 'test' }), /missing/);
    store.transition(id, 'planned', { operator: 'test', decision: 'retain', reason: 'fixture', affectedPaths: '/gallery/', ownerApprovalRef: 'fixture decision' });
    store.transition(id, 'resolved', { operator: 'test', actionEvidence: 'no removal needed', publicationCheck: 'fixture verified', historyCheck: 'fixture verified', cacheCheck: 'not required: no changed resource' });
    assert.throws(() => store.transition(id, 'closed', { operator: 'test', retentionReason: 'fixture' }), /Cannot move/);
    store.transition(id, 'notified', { operator: 'test', correspondenceRef: 'fixture response' });
    store.transition(id, 'closed', { operator: 'test', retentionReason: 'fixture only' });
    assert.equal(store.due().length, 0);
    assert.throws(() => store.purge(id, 'wrong'), /confirmation/);
    store.purge(id, id);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('commit guard rejects private configured and overridden author email without printing it', () => {
  const directory = temporary(); const cli = path.resolve('lib/git-email-check.mjs');
  const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: 'pipe', encoding: 'utf8' });
  const run = env => execFileSync(process.execPath, [cli], { cwd: directory, env: { ...process.env, ...env }, stdio: 'pipe' });
  try {
    git('init', '--quiet'); git('config', 'user.name', 'Test'); git('config', 'user.email', '123+test@users.noreply.github.com');
    run({});
    assert.throws(() => run({ GIT_AUTHOR_EMAIL: 'private@example.invalid' }), error => !String(error.stderr).includes('private@example.invalid') && String(error.stderr).includes('AUTHOR'));
    git('config', 'user.email', 'private@example.invalid');
    assert.throws(() => run({}), error => !String(error.stderr).includes('private@example.invalid'));
    git('commit', '--allow-empty', '-m', 'historical fixture');
    const old = git('rev-parse', 'HEAD').trim();
    git('update-ref', 'refs/remotes/origin/main', old);
    git('config', 'user.email', '123+test@users.noreply.github.com');
    git('commit', '--allow-empty', '-m', 'safe new fixture');
    const safe = git('rev-parse', 'HEAD').trim();
    execFileSync(process.execPath, [cli, '--pre-push'], { cwd: directory, input: `refs/heads/main ${safe} refs/heads/main ${old}\n`, stdio: 'pipe' });
    git('config', 'user.email', 'private@example.invalid');
    git('commit', '--allow-empty', '-m', 'unsafe new fixture');
    const unsafe = git('rev-parse', 'HEAD').trim();
    assert.throws(() => execFileSync(process.execPath, [cli, '--pre-push'], { cwd: directory, input: `refs/heads/main ${unsafe} refs/heads/main ${old}\n`, stdio: 'pipe' }), error => !String(error.stderr).includes('private@example.invalid') && String(error.stderr).includes(unsafe));
    const eventFile = path.join(directory, 'event.json');
    write(directory, 'event.json', { before: old });
    assert.throws(() => execFileSync(process.execPath, [cli, '--ci'], { cwd: directory, env: { ...process.env, GITHUB_EVENT_PATH: eventFile, GITHUB_SHA: unsafe }, stdio: 'pipe' }));
    git('checkout', '--orphan', 'rewritten');
    git('config', 'user.email', '123+test@users.noreply.github.com');
    git('commit', '--allow-empty', '-m', 'safe rewritten fixture');
    const rewritten = git('rev-parse', 'HEAD').trim();
    write(directory, 'event.json', { before: '1'.repeat(40) });
    execFileSync(process.execPath, [cli, '--ci'], { cwd: directory, env: { ...process.env, GITHUB_EVENT_PATH: eventFile, GITHUB_SHA: rewritten }, stdio: 'pipe' });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('hook installation is scoped to this checkout and preserves existing hooks', () => {
  const directory = temporary(); const installer = path.resolve('lib/setup-git-hooks.mjs');
  const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: 'pipe', encoding: 'utf8' });
  try {
    git('init', '--quiet');
    for (const hook of ['pre-commit', 'pre-push']) write(directory, 'lib/git-hooks/' + hook, '#!/bin/sh\n');
    git('config', '--local', 'core.hooksPath', 'existing-hooks');
    assert.throws(() => execFileSync(process.execPath, [installer], { cwd: directory, stdio: 'pipe' }));
    assert.equal(git('config', '--get', 'core.hooksPath').trim(), 'existing-hooks');
    git('config', '--local', '--unset', 'core.hooksPath');
    execFileSync(process.execPath, [installer], { cwd: directory, stdio: 'pipe' });
    assert.equal(git('config', '--worktree', '--get', 'core.hooksPath').trim(), 'lib/git-hooks');
    assert.throws(() => git('config', '--local', '--get', 'core.hooksPath'));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

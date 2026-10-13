import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
let existing = '';
try { existing = git('config', '--get', 'core.hooksPath'); } catch {}
if (existing && existing !== 'lib/git-hooks') throw new Error('Existing hooksPath found; integrate these checks without replacing your hooks');
let configuredWorktree = '';
try { configuredWorktree = git('config', '--local', '--get', 'core.worktree'); } catch {}
if (configuredWorktree || git('rev-parse', '--is-bare-repository') === 'true') throw new Error('Use a normal checkout without a shared core.worktree override');
for (const name of ['pre-commit', 'pre-push']) fs.chmodSync(`lib/git-hooks/${name}`, 0o755);
// Older concurrent worktrees may not contain these files. Scope the hooks to
// this checkout so their commits do not fail because a new hook is missing.
git('config', '--local', 'extensions.worktreeConfig', 'true');
git('config', '--worktree', 'core.hooksPath', 'lib/git-hooks');
git('config', '--local', 'user.useConfigOnly', 'true');
console.log('Local hooks installed. Your configured name/email and global Git settings were preserved.');

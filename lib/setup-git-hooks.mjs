import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
let existing = '';
try { existing = git('config', '--get', 'core.hooksPath'); } catch {}
if (existing && existing !== 'lib/git-hooks') throw new Error('Existing hooksPath found; integrate these checks without replacing your hooks');
for (const name of ['pre-commit', 'pre-push']) fs.chmodSync(`lib/git-hooks/${name}`, 0o755);
git('config', '--local', 'core.hooksPath', 'lib/git-hooks');
git('config', '--local', 'user.useConfigOnly', 'true');
console.log('Local hooks installed. Your configured name/email and global Git settings were preserved.');

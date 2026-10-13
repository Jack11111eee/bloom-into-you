import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const safeEmail = email => /^[^\s<>@]+@users\.noreply\.github\.com$/i.test(email);
const sha = value => /^[a-f0-9]{40,64}$/i.test(value || '');
export function checkIdentity() {
  for (const kind of ['AUTHOR', 'COMMITTER']) {
    const identity = git('var', `GIT_${kind}_IDENT`);
    if (!safeEmail(identity.match(/<([^<>]+)>/)[1])) throw new Error(`${kind}: use your verified GitHub noreply address; private email was not printed`);
  }
}
export function checkCommits(revisions) {
  if (!revisions.length) return 0;
  const output = git('log', '--format=%H%x09%ae%x09%ce', ...revisions);
  const lines = output ? output.split('\n') : [];
  for (const line of lines) {
    const [id, author, committer] = line.split('\t');
    const publicIdentity = email => safeEmail(email) || email === 'noreply@github.com';
    if (!publicIdentity(author) || !publicIdentity(committer)) throw new Error(`${id}: non-noreply commit identity; private email was not printed`);
  }
  return lines.length;
}
export function checkPush(input) {
  let count = 0;
  for (const line of input.trim().split('\n').filter(Boolean)) {
    const [, local, , remote] = line.split(/\s+/);
    if (!sha(local) || !sha(remote)) throw new Error('Invalid pre-push input');
    if (/^0+$/.test(local)) continue;
    // Exclude already public history, but include all commits newly pushed to this branch.
    const exclusions = ['--not', '--remotes=origin'];
    if (!/^0+$/.test(remote)) exclusions.push(remote);
    count += checkCommits([local, ...exclusions]);
  }
  return count;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const mode = process.argv[2] || '--identity';
    if (mode === '--identity') checkIdentity();
    else if (mode === '--pre-push') {
      const { readFileSync } = await import('node:fs');
      checkPush(readFileSync(0, 'utf8'));
    } else if (mode === '--ci') {
      const { readFileSync } = await import('node:fs');
      const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      const head = process.env.GITHUB_SHA;
      if (!sha(head)) throw new Error('Missing CI commit');
      // Dispatch reviews the selected commit. Push reviews the complete added range.
      if (event.before && !/^0+$/.test(event.before)) {
        if (!sha(event.before)) throw new Error('Invalid CI base');
        checkCommits([head, '--not', event.before]);
      } else checkCommits(event.before ? [head] : [head, '-1']);
    } else throw new Error('Use --identity, --pre-push or --ci');
    console.log('COMMIT EMAIL CHECK PASS');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

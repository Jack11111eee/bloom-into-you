import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { policyDay } from './rights.mjs';

const transitions = {
  received: ['acknowledged'],
  acknowledged: ['needs-evidence', 'reviewing'],
  'needs-evidence': ['reviewing'],
  reviewing: ['needs-evidence', 'planned'],
  planned: ['reviewing', 'resolved'],
  resolved: ['reviewing', 'notified'],
  notified: ['reviewing', 'closed'],
  closed: ['reviewing'],
};
const required = {
  received: ['receivedOn', 'material', 'claim', 'replyContact', 'operator'],
  acknowledged: ['operator', 'correspondenceRef'],
  'needs-evidence': ['operator', 'reason'],
  reviewing: ['operator', 'reason'],
  planned: ['operator', 'decision', 'reason', 'affectedPaths', 'ownerApprovalRef'],
  resolved: ['operator', 'actionEvidence', 'publicationCheck', 'historyCheck', 'cacheCheck'],
  notified: ['operator', 'correspondenceRef'],
  closed: ['operator', 'retentionReason'],
};
const idPattern = /^CR-\d{8}-[a-z0-9-]{1,40}$/;
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
function validatePayload(state, payload) {
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'Use a JSON object');
  for (const key of required[state]) {
    assert(typeof payload[key] === 'string' && payload[key].trim(), `${state}: missing ${key}`);
  }
  if (state === 'received') assert(validDate(payload.receivedOn), 'Invalid receipt date');
  if (state === 'planned') assert(['retain', 'suspend', 'replace', 'remove', 'permission'].includes(payload.decision), 'Invalid review decision');
}
export function caseStore(repository = process.cwd(), now = () => new Date()) {
  const directory = path.join(repository, 'docs/rights-private');
  const fileFor = id => { assert(idPattern.test(id), 'Use CR-YYYYMMDD-short-name'); return path.join(directory, id + '.json'); };
  const load = id => JSON.parse(fs.readFileSync(fileFor(id), 'utf8'));
  const save = record => {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const temporary = fileFor(record.id) + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(temporary, fileFor(record.id));
  };
  return {
    create(id, payload) {
      assert(!fs.existsSync(fileFor(id)), 'Case already exists');
      validatePayload('received', payload);
      const record = { id, status: 'received', events: [{ at: now().toISOString(), status: 'received', details: payload }] };
      save(record); return record;
    },
    transition(id, status, payload) {
      const record = load(id);
      assert(transitions[record.status]?.includes(status), `Cannot move ${record.status} to ${status}`);
      validatePayload(status, payload);
      if (payload.dueOn) assert(validDate(payload.dueOn), 'Invalid follow-up date');
      record.status = status;
      record.events.push({ at: now().toISOString(), status, details: payload });
      if (status === 'closed') {
        const review = new Date(now()); review.setUTCDate(review.getUTCDate() + 90);
        record.retentionReviewOn = policyDay(review);
      } else delete record.retentionReviewOn;
      save(record); return record;
    },
    due() {
      if (!fs.existsSync(directory)) return [];
      return fs.readdirSync(directory).filter(file => idPattern.test(file.replace(/\.json$/, '')) && file.endsWith('.json')).map(file => load(file.slice(0, -5))).flatMap(record => {
        const date = record.status === 'closed' ? record.retentionReviewOn : record.events.at(-1).details.dueOn;
        return date && date <= policyDay(now()) ? [{ id: record.id, status: record.status, reviewOn: date }] : [];
      });
    },
    purge(id, confirmation) {
      const record = load(id);
      assert(record.status === 'closed' && confirmation === id, 'Purge requires a closed case and exact confirmation ID');
      fs.unlinkSync(fileFor(id));
      // This removes only the case JSON. Attachments, mailboxes and backups need separate review.
    },
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    // Never create complaint records in a public/tracked location.
    execFileSync('git', ['check-ignore', '--quiet', 'docs/rights-private/probe.json']);
    assert(!execFileSync('git', ['ls-files', 'docs/rights-private'], { encoding: 'utf8' }).trim(), 'Private case directory is tracked');
    const [command, id, stateOrFile, payloadFile] = process.argv.slice(2);
    const store = caseStore();
    const payload = file => JSON.parse(fs.readFileSync(file, 'utf8'));
    if (command === 'create') store.create(id, payload(stateOrFile));
    else if (command === 'event') store.transition(id, stateOrFile, payload(payloadFile));
    else if (command === 'due') console.log(JSON.stringify(store.due(), null, 2));
    else if (command === 'purge') store.purge(id, stateOrFile);
    else throw new Error('Use create ID payload.json | event ID STATUS payload.json | due | purge ID ID');
    if (command !== 'due') console.log('Local case record updated; no message was sent.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

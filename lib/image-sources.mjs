import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Same-image references supply provenance, not permission. Validate their links
// against the separate asset register so withdrawn media cannot stay indexed.
export function validateImageSources(repository = process.cwd(), policy) {
  const data = JSON.parse(fs.readFileSync(path.join(repository, 'src/_data/imageSources.json'), 'utf8'));
  const assets = new Map(policy.assets.map(entry => ['/' + entry.path.slice(4), entry]));
  const ids = new Set();
  for (const entry of data.groups.flatMap(group => group.entries)) {
    assert(entry.id?.trim() && !ids.has(entry.id), 'Missing or duplicate image-source identifier');
    ids.add(entry.id);
    assert(entry.permission === 'unconfirmed', `${entry.id}: a source URL must not be represented as permission`);
    assert(entry.provenance === 'user-supplied-same-image-audit', `${entry.id}: missing source-audit provenance`);
    assert(entry.variants.includes(entry.asset), `${entry.id}: source image is outside its variant group`);
    for (const file of entry.variants) {
      const asset = assets.get(file);
      assert(asset && !['retired', 'suspended'].includes(asset.status), `${entry.id}: unregistered or withdrawn source image ${file}`);
      assert(fs.existsSync(path.join(repository, 'src', file)), `${entry.id}: missing source image ${file}`);
    }
    for (const href of [entry.sourcePage, entry.imageUrl, ...entry.additionalPages]) {
      const url = new URL(href);
      assert(url.protocol === 'https:' && !url.username && !url.password, `${entry.id}: unsafe image-reference URL`);
    }
  }
  for (const entry of data.originalMusic || []) {
    const asset = assets.get(entry.asset);
    assert(asset?.status === 'approved' && asset.basis === 'original', `${entry.id}: original illustration must have an owner-reviewed original record`);
    assert(asset.sourceSha256 && asset.author === 'Site owner', `${entry.id}: missing original provenance`);
  }
  return data;
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateImageSources } from './image-sources.mjs';

test('source references reject withdrawn images, unsafe URLs and invented permission', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-image-sources-'));
  try {
    fs.mkdirSync(path.join(root, 'src/_data'), { recursive: true });
    fs.mkdirSync(path.join(root, 'src/media'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src/media/example.jpg'), 'fixture');
    const entry = { id: 'example', asset: '/media/example.jpg', variants: ['/media/example.jpg'], sourcePage: 'https://example.org/page', imageUrl: 'https://example.org/image.jpg', additionalPages: [], permission: 'unconfirmed', provenance: 'user-supplied-same-image-audit' };
    const policy = { assets: [{ path: 'src/media/example.jpg', status: 'legacy-unverified' }] };
    const save = value => fs.writeFileSync(path.join(root, 'src/_data/imageSources.json'), JSON.stringify({ groups: [{ entries: [value] }] }));
    save(entry);
    assert.doesNotThrow(() => validateImageSources(root, policy));
    assert.throws(() => validateImageSources(root, { assets: [{ ...policy.assets[0], status: 'suspended' }] }), /withdrawn/);
    save({ ...entry, sourcePage: 'javascript:alert(1)' });
    assert.throws(() => validateImageSources(root, policy), /unsafe/);
    save({ ...entry, permission: 'approved' });
    assert.throws(() => validateImageSources(root, policy), /must not be represented as permission/);
    save({ ...entry, variants: ['/media/other.jpg'] });
    assert.throws(() => validateImageSources(root, policy), /outside its variant group/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

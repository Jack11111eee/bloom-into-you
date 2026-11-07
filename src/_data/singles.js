// One record per entry and language, tagged with the collection it came from.
import fs from 'node:fs';
import { LOCALES } from '../../lib/i18n.mjs';

const load = file => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));

const tagged = (items, kind) => items.map(item => Object.assign({}, item, { kind }));

const collections = [
  ...tagged(load('./characters.json').characters, 'character'),
  ...tagged(load('./insights.json').insights, 'insight'),
];

export default LOCALES.flatMap(({ code }) => collections.map(item => ({ ...item, language: code })));

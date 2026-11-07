// Character and insight pages share one template; each entry is published per language.
import { localizedPath } from '../lib/i18n.mjs';

export default {
  ns: 'single',
  pagination: { data: 'singles', size: 1, alias: 'entry' },
  permalink: ({ entry }) => `${localizedPath(entry.href, entry.language)}/index.html`,
};

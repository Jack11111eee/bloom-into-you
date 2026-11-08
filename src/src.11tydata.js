// Page data shared by every route. Pages name their record with `ns`; entry pages
// (characters and insights) arrive through pagination as `entry`.
import { localizedPath } from '../lib/i18n.mjs';

const recordOf = data => (data.ns === 'single' ? data.entry : data.pages.pages[data.ns] ?? {});

// Characters feed the home page and their own index; insights feed theirs.
function collectionFor(data) {
  if (data.ns === 'home' || data.ns === 'characters') return data.characters.characters;
  if (data.ns === 'insights') return data.insights.insights;
  return null;
}

const card = item => ({
  href: item.href,
  name: item.name,
  tileColor: item.footerAccent,
  tileImage: item.introImage?.image,
});

const listed = (item, column) => item.intro?.[column]?.items?.join(', ') ?? '';

const fromRecord = key => data => recordOf(data)[key];

// Reading order: home, then each chapter in turn. Entries continue with the
// chapter after their own collection once the collection runs out.
function nextChapter(data) {
  const chapters = data.site.chapters;
  if (data.ns === 'home') return chapters[0];
  const own = data.ns === 'single' ? `${data.entry.kind}s` : data.ns;
  const index = chapters.findIndex(chapter => chapter.ns === own);
  return index === -1 ? null : chapters[index + 1] ?? null;
}

// Characters, then insights: one sequence for stepping back between entries.
const entrySequence = data => [...data.characters.characters, ...data.insights.insights];

export default {
  layout: 'layouts/page.njk',
  pagination: { data: 'locales', size: 1, alias: 'language' },
  permalink(data) {
    const home = localizedPath(data.pages.pages[data.ns].canonical, data.language);
    return `${home.replace(/\/$/, '')}/index.html`;
  },
  eleventyComputed: {
    locale: data => data.language ?? data.entry?.language ?? 'en',
    title: fromRecord('title'),
    description: fromRecord('description'),
    ogImage: fromRecord('ogImage'),
    canonical: fromRecord('canonical'),
    loaderActive: fromRecord('loaderActive'),
    navActive: fromRecord('navActive'),
    fixedNavActive: fromRecord('fixedNavActive'),
    cursorMode: fromRecord('cursorMode'),
    cursorSpan: fromRecord('cursorSpan'),
    nextCase: data => recordOf(data).nextCase ?? nextChapter(data),

    prevCase(data) {
      if (data.ns !== 'single') return null;
      const sequence = entrySequence(data);
      const index = sequence.findIndex(item => item.href === data.entry.href);
      return index > 0 ? card(sequence[index - 1]) : null;
    },

    related(data) {
      if (data.ns !== 'single') return null;
      const sequence = entrySequence(data);
      return (data.entry.related ?? []).map(href => card(sequence.find(item => item.href === href)));
    },

    footerAccent: fromRecord('footerAccent'),

    // Cursor previews follow the same order as the rows they belong to.
    floatImages(data) {
      const items = collectionFor(data);
      if (!items) return recordOf(data).floatImages;
      return items.map(item => ({ tileColor: item.footerAccent, thumbnail: item.introImage?.image }));
    },

    homeFeatured(data) {
      if (data.ns !== 'home') return null;
      return collectionFor(data).map(item => ({ ...card(item), line: item.homeLine }));
    },

    // Counts are derived from the collections so they can never drift.
    allLink(data) {
      const kind = recordOf(data).kind;
      if (kind === 'character') return { href: '/characters', label: 'All characters', count: data.characters.characters.length };
      if (kind === 'insight') return { href: '/insights', label: 'All insights', count: data.insights.insights.length };
      return null;
    },

    indexList(data) {
      if (data.ns !== 'characters' && data.ns !== 'insights') return null;
      const items = collectionFor(data);
      const heading = column => items[0]?.intro?.[column]?.label ?? '';
      return {
        headers: [data.ns === 'characters' ? 'Character' : 'Topic', heading(1), heading(2), 'Scope'],
        rows: items.map(item => ({
          ...card(item),
          col2: listed(item, 1),
          col3: item.intro?.[2]?.summary ?? listed(item, 2),
          col4: 'Manga 1–8',
        })),
      };
    },
  },
};

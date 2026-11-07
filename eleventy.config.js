// Eleventy configuration: four-language pages, strict build-time localisation,
// rights checks around every build and a self-contained static output.
import fs, { rmSync } from 'node:fs';
import path from 'node:path';
import { localizeHtml, clearCatalogCache, LOCALES, localizedPath } from './lib/i18n.mjs';
import { validateRightsSources, validatePublishedRights } from './lib/rights.mjs';
import { validateImageSources } from './lib/image-sources.mjs';
import { writeNotFoundFallback } from './lib/not-found.mjs';

const toPosix = file => file.split(path.sep).join('/');

// Image framing: a focal point in percent (fx, fy), 50/50 being the centre.
const FRAMING = {
  object: (fx, fy) => `object-position:${fx}% ${fy}%;`,
  background: (fx, fy) => `background-position:${fx}% ${fy}%;`,
};

export default function (eleventyConfig) {
  eleventyConfig.setQuietMode(true);

  // Withdrawn media never reach the output. Font licence files travel only with
  // fonts that are still in use.
  let unpublished = new Set();
  eleventyConfig.on('eleventy.before', () => {
    const policy = validateRightsSources();
    validateImageSources(process.cwd(), policy);
    const withdrawn = policy.assets.filter(entry => ['retired', 'suspended'].includes(entry.status));
    unpublished = new Set(withdrawn.map(entry => entry.path.slice('src/'.length)));
    const licencesInUse = new Set(policy.assets
      .filter(entry => !unpublished.has(entry.path.slice('src/'.length)))
      .map(entry => entry.licenseFile)
      .filter(Boolean));
    for (const file of fs.readdirSync('src/assets/fonts', { recursive: true })) {
      const published = `assets/fonts/${toPosix(file)}`;
      if (file.endsWith('.txt') && !licencesInUse.has(`/${published}`)) unpublished.add(published);
    }
  });
  eleventyConfig.on('eleventy.before', clearCatalogCache);

  // Every visible string is replaced from the locale catalog; a missing entry stops the build.
  eleventyConfig.addTransform('localize', (content, outputPath) => (
    outputPath?.endsWith('.html') ? localizeHtml(content) : content
  ));

  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' }, {
    filter: relative => !unpublished.has(`assets/${toPosix(relative)}`),
  });
  eleventyConfig.addPassthroughCopy({ 'src/media': 'media' }, {
    filter: relative => !unpublished.has(`media/${toPosix(relative)}`),
  });
  // Rights and licence notices ship with the component licence texts.
  eleventyConfig.addPassthroughCopy({ 'THIRD_PARTY_NOTICES.md': 'assets/licenses/THIRD_PARTY_NOTICES.md' });
  eleventyConfig.addPassthroughCopy({ 'LICENSING.md': 'assets/licenses/CONTENT-LICENSING.md' });

  eleventyConfig.on('eleventy.after', ({ directories, outputMode }) => {
    if (outputMode !== 'fs') return;
    // A repeated build may still hold copies from before a file was withdrawn.
    for (const file of unpublished) rmSync(path.join(directories.output, file), { force: true });
    writeNotFoundFallback(directories.output);
    validatePublishedRights(directories.output);
  });

  // Language choices are rendered by templates; the transform leaves them as written.
  eleventyConfig.addGlobalData('localeList', LOCALES);
  eleventyConfig.addFilter('localePath', (logicalPath, code) => localizedPath(logicalPath, code));
  eleventyConfig.addFilter('fail', message => {
    throw new Error(message);
  });

  // Every media image has a 540px-wide companion named "<name>-540x.<ext>".
  eleventyConfig.addFilter('thumb', url => (
    typeof url === 'string' && url ? url.replace(/(\.[a-z0-9]+)$/i, '-540x$1') : url
  ));

  // Returns a style attribute for a non-centred focal point, or nothing at all.
  eleventyConfig.addFilter('framingAttr', (framing, mode) => {
    const declare = FRAMING[mode];
    if (!declare) throw new Error(`Unknown framing mode "${mode}" (use ${Object.keys(FRAMING).join(' or ')})`);
    if (!framing || typeof framing !== 'object') return '';
    const fx = Number.isFinite(framing.fx) ? framing.fx : 50;
    const fy = Number.isFinite(framing.fy) ? framing.fy : 50;
    return fx === 50 && fy === 50 ? '' : ` style="${declare(fx, fy)}"`;
  });

  return {
    dir: { input: 'src', output: 'dist', includes: '_includes', data: '_data' },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    templateFormats: ['njk', 'html'],
  };
}

/**
 * eleventy.config.js — 构建期模板层配置
 *
 * 模板仍共用原有布局和媒体。H1 的用户授权新增构建期严格文字本地化、
 * 语言路由与入口（DEVIATIONS.md H1），替代 §9.1 原先禁止 HTML transform 的限制。
 * 翻译缺项直接失败；无客户端翻译运行时。
 */

import { localizeHtml, clearCatalogCache } from './lib/i18n.mjs';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { validateRightsSources, validatePublishedRights } from './lib/rights.mjs';
import { validateImageSources } from './lib/image-sources.mjs';
import { writeNotFoundFallback } from './lib/not-found.mjs';

export default function (eleventyConfig) {
  eleventyConfig.setQuietMode(true);
  let withdrawn = new Set();
  eleventyConfig.on('eleventy.before', () => {
    const policy = validateRightsSources();
    validateImageSources(process.cwd(), policy);
    withdrawn = new Set(policy.assets.filter(entry => ['retired', 'suspended'].includes(entry.status)).map(entry => entry.path.slice(4)));
  });
  eleventyConfig.on('eleventy.before', clearCatalogCache);
  // H1: strict build-time localization shares the existing structure and media.
  eleventyConfig.addTransform('localize', function (content, outputPath) {
    return outputPath?.endsWith('.html') ? localizeHtml(content) : content;
  });

  // ── 静态资源（P2 起）────────────────────────────────────────────────────
  // CSS / 字体 / 占位媒体原样复制到 dist，不做任何处理 —— 模板层不碰它们。
  // 路径刻意与原站同构（`/assets/css/…`、`/assets/img/…`、`/media/…`），
  // 因为 SPEC.md §7.5 要求"保持文件名与目录结构，使 HTML 中的引用可以原样保留"，
  // 也因为跨站比对要按 URL 折叠后两侧可比（`--url-mode basename`）。
  //
  // `src/media/`（P8 起）是 `scripts/generate-placeholders.mjs` 产出的**占位媒体**，
  // 对应原站的 `/media/pages/…`。它入库，因为它是产物的组成部分 ——
  // 这样 `dist/` 是**自包含**的，`scripts/serve-dist.mjs` 不再回落到 `reference/media/`。
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' }, {
    filter: relative => !withdrawn.has(`assets/${relative.split(path.sep).join('/')}`),
  });
  eleventyConfig.addPassthroughCopy({ 'src/media': 'media' }, {
    filter: relative => !withdrawn.has(`media/${relative.split(path.sep).join('/')}`),
  });
  // Incremental/repeated builds may already contain the former copies.
  eleventyConfig.on('eleventy.after', ({ directories, outputMode }) => {
    if (outputMode !== 'fs') return;
    for (const file of withdrawn) rmSync(path.join(directories.output, file), { force: true });
    writeNotFoundFallback(directories.output);
    validatePublishedRights(directories.output);
  });
  // Distribute rights boundaries alongside the exact component license texts.
  eleventyConfig.addPassthroughCopy({ 'THIRD_PARTY_NOTICES.md': 'assets/licenses/THIRD_PARTY_NOTICES.md' });
  eleventyConfig.addPassthroughCopy({ 'LICENSING.md': 'assets/licenses/CONTENT-LICENSING.md' });

  /**
   * thumb — 由原图 URL 推出 Kirby 的 -540x 缩略图 URL。
   *
   * 原站约定（SPEC.md §7.5）：img 的 src 是 -540x 缩略图、data-src 是原图。
   * 缩略图 URL 就是在扩展名前插入 "-540x"。数据文件只存原图，由此过滤器派生，
   * 避免两处各写一遍而产生漂移。
   */
  eleventyConfig.addFilter('thumb', (url) =>
    typeof url === 'string' && url ? url.replace(/(\.[a-z0-9]+)$/i, '-540x$1') : url,
  );

  /**
   * framingAttr / framingZoomOpen / framingZoomClose —— 图片取景机制（`DEVIATIONS.md` G1）。
   *
   * **缺省态必须与原站逐字节一致**（G 类的底线）。做法：三个过滤器在"无取景数据"时
   * 一律返回**空串**，模板里因此**不出现任何多余字符** —— 不用 `{% if %}` / `{% set %}`
   * 包住属性或标签（那会改动换行与缩进，实测会吃掉空行 ⇒ 逐字节比对不过）。
   *
   * 三种机制各取所需的一个属性（用户裁决：②③ 只平移、不缩放）：
   *   · `object`     —— ① `<img>` 系（`object-position`）
   *   · `background` —— ② 背景系（`background-position`）
   *   · `left`       —— ③ 首页首屏（`left` 百分比；原本写死 50%）
   *
   * 缩放的 wrapper **只对 ① 有意义**（②③ 不缩放），且 `z > 1` 才输出
   * （用户裁决：zoom 只允许 ≥1 —— 永不露出底色条）。开合两个标签在模板里
   * **紧贴 `<img>` 同行**，故缺省时该行与改动前逐字符相同。
   *
   * `fx` / `fy` 是**百分比**（0–100），缺省 50 = 原站的居中。
   */
  const FRAMING_MODES = {
    object: (fx, fy) => `object-position:${fx}% ${fy}%;`,
    background: (fx, fy) => `background-position:${fx}% ${fy}%;`,
    left: (fx) => `left:${fx}%;`,
  };

  const framingOf = (framing) => {
    if (!framing || typeof framing !== 'object') return null;
    const fx = Number.isFinite(framing.fx) ? framing.fx : 50;
    const fy = Number.isFinite(framing.fy) ? framing.fy : 50;
    const z = Number(framing.z);
    return { fx, fy, z: Number.isFinite(z) && z > 1 ? z : 0 };
  };

  /** 内联属性串（含前导空格），或空串 —— 缺省 / 等于原站默认值时不输出 */
  eleventyConfig.addFilter('framingAttr', (framing, mode) => {
    const f = framingOf(framing);
    if (!f) return '';
    const make = FRAMING_MODES[mode];
    // 未知模式直接抛错 —— 静默返回空串会得到"少了一层取景"的页面，最难发现（同 dispatch.njk 的立场）
    if (!make) throw new Error(`未知的取景模式：${mode}（可选：${Object.keys(FRAMING_MODES).join(', ')}）`);
    if (mode === 'left' ? f.fx === 50 : f.fx === 50 && f.fy === 50) return '';
    return ` style="${make(f.fx, f.fy)}"`;
  });

  /** 缩放 wrapper 的开标签，或空串。`[实测]` 嵌套相乘成立，见 `LEDGER.md` 2026-10-02 第 5 条 */
  eleventyConfig.addFilter('framingZoomOpen', (framing) => {
    const f = framingOf(framing);
    if (!f || !f.z) return '';
    const style = `position:absolute;top:0;left:0;width:100%;height:100%;transform:scale(${f.z});transform-origin:${f.fx}% ${f.fy}%;`;
    return `<div class="framing-zoom" style="${style}">`;
  });

  eleventyConfig.addFilter('framingZoomClose', (framing) => {
    const f = framingOf(framing);
    return f && f.z ? '</div>' : '';
  });

  return {
    dir: {
      input: 'src',
      output: 'dist',
      includes: '_includes',
      data: '_data',
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    templateFormats: ['njk', 'html'],
  };
}

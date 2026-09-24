/**
 * eleventy.config.js — 构建期模板层配置
 *
 * 约束（SPEC.md §9.1）：模板层只负责把内容注入 HTML，不得引入任何客户端运行时、
 * 不得改变 DOM 结构、不得重排属性顺序。因此这里刻意保持最小配置：
 * 不做 HTML 重写、不加任何 transform、不注入任何客户端脚本。
 */

export default function (eleventyConfig) {
  eleventyConfig.setQuietMode(true);

  // ── 静态资源（P2 起）────────────────────────────────────────────────────
  // CSS / 字体 / 占位媒体原样复制到 dist，不做任何处理 —— 模板层不碰它们。
  // 路径刻意与原站同构（`/assets/css/…`、`/assets/img/…`、`/media/…`），
  // 因为 SPEC.md §7.5 要求"保持文件名与目录结构，使 HTML 中的引用可以原样保留"，
  // 也因为跨站比对要按 URL 折叠后两侧可比（`--url-mode basename`）。
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

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
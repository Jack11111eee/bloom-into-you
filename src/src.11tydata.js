/**
 * src.11tydata.js — `src/` 的目录数据文件
 *
 * 只做一件事：把"逐页的 head 字段与高亮索引"解析成模板可直接用的顶层变量。
 *
 * 两个来源（都在 `_data/` 里，由 `scripts/extract-page-data.mjs` 从归档机械抽取）：
 *   · 6 个非案例页 → `pages.pages[ns]`（ns 由各页 frontmatter 给出）
 *   · 11 个案例页 → `project`（pagination 的 alias，来自 `projects.projects`）
 *
 * 用**函数**而不是字符串模板：`loaderActive` / `navActive` / `fixedNavActive` 必须是
 * **数字**才能与 `loop.index0` 严格比较；写成 `"{{ … }}"` 会得到字符串，
 * 比较恒为 false 且**不报错**（loader 就没有 active 项了）。
 */
const pick = (data) => (data.ns === 'work-single' ? data.project : (data.pages.pages[data.ns] || {}));

export default {
  layout: 'layouts/base.njk',
  eleventyComputed: {
    title: (data) => pick(data).title,
    description: (data) => pick(data).description,
    ogImage: (data) => pick(data).ogImage,
    canonical: (data) => pick(data).canonical,
    loaderActive: (data) => pick(data).loaderActive,
    navActive: (data) => pick(data).navActive,
    fixedNavActive: (data) => pick(data).fixedNavActive,
    cursorMode: (data) => pick(data).cursorMode,
    cursorSpan: (data) => pick(data).cursorSpan,
    // 光标浮动缩略图（`partials/cursor.njk` 的 'float' 形态用）
    floatImages: (data) => pick(data).floatImages,
    // 案例页页脚（`partials/footer-case.njk`）：下一个案例 + "All work N"
    nextCase: (data) => pick(data).nextCase,
    workCount: (data) => data.work.items.length,
    /**
     * `.count-nr` 的派生值（`DEVIATIONS.md` B8）。
     *
     * 原站**写死**：work.html 是 `7 / 11 / 66`、archive.html 是 `(66)`。
     * 口径与原站一致 —— 原站那两个数就是 `li.design` / `li.development` 的个数
     * （`[实测]` work.html：design 7、development 11），Archive 是条目总数。
     *
     * 放在**渲染期**而不是抽取期：计数与 `items` 同源，改数据不可能只改一个。
     * 抽取期写进 JSON 也能得到同样的数字，但那仍是"存下来的一份拷贝"，
     * 内容替换（P8）时又会出现"数据改了、数字没改"的同一个缺陷。
     */
    workCounts: (data) => ({
      design: data.work.items.filter((i) => i.classes.includes('design')).length,
      development: data.work.items.filter((i) => i.classes.includes('development')).length,
      archive: data.archive.items.length,
    }),
    // archive.html 的 `(66)` —— 括号是原站标记的一部分，留在模板里
    archiveCount: (data) => data.archive.items.length,
    // `.rounded-div` 的内联底色（仅案例页有；其余页 `{% if %}` 判空后不输出）
    footerAccent: (data) => pick(data).footerAccent,
  },
};

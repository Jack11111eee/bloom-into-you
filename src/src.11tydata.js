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
    // `.rounded-div` 的内联底色（仅案例页有；其余页 `{% if %}` 判空后不输出）
    footerAccent: (data) => pick(data).footerAccent,
  },
};

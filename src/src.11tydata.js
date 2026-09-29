/**
 * src.11tydata.js — `src/` 的目录数据文件
 *
 * 只做一件事：把"逐页的 head 字段与高亮索引"解析成模板可直接用的顶层变量。
 *
 * 三个来源（都在 `_data/` 里，由 `scripts/extract-page-data.mjs` 从归档机械抽取，
 * 或由 P10 新写）：
 *   · 6 个索引/单页 → `pages.pages[ns]`（ns 由各页 frontmatter 给出）
 *   · 两类详情页（人物页 / 解读页）→ `entry`（`single.njk` 的 pagination alias，
 *     数据源 `_data/singles.js`，见 `single.11tydata.js`）
 *
 * 用**函数**而不是字符串模板：`loaderActive` / `navActive` / `fixedNavActive` 必须是
 * **数字**才能与 `loop.index0` 严格比较；写成 `"{{ … }}"` 会得到字符串，
 * 比较恒为 false 且**不报错**（loader 就没有 active 项了）。
 */
const pick = (data) => (data.ns === 'single' ? data.entry : (data.pages.pages[data.ns] || {}));

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
    // 详情页页脚（`partials/footer-case.njk`）：下一个 + "All … N"
    nextCase: (data) => pick(data).nextCase,
    /**
     * 详情页页脚的"全部"按钮（`partials/footer-case.njk`）。
     *
     * P10 之前这里是写死的 `/work` + `All work` + `workCount`；两类详情页各有自己的索引页，
     * 故改为**按 kind 派生**。计数取自集合长度（**派生，不存**）—— 存一份就会与数据分叉，
     * 那正是 `DEVIATIONS.md` B8 要防的缺陷。
     */
    allLink: (data) => {
      const e = pick(data);
      if (!e || !e.kind) return null;
      return e.kind === 'character'
        ? { href: '/characters', label: 'All characters', count: (data.characters.characters || []).length }
        : { href: '/insights', label: 'All insights', count: (data.insights.insights || []).length };
    },
    workCount: (data) => data.work.items.length,
    /**
     * `.count-nr` 的派生值（`DEVIATIONS.md` B8）。
     *
     * 原站**写死**：work.html 是 `7 / 11`（Design 数 / Development 数）。
     * 口径与原站一致 —— 原站那两个数就是 `li.design` / `li.development` 的个数
     * （`[实测]` work.html：design 7、development 11）。
     *
     * 放在**渲染期**而不是抽取期：计数与 `items` 同源，改数据不可能只改一个。
     *
     * ⚠️ **P10 M1 之后这两个值暂无消费者**（work.njk 已删，索引页在 M4 重建）——
     * 按方案 §5 M1 步骤 1 的原文只移除 `.archive` 那一支（`_data/archive.json` 已删，
     * 留着会引用不存在的数据）。整块的去留登记在 `ISSUES.md` ISSUE-047。
     */
    workCounts: (data) => ({
      design: data.work.items.filter((i) => i.classes.includes('design')).length,
      development: data.work.items.filter((i) => i.classes.includes('development')).length,
    }),
    /**
     * 首页 `More work 11` 的派生值（`DEVIATIONS.md` B8，2026-09-26 扩大范围）。
     *
     * P5 时这一处**不在** B8 的登记范围内，故当时未改、登记为 `ISSUES.md` ISSUE-028；
     * 用户 2026-09-26 裁决扩大 B8 覆盖它。口径 = `work.items.length`（与原站写死的 `11` 相同）。
     * **M5 之前首页仍用它**；M5 把那个按钮改成 `Gallery`（方案 §4.1 第 6 项）后另行处置。
     */
    homeMoreWorkCount: (data) => data.work.items.length,
    // `.rounded-div` 的内联底色（仅详情页有；其余页 `{% if %}` 判空后不输出）
    footerAccent: (data) => pick(data).footerAccent,
  },
};

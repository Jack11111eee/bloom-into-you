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
    //
    // 索引页与首页的浮动图**从与列表同源的 json 派生**（方案 §5 M4 步骤 2 / M5 步骤 4）——
    // 它必须与行式列表**同序同数**（`initStickyCursorWithDelay` 按行的序号取第 i 张图，
    // 见 index-new.js 的 `$elements.index($(this))`）。**存两处必然漂移**：
    // `[实测]` 往 `characters.json` 加一条 ⇒ 行变 4 而 `pages.json` 里的浮动图仍是 3，
    // 悬停第 4 行会取到 `undefined`。故这里派生，不在 `pages.json` 里另存一份。
    //
    // home 与 characters 同源（都读 `characters.json`）—— 首页的三人物入口是同一批人物
    // （方案 §5 M5 步骤 4 的"`floatImages` 同源"）。
    floatImages: (data) => {
      const src =
        data.ns === 'characters' || data.ns === 'home' ? (data.characters && data.characters.characters) || []
        : data.ns === 'insights' ? (data.insights && data.insights.insights) || []
        : null;
      if (src) {
        return src.map((e) => ({
          classes: ['visible'],
          tileColor: e.footerAccent,
          thumbnail: e.introImage && e.introImage.image,
        }));
      }
      return pick(data).floatImages;
    },
    /**
     * 首页三人物入口的行式/卡片列表（方案 §4.1 第 4 项 / §5 M5 步骤 4）。
     *
     * **从 `characters.json` 派生，不在 `home.json` 另存一份** —— 与 B8 同一立场：
     * 两处存必然漂移（人物加一条而首页入口没跟上）。两套列表**共用这一份数据**
     * （行式在桌面显示、卡片在 ≤1024px 显示，由 CSS 决定，见 `style-new.css` 的
     * `.large-work-grid` / `.work-tiles-home`）。
     *
     * 每行 = 人物名 + 一句短语（`homeLine`）+ 悬停预览（`footerAccent` / `introImage.image`）。
     * 返回 `null` 表示"本页不是首页"（其余 10 页），模板据此不渲染。
     */
    homeFeatured: (data) => {
      if (data.ns !== 'home') return null;
      const chars = (data.characters && data.characters.characters) || [];
      return chars.map((e) => ({
        href: e.href,
        name: e.name,
        line: e.homeLine,
        // 原站的 `classes`（design / development）服务于已退役的筛选（方案 D3）——
        // 人物入口没有分类维度，故为空数组；模板另行追加 `visible`（浮动图按 `.visible` 配对）。
        classes: [],
        tileColor: e.footerAccent,
        tileImage: e.introImage && e.introImage.image,
      }));
    },
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
    // ⚠️ **P10 M7 删除**（`ISSUES.md` ISSUE-047，用户 2026-10-02 裁决）：
    // 原站这里有三条派生量 —— `workCount` / `workCounts`（Design / Development 条数）/
    // `homeMoreWorkCount`（首页 `More work 11`）。它们的唯一消费者是 `work.njk`（M1 删除）
    // 与首页那个按钮（M5 改成 `Gallery` 并删掉 `.count-nr`）⇒ 自 M5 起**零消费者**。
    // 数据源 `_data/work.json` 一并删除。`DEVIATIONS.md` B8 记的是"计数由数据派生"这一
    // 命题本身，它的载体现在是 `allLink`（详情页页脚的 `All characters N` / `All insights N`）。
    // **不要再加回来**：这三条读的是已删除的 `work.json`。
    /**
     * 索引页（`/characters` / `/insights`）的列表数据 —— **从两份 json 派生，不另存一份**
     * （方案 §5 M4 步骤 2；与 B8 同一立场：两处存必然漂移）。
     *
     * 行式列表与卡片列表**共用 `rows`**（方案 §4.3 / §4.5 的"与行式同源数据"）。
     * 表头也由数据派生 —— 第 2/3 列的标签取自该条 `intro` 的第 2/3 栏，它们本来就写着
     * `Voice` / `Notes`（人物页）与 `Characters` / `Notes`（解读页）；第 1 列按页给定
     * （`Character` / `Topic`）。
     *
     * 卡片的两项取自条目自身：`tileColor` = `footerAccent`、`tileImage` = `introImage.image`
     * （详情页的主视觉）—— 不新增字段、不另存一份缩略图。
     *
     * ⚠️ **第 4 列的口径由站主定下**（`docs/copy-proposal.md` §5.2，DEVIATIONS.md F7）：
     * 原为占位值 `Year / 2024`（"年份"没有真实口径 —— 填 2018 或 2026 会混淆动画发行
     * 时间与网站写作时间）。现改为 **`Scope` / `Manga 1–8`**：说明这份解读依据的版本，
     * 与页面上的剧透边界相互印证，也不虚构发布日期。
     *
     * 返回 `null` 表示"本页不是索引页"（其余 9 页），模板据此不渲染主体。
     */
    indexList: (data) => {
      const src =
        data.ns === 'characters' ? (data.characters && data.characters.characters) || []
        : data.ns === 'insights' ? (data.insights && data.insights.insights) || []
        : null;
      if (!src) return null;
      const introAt = (e, i) => (e.intro && e.intro[i] && e.intro[i].items) || [];
      const labelAt = (i) => (src[0] && src[0].intro && src[0].intro[i] && src[0].intro[i].label) || '';
      return {
        headers: [data.ns === 'characters' ? 'Character' : 'Topic', labelAt(1), labelAt(2), 'Scope'],
        rows: src.map((e) => ({
          href: e.href,
          name: e.name,
          col2: introAt(e, 1).join(', '),
          col3: introAt(e, 2).join(', '),
          col4: 'Manga 1–8',
          tileColor: e.footerAccent,
          tileImage: e.introImage && e.introImage.image,
        })),
      };
    },
    // `.rounded-div` 的内联底色（仅详情页有；其余页 `{% if %}` 判空后不输出）
    footerAccent: (data) => pick(data).footerAccent,
  },
};

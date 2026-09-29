/**
 * single.11tydata.js — 两类详情页共用一个模板（P10 `docs/bloom-redesign-plan.md` §2）
 *
 * 原站是"11 条案例页共用 `work-single` 这一个 Barba namespace"（`SPEC.md` §6.0）；
 * P10 之后是"3 个人物页 + 2 个解读页共用 `single`"。**同 namespace 必须同模板同数据形状**，
 * 故两类页面由**一次分页**产出（数据源 = `_data/singles.js` 合成的数组）。
 *
 * `permalink` 用**目录式输出**（`/characters/yuu/index.html`），使产物的 URL 与
 * 导航里的 `href` 逐字符一致：
 *   · Barba 会 fetch 这个 URL 并解析，路径不同会让相对资源解析错位
 *   · harness 的路由表用的就是 `/characters/yuu`（`scripts/harness/routes.mjs`）
 *
 * `permalink` 由每条的 `href` 派生，**不另存一个 slug** —— 两处存必然漂移，
 * 而漂移的表现是"页面落在 A、链接指向 B"，构建却成功（`ISSUE-037` 的改名教训）。
 */
export default {
  ns: 'single',
  pagination: {
    data: 'singles',
    size: 1,
    alias: 'entry',
  },
  permalink: (data) => `${data.entry.href}/index.html`,
};

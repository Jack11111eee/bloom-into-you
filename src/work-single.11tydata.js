/**
 * work-single.11tydata.js — 11 个案例页共用一个模板
 *
 * `SPEC.md` §6.0：**11 条案例页共用 `work-single` 这一个 Barba namespace**，
 * 所以它们也必须共用一份模板与一份数据形状 —— 分页（pagination）正是为此。
 *
 * `permalink` 用**目录式输出**（`/work/twice/index.html`），使产物的 URL
 * 与原站逐字符一致（`/work/twice`）：
 *   · Barba 会 fetch 这个 URL 并解析，路径不同会让相对资源解析错位
 *   · harness 的路由表用的就是 `/work/twice`（`scripts/harness/routes.mjs`）
 */
export default {
  ns: 'work-single',
  pagination: {
    data: 'projects.projects',
    size: 1,
    alias: 'project',
  },
  permalink: (data) => `/work/${data.project.slug}/index.html`,
};

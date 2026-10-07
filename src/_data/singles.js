/**
 * singles.js — `single.njk` 的分页数据源（P10 `docs/bloom-redesign-plan.md` §2）
 *
 * 两类详情页（人物页 / 解读页）**共用一个 Barba namespace `single`** —— 与原站
 * "11 条案例页共用 `work-single`" 同构。共用 namespace 就必须共用一份模板与**一次分页**，
 * 故这里把两个集合合成一个数组交给 `pagination`，每条自带 `href`（决定 `permalink`）。
 *
 * 为什么不给每个集合各配一个模板：那样两个模板会各自 `ns: 'single'`，
 * 而 `ns` 同时是 `pages.pages[ns]` 的数据键（`src/src.11tydata.js`），
 * 分页来源一拆开，`pick()` 就得靠猜。**一条分页 + 每条自带 `kind`** 是唯一不需要猜的形状。
 *
 * `kind` 由本文件打上，是**派生的**，不写进两个 json —— 否则同一件事存两处必然漂移。
 */
import fs from 'node:fs';
import { LOCALES } from '../../lib/i18n.mjs';

const read = (name) => JSON.parse(fs.readFileSync(new URL(name, import.meta.url), 'utf8'));

const entries = [
  ...read('./characters.json').characters.map((e) => ({ ...e, kind: 'character' })),
  ...read('./insights.json').insights.map((e) => ({ ...e, kind: 'insight' })),
];

export default entries.flatMap(entry => LOCALES.map(locale => ({ ...entry, language: locale.code })));

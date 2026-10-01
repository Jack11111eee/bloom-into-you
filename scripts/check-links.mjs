#!/usr/bin/env node
/**
 * check-links.mjs — **站内死链**的可执行判定（P10 通用 gate G-C 第 3 条）
 *
 * ## 为什么需要它
 *
 * P10 是一次**路由级重构**：17 条路由缩到 11 条，新增 `/gallery` `/characters`
 * `/insights` 与两类详情页，删除 `/archive` `/styleguide` 与 11 个 `/work/project-*`。
 * 路由一动，**链接就从"永远对"变成"必须逐个核对"** —— 而漏掉一处的症状是
 * 用户点进 404，构建与现有门禁都不会报（它们判的是结构与行为，不看 href 指哪）。
 *
 * `check-leaks.mjs` 的第 ⑤ 项只覆盖**媒体引用**（`src` / `data-bg` / `srcset`）。
 * 本脚本补的是另一半：**页面与静态资源的 `href`**。
 *
 * ## 判据
 *
 * 取 `dist/**\/*.html` 的**每一个 `href`**（用 cheerio，不用正则 —— `HANDOFF.md` §2.3：
 * 归档/产物里有注释掉的标签，grep 会把它们当成活跃标签），逐个解析：
 *
 * | 形态 | 处置 |
 * |---|---|
 * | `https://…` / `//…` / `mailto:` / `tel:` / `javascript:` / `data:` | **跳过**（不是站内链接） |
 * | `#` / `#anchor` / 空 | **跳过**（同页锚点） |
 * | 以 `/` 开头 | 相对 `dist/` 根解析 |
 * | 其余（相对路径） | 相对**所在文件**的目录解析 |
 *
 * 解析结果必须命中三者之一，否则**死链**：
 *   ① 该路径是一个存在的**文件**（`/assets/css/style-new.css`）
 *   ② 该路径是一个目录且其下有 `index.html`（`/work/project-01` → `…/project-01/index.html`）
 *   ③ `<路径>.html` 存在（`/about` → `dist/about.html`，当前产物用的是 ① 的目录形态）
 *
 * ## 与 G-C 的关系
 *
 * G-C 第 3 条要求"`dist/` 内所有 `href` 指向存在的页面"。**M0 只交付脚本本身**
 * （在**当前**产物上跑通 + 反例自测）；把它接进 `scripts/gate.mjs` 是 M7 的收口工作
 * —— 现在接进去会让门禁判定一个 M1 之后才成立的路由表。
 *
 * 用法：
 *   node scripts/check-links.mjs                 # 判定 dist/
 *   node scripts/check-links.mjs --dist <dir>
 *   node scripts/check-links.mjs --selftest      # 反例：喂坏产物时必须报出死链
 *
 * 退出码：0 = 无死链；1 = 有死链；2 = 无法判定（产物不存在 / 解析器不可用）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};

/** 递归列文件 */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** 外部协议 / 同页锚点 —— 这些不是"站内链接"，一律不判 */
function isSkipped(href) {
  const h = href.trim();
  if (h === '') return true;
  if (h.startsWith('#')) return true;
  if (h.startsWith('//')) return true; // 协议相对
  return /^[a-z][a-z0-9+.-]*:/i.test(h); // https: / mailto: / tel: / javascript: / data: …
}

/**
 * 解析一条站内 href。返回 `{ ok }` 或 `{ ok:false, resolved, why }`。
 *
 * `why` 要能直接回答"差在哪"（`HANDOFF.md` §2.27：失败信息必须可据以行动）：
 *   · `missing`        —— 三者都不命中
 *   · `outside-dist`   —— 相对路径跑到了产物外面（产物必须自包含）
 *   · `no-index`       —— 目录存在但没有 index.html
 */
function resolveTarget(distDir, fromFile, href) {
  const clean = href.split('#')[0].split('?')[0];
  if (clean === '') return { ok: true }; // 纯 query/hash

  let target = clean.startsWith('/')
    ? path.join(distDir, clean)
    : path.resolve(path.dirname(fromFile), clean);

  // 产物必须自包含：相对路径不允许跑到 dist/ 之外
  const rel = path.relative(distDir, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return { ok: false, resolved: clean, why: 'outside-dist' };
  }

  const tries = [target, decodeURIComponent(target)];
  for (const t of tries) {
    if (fs.existsSync(t) && fs.statSync(t).isFile()) return { ok: true };
    if (fs.existsSync(path.join(t, 'index.html'))) return { ok: true };
    if (fs.existsSync(t + '.html')) return { ok: true };
  }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    return { ok: false, resolved: clean, why: 'no-index' };
  }
  return { ok: false, resolved: clean, why: 'missing' };
}

/**
 * 扫描一个产物目录。**纯读**，不写任何东西 —— 自测靠"复制一份再喂进来"，
 * 不靠在被判对象上做手脚。
 */
function scanLinks(distDir) {
  const files = walk(distDir).filter((f) => f.toLowerCase().endsWith('.html'));
  const dead = [];
  const seen = new Set(); // `${href}\u0000${from}` 去重：同一页里重复出现的同一条只报一次
  let checked = 0;

  for (const f of files) {
    const $ = cheerio.load(fs.readFileSync(f, 'utf8'));
    $('[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href === undefined || isSkipped(href)) return;
      checked++;
      const key = `${href}\u0000${f}`;
      if (seen.has(key)) return;
      seen.add(key);
      const r = resolveTarget(distDir, f, href);
      if (!r.ok) dead.push({ href, resolved: r.resolved, why: r.why, from: path.relative(distDir, f) });
    });
  }
  return { files: files.length, checked, dead };
}

// ── 自测（反例）────────────────────────────────────────────────────────────
// 正例全绿证明不了任何事（`HANDOFF.md` §2.12 / §2.26）：必须确认**喂坏产物时会红**，
// 且**喂无关的外部链接时不会红**（否则它是一条"满屏假阳性"的检查，同样会被忽略）。
if (process.argv.includes('--selftest')) {
  const DIST_T = path.resolve(ROOT, arg('--dist', 'dist'));
  if (!fs.existsSync(DIST_T)) {
    console.error(`✗ 无法自测：产物不存在（${DIST_T}）。先 \`npm run build\`。`);
    process.exit(2);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-links-'));
  let base = null;

  /** 复制一份干净产物，可选做一次改动，返回新目录 */
  function make(extra) {
    if (!base) {
      base = path.join(tmp, 'base');
      fs.cpSync(DIST_T, base, { recursive: true });
    }
    const d = fs.mkdtempSync(path.join(tmp, 'case-'));
    fs.cpSync(base, d, { recursive: true });
    if (extra) extra(d);
    return d;
  }

  /**
   * 往产物里某个页面注入一段 HTML。`relFile` 缺省取"第一个 html"，
   * 但**相对路径的用例必须显式指定**：`../nope` 从 `dist/index.html` 出发才落在
   * 产物之外，从 `dist/about/index.html` 出发只落在 `dist/` 里 —— 两种都是死链，
   * 但走的是不同分支，不指定就测不到想测的那一条。
   */
  const inject = (snippet, relFile) => (d) => {
    const page = relFile ? path.join(d, relFile) : walk(d).find((f) => f.endsWith('.html'));
    fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace('</body>', `${snippet}</body>`));
  };

  const results = [];
  function check(label, distDir, expectCode, expectSubstr) {
    let code = 0;
    let out = '';
    try {
      const r = scanLinks(distDir);
      out = r.dead.map((x) => `${x.href} (${x.from}, ${x.why})`).join('\n');
      code = r.dead.length ? 1 : 0;
    } catch (e) {
      code = 2;
      out = String(e && e.message);
    }
    const okCode = code === expectCode;
    const okText = !expectSubstr || out.includes(expectSubstr);
    results.push({
      ok: okCode && okText,
      label,
      detail: okCode ? (okText ? '' : `输出里没有 “${expectSubstr}”`) : `退出码 ${code} ≠ 期望 ${expectCode}`,
    });
  }

  // ① 干净产物 → PASS。否则后面所有"FAIL 是对的"都无从判断。
  check('① 干净产物 → 无死链', make(), 0);

  // ② 指向**不存在的路由**（`/work/project-99`）→ 报出。
  check('② 指向不存在的路由 → 报出', make(inject('<a href="/work/project-99">x</a>')), 1, '/work/project-99');

  // ③ 指向一条**已被 P10 删掉**的路由（`/archive`）→ 报出。
  //    这条是 P10 的直接动因：路由表一变，指向旧路由的链接就该当场红。
  //
  //    ⚠️ **本条的反例目标换过一次**（P10 M5）：初版用的是 `/gallery` —— 那时（M0）
  //    它还是"将来才有"的路由，**故意挑它**来演示"路由表变了、旧链接该红"。
  //    但 **M3 把 `/gallery` 建出来了** ⇒ 它成了真页面 ⇒ 指向它的链接**不再是死链**，
  //    于是这一例**恒 FAIL**（期望退出码 1，实得 0）。这是"反例的目标后来变成了真的"
  //    这一类失效（`ISSUES.md` **ISSUE-057**）：反例没被改坏，是**世界变了**。
  //    改用 `/archive`（M1 删除、不会回来）—— 它才真正承担"旧链接当场红"这个命题。
  check('③ 指向已删除的 /archive → 报出', make(inject('<a href="/archive">x</a>')), 1, '/archive');

  // ④ 目标页面**被删掉**、链接还在（页脚的 `/about`）→ 报出。
  //    形态与 ② 不同：href 本身没变，是**目标消失**。
  check(
    '④ 链接还在但目标页被删 → 报出',
    make((d) => fs.rmSync(path.join(d, 'about'), { recursive: true, force: true })),
    1,
    '/about',
  );

  // ⑤ 相对死链 → 报出（相对路径的解析分支必须被走到）。
  //    从根 `index.html` 出发的 `../nope` 落在产物**之外** ⇒ `outside-dist` 分支；
  //    产物必须自包含，故它也是死链。
  check('⑤ 相对路径跑出产物 → 报出（outside-dist）', make(inject('<a href="../nope">x</a>', 'index.html')), 1, 'outside-dist');

  // ⑤b 相对死链落在产物**之内** ⇒ `missing` 分支。两条分开测：
  //     合起来只测到一条分支，"另一条分支从没被走过"正是 §2.27 说的那种洞。
  check('⑤b 相对路径指向产物内不存在的文件 → 报出（missing）', make(inject('<a href="nope">x</a>', 'index.html')), 1, 'missing');

  // ⑥ **不该报的**：外部链接、mailto/tel、同页锚点。
  //    没有这一条，⑤ 的"报出"可能只是因为它见谁都报。
  check(
    '⑥ 外部链接 / mailto / tel / 锚点 → 不报',
    make(
      inject(
        '<a href="https://example.com/x">a</a><a href="//example.com/x">b</a>' +
          '<a href="mailto:a@example.com">c</a><a href="tel:+31200000000">d</a><a href="#top">e</a>',
      ),
    ),
    0,
  );

  console.log('check-links --selftest\n');
  let bad = 0;
  for (const r of results) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.label}　${r.ok ? '' : `（${r.detail}）`}`);
    if (!r.ok) bad++;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n${bad ? `✗ ${bad}/${results.length} 例未通过` : `✓ ${results.length}/${results.length} 例通过`}`);
  process.exit(bad ? 1 : 0);
}

// ── 正式判定 ───────────────────────────────────────────────────────────────
const DIST = path.resolve(ROOT, arg('--dist', 'dist'));
if (!fs.existsSync(DIST)) {
  // "无法判定"必须与"有死链"分开（`HANDOFF.md` §2.27 纪律 1）：
  // 前者的下一步是"去构建"，后者是"去修链接"。
  console.error(`✗ 无法判定：产物不存在（${DIST}）。先 \`npm run build\`。`);
  process.exit(2);
}

const r = scanLinks(DIST);
console.log('站内链接检查（判定范围 = 公开产物 dist/）\n');
console.log(`  扫描 ${r.files} 个页面，站内 href ${r.checked} 条，死链 ${r.dead.length} 条`);

if (r.dead.length) {
  console.log(`\nLINK-CHECK FAIL —— ${r.dead.length} 条死链：`);
  for (const d of r.dead) {
    const why =
      d.why === 'outside-dist'
        ? '相对路径指向产物之外（产物必须自包含）'
        : d.why === 'no-index'
          ? '目录存在但没有 index.html'
          : '目标不存在';
    console.log(`  ✗ ${d.href}　← ${d.from}　（${why}）`);
  }
  process.exit(1);
}
console.log('\nLINK-CHECK PASS —— 产物内所有站内 href 均指向存在的页面或文件');

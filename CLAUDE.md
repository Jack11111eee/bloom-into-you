# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## ⚠️ 本项目是复刻项目 —— 开工前必读

本仓库的任务是**忠实复刻 https://dennissnellenberg.com/**（UI + 交互 + 运动系统）。
它不是普通项目：**保真度建立在"我们对原站的认识是可靠的"这个前提上**，
而这个前提曾经错过两次，且错误方式是静默的。

**任何构建工作开始前，按顺序读**：

1. **`HANDOFF.md`** — 交接简报：铁律、陷阱、当前状态、下一步。**先读这个。**
2. **`LEDGER.md`** — 引用 `SPEC.md` 任何数值前先查这里，确认它是 `[实测]` 还是只是 `[源码]`。
3. **`DEVIATIONS.md`** — 改动行为前先查，确认是否已有决定。
4. **`ISSUES.md`** — 开工前读 **§0 阻塞契约**。其中标「✅ 强制」的项是**你该阶段任务的一部分**，
   不是背景信息；标「❌ 知悉即可」的**不要擅自修**（它们可能是有意保留的）。
5. `SPEC.md` / `PLAN.md` — 规格与阶段计划，按需查阅。

**三条不可协商的规则**（详细理由见 `HANDOFF.md` §1）：

- **开工前跑 `node scripts/check-archive-drift.mjs`。** 原站若已变化，
  所有比对都在打一个不存在的靶子，而症状是"怎么调都差一点"——最难排查的一类失败。
- **不在 `[推导]` 上施工，也不把 `[源码]` 当成"运行时如此"。**
  凡涉及**第三方库的执行语义**（Barba hook 生命周期、Locomotive context 判定、
  GSAP matchMedia、jQuery 事件），**必须实测后才可落地**。源码只能用来"发现"，不能用来"确信"。
  这条规则来自两次实际翻车（见 `SPEC.md` §0 的 C1、C2）。
- **维护四份登记文档**：测量了规格 → 更新 `LEDGER.md`；决定偏离 → 先登记 `DEVIATIONS.md` 再实现；
  发现问题 → 登记 `ISSUES.md` **并同步其 §0 阻塞关系表**；阶段推进 → 更新 `HANDOFF.md` §3。

> 判据速记：**问题出在我们的代码/工具 → `ISSUES.md`；出在对原站的认识 → `LEDGER.md`；
> 是我们与原站的有意差异 → `DEVIATIONS.md`。**

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State important assumptions explicitly.
- If uncertainty can be resolved by inspecting available code, documentation, runtime behavior, references, or project files, investigate first rather than asking the user.
- If multiple materially different interpretations remain after investigation, present them instead of silently choosing one.
- If a simpler approach exists, say so. Push back when warranted.
- Ask for clarification only when unresolved ambiguity materially affects the implementation or requires a genuine user decision.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code unless they are required to meet an explicit project goal.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- Do not remove or avoid testing, verification, measurement, or other infrastructure when it is explicitly required by the task.
- If you write 200 lines and it could be 50 without weakening the requested behavior or verification, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated for the stated goal?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```text
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Prefer investigating and verifying independently when the necessary information is available. Ask the user only when progress depends on information or a decision that cannot be determined from the available project context.

Strong success criteria let you loop independently. Weak criteria ("make it work") require unnecessary clarification and make verification harder.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, assumptions are checked before implementation, and completed work is verified against explicit success criteria.

## 5. Reference Before Approximation

**For reconstruction work, observed reference behavior is the source of truth. Measure before guessing.**

- When layout, typography, spacing, assets, responsive behavior, or motion can be inspected from the reference, inspect it before inventing values.
- Prefer observed or measured values over visually plausible substitutes.
- Distinguish clearly between values that are observed, derived, and manually tuned.
- Do not replace a reference behavior with a merely "similar" implementation unless exact behavior cannot reasonably be determined or reproduced.
- If evidence from the reference conflicts with an assumption or an earlier implementation, follow the evidence and update the implementation.

The test: If asked "why is this value or behavior implemented this way?", you should be able to point to reference evidence, a derivation from that evidence, or an explicit tuning reason.

**本项目专有**：参考来源的优先级与标记体系见 `SPEC.md` 开头的标记约定，
以及 `HANDOFF.md` §1.2。特别注意 —— 在本项目中，**"源码这么写"不等于"运行时如此"**：
`[源码]` 只用于发现，落地前必须实测（见 `SPEC.md` §0 的两次证伪）。
若某值来自推导而非实测，在 `LEDGER.md` 中登记其等级，不要当成既成事实使用。

## 6. Verify the Relevant States

**A reconstruction is not verified by a single screenshot or a successful build. Check the states that define the experience.**

- Verify the states materially affected by the task, such as viewport size, scroll position, hover/pointer state, menu state, route transition phase, and animation phase.
- For dynamic behavior, compare equivalent states rather than arbitrary moments in time.
- When changing shared layout or motion code, re-check the downstream states that the change can affect.
- Do not call a section complete because it looks close in one state if its important interactions or responsive states remain unverified.
- Keep verification proportional to the task: check the smallest set of states that is sufficient to establish correctness.

The test: Completion means the requested behavior matches the reference across the states that matter for that behavior, not merely that the code runs.

## 7. Git Discipline

**Use version control to preserve clear, recoverable checkpoints without capturing unrelated work.**

- Inspect the working tree before making changes so you know which modifications already exist.
- When multiple sessions or agents may modify the repository concurrently, use a separate Git worktree and dedicated branch for each independent stream of work. Do not switch branches or share a writable worktree across concurrent sessions.
- Before committing, re-check the current branch, working-tree status, and staged diff. If unexpected concurrent changes or branch state are detected, stop and reconcile them before committing.
- Never stage, commit, discard, rewrite, or otherwise absorb pre-existing unrelated changes as part of your work.
- Commit completed, verified units of work at natural task or milestone boundaries. Do not create commits for every small edit, and do not leave a substantial verified change uncommitted without a reason.
- Keep commits atomic: each commit should represent one coherent change and remain understandable and reviewable on its own. Split independent concerns rather than combining them into a catch-all commit.
- For broad, risky, or architectural work, prefer a dedicated branch when it can be created without disturbing existing uncommitted work. Small, well-scoped changes do not require a new branch solely for process compliance.
- Before committing, review the diff and run the verification relevant to that change. Commit only the files or hunks that belong to the verified unit.
- Do not commit secrets, credentials, or local-only artifacts. Respect existing ignore rules and repository conventions.
- Do not rewrite shared history, force-push, hard-reset, or discard user work unless explicitly requested. If changes cannot be separated safely from pre-existing work, preserve the worktree and avoid making an automatic commit.

The test: Git history should make it easy to understand what changed, verify why it changed, and return to a known-good state without losing unrelated work.

**本项目专有 —— 两条硬约束**：

1. **工作区有变动就提交，不要保持 git 静默。** 粒度按本文档 §7 的通用纪律：
   以「**完成且验证过的单元**」为提交边界（阶段推进、里程碑、一个修复完成），
   既不是每改一个文件就 commit，也不是攒到最后一次性提交。
   **`push` 仍需用户明确要求** —— 本地提交可回退，推到公开远端不可逆。
   > 本条原为「不要自动提交，保持零提交」（`SPEC.md` §1.2，2026-09-22）。
   > **2026-09-23 用户改定：有变动即提交。** 变更缘由与原始前提的重建见 `SPEC.md` §1.2 的变更记录。
2. **`reference/` 与 `baselines/` 永不入库。** `reference/` 含第三方版权素材
   （PP Neue Montreal 字体、Dennis Snellenberg 的文案/照片/客户媒体）；
   `baselines/` 含原站页面截图与大批量采集数据。二者均已由 `.gitignore` 排除。
   **不要用 `git add -f` 绕过**，也不要把它们复制进任何公开发布产物。
   提交只含自有产物：`SPEC.md` / `PLAN.md` / `HANDOFF.md` / `LEDGER.md` /
   `DEVIATIONS.md` / `ISSUES.md` / `CLAUDE.md` / `docs/` / `scripts/` /
   `package.json` / `package-lock.json` / `eleventy.config.js`（P2 起还有 `src/`）。

> **产物边界**（`SPEC.md` §1.3）：不移植 Kirby 后台、不移植 Google Analytics、
> 不发布任何原站素材。占位内容必须替换掉全部原始文案与媒体。

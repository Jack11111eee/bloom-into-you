# Repository rules

This repository builds the current Bloom Into You website with Eleventy and
Nunjucks. English, Simplified Chinese, Traditional Chinese and Japanese share
the same templates, media and interaction system.

## Read and preserve

- Read `README.md`, `package.json`, `eleventy.config.js` and the relevant source
  before changing behavior. `AGENTS.md` points here as the shared rules source.
- Source of truth: templates and assets in `src/`, content and translations in
  `src/_data/`, build-time localization in `lib/i18n.mjs`.
- Keep all website media, fonts and font licenses. Do not prune resources merely
  because one search finds no literal reference; references can be derived.
- Preserve the owner's wording and multilingual home opening. Do not regenerate
  content or media from the original reference website.
- Preserve Barba markup, script load order, Locomotive scrolling, GSAP timelines
  and font-readiness behavior unless the user requests a behavior change.
  Verify library behavior in a browser; source inspection alone is insufficient.

## Local research and authoring materials

The owner approved keeping process documents and authoring tools only locally
on 2026-10-12. `.gitignore` excludes `docs/`, root process documents and scripts
other than the six build/check scripts. Do not force-add these materials.
`reference/` and `baselines/` must never be committed or copied into public output.

When available, local `HANDOFF.md`, `LEDGER.md`, `DEVIATIONS.md`, `ISSUES.md`,
`SPEC.md` and `PLAN.md` preserve prior decisions and evidence. Consult them for
related changes and maintain them when recording new evidence or decisions.
They are optional for a fresh clone; normal website work must not depend on
their presence. Original-site drift checks belong to original-site comparisons,
not routine builds of the personalized website.

No files were deleted from the original development directory during cleanup.
The complete previous tracked version remains at commit
`4223186913a93059dcda73d00fd50baebfdc1238`; local original-file hashes and backups
are in `docs/repository-cleanup/`. Recover or inspect those before discarding
information. Do not rewrite history to remove these files.

## Scope and verification

- Inspect the branch and working tree first. Preserve unrelated user changes.
  Make only changes needed for the request; do not refactor neighboring code.
- Run `npm run build`, then `node scripts/check-i18n.mjs`,
  `node scripts/check-about-essay.mjs` and `node scripts/check-links.mjs`.
- For deployment changes, also run `npm run build:pages` and
  `node scripts/check-pages.mjs`. Output must contain only the website.
- For localization changes, run `node scripts/test-i18n-build.mjs`.
- For UI or interaction changes, verify the affected states in a real browser
  across relevant languages and desktop/mobile widths. A build alone does not
  establish correctness. Report unavailable checks honestly.
- For repository-boundary changes, build and check from only the tracked files,
  without local docs, research files, reference assets or Git history.

## Git discipline

- Use a separate branch/worktree for concurrent or broad work; never absorb
  unrelated changes. Re-check branch, status and staged diff before committing.
- Commit completed, verified units locally. Stage only their files or hunks.
- Push only when the user explicitly requests it. Do not force-push, rewrite
  shared history, hard-reset or delete user files without explicit authorization.
- Keep `dist/`, `dist-pages/`, dependencies, caches and local research ignored.

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
- Preserve the owner's wording and multilingual home opening. Do not generate
  content or media from third-party websites.
- Preserve the Barba page transitions, Lenis scrolling, the curtain and GSAP
  motion, per-page module mount/cleanup and font-readiness refresh unless the
  user requests a behavior change. Verify library behavior in a browser; source
  inspection alone is insufficient.
- Site code is written for this website. It must not repeat six consecutive
  lines of the code recorded before the November 2026 rewrite (`352831d`);
  `lib/originality.test.mjs` enforces this in CI.

## Local research and authoring materials

The owner approved keeping process documents and authoring tools only locally
on 2026-10-12. `.gitignore` excludes `docs/`, root process documents and scripts
other than the six build/check scripts. Do not force-add these materials.
`reference/` and `baselines/` must never be committed or copied into public output.

When available, local `HANDOFF.md`, `LEDGER.md`, `DEVIATIONS.md`, `ISSUES.md`,
`SPEC.md` and `PLAN.md` preserve prior decisions and evidence. Consult them for
related changes and maintain them when recording new evidence or decisions.
They are optional for a fresh clone; normal website work must not depend on
their presence.

No original authoring files were deleted from the owner's development directory.
The complete previous tracked version, including historical commit
`4223186913a93059dcda73d00fd50baebfdc1238`, is preserved in the owner's private
recovery bundles under `docs/copyright-history/backup/` and original checkout.
Those backups are optional local materials, not part of a fresh public clone.
Never merge or push their original refs back into the cleaned public history.
Do not rewrite shared history without explicit owner approval and a reviewed
backup, exact ref scope and recovery plan.

## Scope and verification

- Inspect the branch and working tree first. Preserve unrelated user changes.
  Make only changes needed for the request; do not refactor neighboring code.
- Run `npm run build`, then `node scripts/check-i18n.mjs`,
  `node scripts/check-about-essay.mjs`, `node scripts/check-links.mjs` and
  `node --test lib/*.test.mjs`.
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
- Use English Conventional Commits: `type(scope): description`, with an optional
  scope and a suitable type such as `feat`, `fix`, `docs` or `chore`. Write the
  subject, body and footers in English; do not use Chinese in commit messages.
- Commit completed, verified units locally. Stage only their files or hunks.
- Push only when the user explicitly requests it. Do not force-push, rewrite
  shared history, hard-reset or delete user files without explicit authorization.
- Keep `dist/`, `dist-pages/`, dependencies, caches and local research ignored.

## Maintainer reference

- Local preview: Node.js 24, `npm ci`, then `npm run serve`. `npm run build`
  writes `dist/`; `npm run build:pages` converts it to the GitHub Pages project
  path in `dist-pages/`. For another address, pass `PAGES_URL` (ending in `/`)
  to both `build:pages` and `scripts/check-pages.mjs`.
- Pushes to `main` run `.github/workflows/pages.yml`, which builds, checks and
  publishes the site. Commit identities must use the GitHub noreply address;
  `node lib/setup-git-hooks.mjs` installs local checks (requires Node on PATH).
- Every build validates `lib/rights-register.json` and the asset baseline. New
  or changed images and fonts need a recorded source, basis, scope, reviewer and
  date; `retired` or `suspended` assets never reach the output. An unverified
  record is not evidence of permission. `node --test lib/rights.test.mjs`
  exercises these safeguards.
- Rights requests are handled privately with `node lib/rights-cases.mjs`
  (`create`, `event`, `due`); records go to the ignored `docs/rights-private/`.
  The tool records actions taken by hand and never sends email. Never commit
  correspondence or evidence.
- The image-source index (`/image-sources/`) documents matching images found on
  the web; it does not establish permission and is linked only from the
  copyright page.

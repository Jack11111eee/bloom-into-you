[English](README.md) | [简体中文](README.zh-CN.md)

[![Live site](https://img.shields.io/badge/Bloom_Into_You-Live_site-ff9bb2?style=for-the-badge&logo=githubpages&logoColor=white)](https://jack11111eee.github.io/bloom-into-you/)

# Bloom Into You 🌸

An unofficial, noncommercial fan website for *Bloom Into You*, with personal essays, character and relationship commentaries, a gallery, and four songs paired with original short stories. Available in English, Simplified Chinese, Traditional Chinese and Japanese.

[Visit the website](https://jack11111eee.github.io/bloom-into-you/)

## Run locally

Requires Node.js 24 and npm.

```bash
npm ci
npm run serve
```

Open the local address printed in the terminal. `npm run build` generates `dist/`. `npm run build:pages` converts an existing `dist/` to the GitHub Pages project path and writes `dist-pages/`.

## Build and check

```bash
npm run build
node scripts/check-i18n.mjs
node scripts/check-about-essay.mjs
node scripts/check-links.mjs
node scripts/test-i18n-build.mjs
node --test lib/music.test.mjs lib/not-found.test.mjs
node --test lib/originality.test.mjs
npm run build:pages
node scripts/check-pages.mjs
```

The default Pages address is the live URL above. For another deployment address, pass a `PAGES_URL` environment variable ending in `/` to `build:pages` and `check-pages.mjs`. Missing addresses display a custom, animated `404.html`; its four languages follow the URL prefix or saved language preference. The original missing URL and HTTP 404 status are retained.

Pushes to `main` run `.github/workflows/pages.yml`, which builds, checks and publishes the site.

Every page footer links to the copyright notice, contact page and privacy notice. The full copyright notice is at `/copyright/`, with corresponding routes under the three other language prefixes. Its final section links to image-source references at `/image-sources/`. The source index also credits the owner-original music illustrations. Its other references document matching images found on the web; they do not establish the original acquisition channel or permission to reuse them. The source index is not linked from ordinary page footers.

The owner's original essay and character/relationship commentary prose, only where the owner has authority to license it, is available under [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). See [LICENSING.md](LICENSING.md) for the six articles, attribution and exclusions. Reference templates, design, motion, code, images and fonts are outside that grant. There is no repository-wide licence.

## Rights checks and contact

Every build checks `lib/rights-register.json`, the fixed asset baseline and script provenance hashes. Existing unverified assets retain their established bytes. Owner-reviewed dialogue-removal edits record the original hashes separately and remain unverified. New or modified images/fonts need recorded sources, usage grounds, scope, reviewer and review date. Expired permissions block the build. Assets marked `suspended` or `retired` must not enter the output or page links. An unverified record is not evidence of permission.

Run `node --test lib/rights.test.mjs` to exercise these safeguards. Run `node lib/setup-git-hooks.mjs` to install this checkout's commit-email checks. It preserves your existing name, email and global settings; existing hooks need manual integration. Checks cover author/committer emails and new commits being pushed. Continuous integration also checks the new commit range.

Rights holders can follow the instructions at `/copyright/` and contact the published email address. Contact-page fields are disabled previews with no form submission endpoint. Email links use the visitor's own mail application. This repository does not send email. The owner must verify receipt/replies using their own account and manage the mail service's account security.

The private handling tool is `node lib/rights-cases.mjs`:

```bash
node lib/rights-cases.mjs create CR-YYYYMMDD-short-name /private/path/received.json
node lib/rights-cases.mjs event CR-YYYYMMDD-short-name acknowledged /private/path/acknowledged.json
node lib/rights-cases.mjs due
```

The tool lists required fields for receipt, acknowledgement, review, decision, verified action, notification and closure. Records go into ignored `docs/rights-private/`. Do not commit private correspondence or evidence. A notification event records a message you have already sent manually; it sends nothing. A retention review is prompted 90 days after closure, with no automatic deletion. Attachments, mail accounts and backups need separate review.

[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) covers component/font licences and unresolved provenance. Their licence texts ship under `assets/licenses/` and `assets/fonts/`. These notices do not grant permission to use original-work images or reference-site code.

## Repository boundaries

The public repository contains `src/` (templates, content, four-language catalogs and website assets), `lib/` (localization and build checks), dependency configuration, the deployment workflow and six basic scripts. Font licences remain in `src/assets/fonts/`. Runtime JavaScript, fonts and media are self-hosted. Fixed script versions, sources and hashes are recorded in `src/assets/vendor/manifest.json`. Privacy information is available in all four languages; the contact form is disabled and contact uses email.

On 12 October 2026, process documents, evidence, previews and research/authoring tools stopped being tracked. All original files remain in the owner's original development directory. `.gitignore` excludes `docs/`, root process documents and other scripts. A fresh clone builds and deploys without those local files or historical commits. The complete original version is retained in the owner's private recovery backups. The cleaned public history is not a backup of the earlier research files.

The original development directory still provides `node scripts/build-copy-editor.mjs` (after building), `node scripts/serve-copy-editor.mjs` and asset tools. Those helpers are not included in fresh public clones. Local cleanup lists, original file hashes and previous rules are kept in `docs/repository-cleanup/`.

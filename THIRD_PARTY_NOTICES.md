# Third-party notices and rights boundaries

This notice identifies third-party components and unresolved rights questions. It does not grant permission to reuse third-party artwork or reference-site code.

## Website content and reference implementation

- This is an unofficial, non-commercial fan website for *Bloom Into You* / *やがて君になる*. Manga, animation stills, illustrations and any associated translations belong to their respective rights holders. The website has not obtained official authorization for these materials; individual sources and usage grounds remain under review. They are excluded from any permission covering the website owner's original work.
- The original manga is by Nio Nakatani, published by KADOKAWA. The TV animation credit is **©2018 仲谷 鳰／ＫＡＤＯＫＡＷＡ／やがて君になる製作委員会**. This animation credit is not a blanket attribution for every illustration, manga translation or fan artwork.
- The layout and interaction implementation originated in a reconstruction of [Dennis Snellenberg's portfolio](https://www.dennissnellenberg.com/). Portions of the CSS, JavaScript and templates derive from that reference. No permission to redistribute its proprietary implementation has been established. Attribution is not a substitute for permission; the reference-derived code is not offered as an independently authored, freely licensed template.
- Earlier versions included a word-animation snippet credited to T.RICKS / Timothy Ricks, with a restriction on redistribution. The current `initWordSpans` independently implements the text-node wrapping contract and replaces that snippet. This change does not clear historical copies or the separate provenance of the surrounding reference-derived runtime.
- The owner's original prose in the six articles listed in [LICENSING.md](https://github.com/Jack11111eee/bloom-into-you/blob/main/LICENSING.md) is licensed under CC BY-NC-ND 4.0, only to the extent the owner has authority to license it. Third-party quotations, translations and all media are excluded. Templates, design, CSS, JavaScript, tooling and fonts are outside that content grant. No repository-wide reuse licence is granted; third-party components retain their own terms.

## Runtime libraries

The following versions are used by the website. License texts are published under `assets/licenses/`; the file manifest records their sources and hashes. All active scripts are self-hosted and retain their distributed headers and load order. `assets/vendor/manifest.json` records the exact fixed-version package files used for the self-hosted copies; no runtime CDN request is needed.

| Component | Runtime version | License / bundled text |
|---|---|---|
| GSAP and ScrollTrigger | 3.15.1 | GSAP Standard License, **not MIT**; see edition notes below |
| Lenis | 1.3.27 | MIT; `lenis-1.3.27.txt` |
| Barba core | 2.10.3 | MIT; `@barba-core-2.10.3.txt` |

Each self-hosted script is byte-identical to the file inside the fixed npm package or CDN response recorded in `assets/vendor/manifest.json`. GSAP, ScrollTrigger and Lenis carry their distributed headers unchanged. Barba's added header points to the accompanying licenses without changing the runtime body. Barba's dependency notices for is-promise and path-to-regexp are also included. For these bundled dependencies, the manifest's `licenseSourceVersion` identifies the package from which the license was obtained; it is **not** proof of an exact independently identified version inside the compiled bundle.

On 7 November 2026 the website stopped using Locomotive Scroll 4.1.3 (and its bundled dependencies), jQuery 3.5.1, js-cookie 2.2.0, vanilla-lazyload 17.6.1, normalize.css 3.0.3 and GSAP 3.9.1. Their notices are no longer distributed with the website; earlier published versions remain covered by the notices that shipped with them.

The GSAP 3.15.1 npm package carries GreenSock's 2026 copyright notice and a reference to its Standard "No Charge" license, but no standalone license text. `gsap-3.15.1-package-notice.txt` preserves that provenance. `gsap-standard-license-2025.txt` separately preserves the official current terms, effective 30 April 2025 and last modified 30 May 2025, retrieved on 12 October 2026. The official terms incorporate [Webflow's Terms of Service](https://webflow.com/legal/terms) and distinguish permitted website implementation from prohibited competing visual animation tools. Consult the [official GSAP license](https://gsap.com/community/standard-license/) for changes and other uses.

## Fonts

| Font | Rights / terms | Included license |
|---|---|---|
| Modified Inter static faces, weights 300 / 450 / 800 | Copyright 2016 The Inter Project Authors; SIL OFL 1.1 | `assets/fonts/LICENSE.txt` |
| Source Han Serif subsets, named Bloom Serif | Adobe / Source Han Serif contributors; SIL OFL 1.1 | `assets/fonts/reading/source-han-license.txt` |
| LXGW WenKai subsets | LXGW WenKai contributors; SIL OFL 1.1 | `assets/fonts/reading/wenkai-license.txt` |

The Inter files are modified faces rather than untouched upstream Inter. Their existing modification record is retained. The commercial reference-font metrics used during the original generation remain a separate unresolved provenance question; attaching OFL does not resolve that question. Commercial reference-font files are not included in the website or repository. The current website build uses the existing WOFF2 assets and does not require those reference files.

Pangram Pangram's [official FAQ](https://pangrampangram.com/pages/faq), checked on
13 October 2026, permits free personal use of its trial fonts in noncommercial
projects, including web portfolios and small-audience artistic projects. Thus
noncommercial personal use alone is not treated here as requiring a commercial
purchase. That statement does not specifically address extracting reference
metrics to calibrate and publicly distribute another font. The original file
acquisition/terms record and that particular use remain unconfirmed; the current
Inter binaries are retained without claiming the FAQ clears that question.

The Source Han Serif and WenKai license files remain unchanged, including original notices and naming conditions. Any future font changes must continue to comply with their own licenses.

## Build tooling

Eleventy, Cheerio, Playwright Core and their npm dependencies are development dependencies governed by the license files in their respective packages. They are installed by `npm ci` and are not copied into the published website. This notice does not relicense those packages.

## Rights concerns

The English Salinger quotation in the About essay is attributed to *The Heart of a Broken Story*, *Esquire*, September 1941, with a link to the publisher's official archive. The archive confirms the bibliographic information; its article text requires sign-in, and it is not represented here as a fresh verification of the full text. The website owner's multilingual wording is preserved. Source and translation questions concerning the other short literary quotation remain under review.

The four-language website provides a copyright notice and contact page. Rights concerns can also be sent to [jackkkkk1e@proton.me](mailto:jackkkkk1e@proton.me), identifying the relevant page or resource. A contact mechanism does not confer authorization or waive existing rights.

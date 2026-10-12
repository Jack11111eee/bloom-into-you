# Third-party notices and rights boundaries

This notice identifies third-party components and unresolved rights questions. It does not grant permission to reuse third-party artwork or reference-site code.

## Website content and reference implementation

- This is an unofficial, non-commercial fan website for *Bloom Into You* / *やがて君になる*. Manga, animation stills, illustrations and any associated translations belong to their respective rights holders. The website has not obtained official authorization for these materials; individual sources and usage grounds remain under review. They are excluded from any permission covering the website owner's original work.
- The original manga is by Nio Nakatani, published by KADOKAWA. The TV animation credit is **©2018 仲谷 鳰／ＫＡＤＯＫＡＷＡ／やがて君になる製作委員会**. This animation credit is not a blanket attribution for every illustration, manga translation or fan artwork.
- The layout and interaction implementation originated in a reconstruction of [Dennis Snellenberg's portfolio](https://www.dennissnellenberg.com/). Portions of the CSS, JavaScript and templates derive from that reference. No permission to redistribute its proprietary implementation has been established. Attribution is not a substitute for permission; the reference-derived code is not offered as an independently authored, freely licensed template.
- The current word-animation implementation includes a snippet credited to T.RICKS / Timothy Ricks, with a restriction on redistribution. Its original notice is retained while that implementation is being replaced. No broader redistribution permission is implied.
- Original commentary, owner-authored text, translations and independently authored tooling are not automatically offered under MIT or Creative Commons. No repository-wide reuse license is granted by this notice. Third-party components retain their own terms.

## Runtime libraries and styles

The following versions are used by the website. License texts are published under `assets/licenses/`; the file manifest records their sources and hashes. CDN scripts retain their distributed headers and load order.

| Component | Runtime version | License / bundled text |
|---|---|---|
| Locomotive Scroll | 4.1.3 | MIT; `locomotive-scroll-4.1.3.txt` |
| normalize.css | 3.0.3 | MIT; `normalize.css-3.0.3.txt` |
| jQuery, including Sizzle | 3.5.1 | MIT; `jquery-3.5.1.txt`, `jquery-3.5.1-sizzle.txt` |
| js-cookie | 2.2.0 | MIT; `js-cookie-2.2.0.txt` |
| Barba core | 2.10.3 | MIT; `@barba-core-2.10.3.txt` |
| vanilla-lazyload | 17.6.1 | MIT; `vanilla-lazyload-17.6.1.txt` |
| GSAP and ScrollTrigger | 3.9.1 | GSAP Standard License, **not MIT**; see edition notes below |

The Locomotive JavaScript body matches the official 4.1.3 npm distribution (SHA-256 `351253ae16600278c6a8b3f4945424faeb2566b955e4cfb3dde7d61823194005`). The added header points to the accompanying licenses without changing the runtime body.

Locomotive's bundle also contains virtual-scroll, smoothscroll-polyfill, bezier-easing, object-assign, tiny-emitter, Lethargy and bindall-standalone. Their MIT texts and copyright notices are included. Barba's dependency notices for is-promise and path-to-regexp are also included. For these bundled dependencies, the manifest's `licenseSourceVersion` identifies the package from which the license was obtained; it is **not** proof of an exact independently identified version inside the compiled bundle.

The GSAP 3.9.1 npm package carries GreenSock's 2021 copyright notice and a reference to its Standard "No Charge" license, but no standalone license text. `gsap-3.9.1-package-notice.txt` preserves that provenance. `gsap-standard-license-2025.txt` separately preserves the official current terms, effective 30 April 2025 and last modified 30 May 2025, retrieved on 12 October 2026. It is not represented as the recovered 2021 license. The official terms incorporate [Webflow's Terms of Service](https://webflow.com/legal/terms) and distinguish permitted website implementation from prohibited competing visual animation tools. Consult the [official GSAP license](https://gsap.com/community/standard-license/) for changes and other uses.

## Fonts

| Font | Rights / terms | Included license |
|---|---|---|
| Modified Inter static faces, weights 300 / 450 / 800 | Copyright 2016 The Inter Project Authors; SIL OFL 1.1 | `assets/fonts/LICENSE.txt` |
| Source Han Serif subsets, named Bloom Serif | Adobe / Source Han Serif contributors; SIL OFL 1.1 | `assets/fonts/reading/source-han-license.txt` |
| LXGW WenKai subsets | LXGW WenKai contributors; SIL OFL 1.1 | `assets/fonts/reading/wenkai-license.txt` |

The Inter files are modified faces rather than untouched upstream Inter. Their existing modification record is retained. The commercial reference-font metrics used during the original generation remain a separate unresolved provenance question; attaching OFL does not resolve that question. Commercial reference-font files are not included in the website or repository. The current website build uses the existing WOFF2 assets and does not require those reference files.

The Source Han Serif and WenKai license files remain unchanged, including original notices and naming conditions. Any future font changes must continue to comply with their own licenses.

## Build tooling

Eleventy, Cheerio, Playwright Core and their npm dependencies are development dependencies governed by the license files in their respective packages. They are installed by `npm ci` and are not copied into the published website. This notice does not relicense those packages.

## Rights concerns

The four-language website provides a copyright notice and contact page. Rights concerns can also be sent to [jackkkkk1e@proton.me](mailto:jackkkkk1e@proton.me), identifying the relevant page or resource. A contact mechanism does not confer authorization or waive existing rights.

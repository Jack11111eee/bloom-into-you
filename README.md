[![在线访问](https://img.shields.io/badge/Bloom_Into_You-%E5%9C%A8%E7%BA%BF%E8%AE%BF%E9%97%AE-ff9bb2?style=for-the-badge&logo=githubpages&logoColor=white)](https://jack11111eee.github.io/bloom-into-you/)

# Bloom Into You 🌸

> **网站已上线！**
>
> 戳这里直接在线体验 👉 [**传送门：Bloom Into You Web**](https://jack11111eee.github.io/bloom-into-you/)

## 本地运行

需要 Node.js 24 和 npm。

```bash
npm ci
npm run serve
```

访问终端显示的本地地址。`npm run build` 生成 `dist/`；`npm run build:pages`
将已有 `dist/` 转为 GitHub Pages 项目路径，生成 `dist-pages/`。

## 构建与检查

```bash
npm run build
node scripts/check-i18n.mjs
node scripts/check-about-essay.mjs
node scripts/check-links.mjs
node scripts/test-i18n-build.mjs
npm run build:pages
node scripts/check-pages.mjs
```

默认 Pages 地址为上述在线地址。其它部署地址可通过 `PAGES_URL` 环境变量传给
`build:pages` 和 `check-pages.mjs`，地址需以 `/` 结尾。推送到 `main` 后由
`.github/workflows/pages.yml` 构建、检查并发布。

每页页脚提供版权声明与联系页链接。完整声明位于 `/copyright/`，
简体中文、繁体中文和日文分别位于对应语言前缀下。

第三方代码、字体许可及尚待核实的权属边界见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。具体许可文本随站发布在
`assets/licenses/` 和 `assets/fonts/`；这些说明不授予原作图片或参考站代码的使用许可。

## 文件边界

仓库保留 `src/`（模板、内容、四语词表和全部网站资源）、`lib/`（构建期本地化）、
依赖配置、部署工作流和六个基本脚本。字体许可证保留在 `src/assets/fonts/`。
网站运行时仍使用模板中声明的外部 JavaScript CDN。

2026-10-12 将过程文档、证据、预览与研究/开发辅助脚本停止 Git 跟踪，原开发目录
中的文件全部保留。`docs/`、根目录过程文档和其余 `scripts/` 由 `.gitignore` 排除，
新克隆不需要这些文件或历史提交即可构建和部署。原版本保留在提交
`4223186913a93059dcda73d00fd50baebfdc1238`，可用 `git show <提交>:<文件路径>` 查看。

原开发目录仍可直接运行 `node scripts/build-copy-editor.mjs`（先构建网站）、
`node scripts/serve-copy-editor.mjs` 以及素材工具；这些辅助工具不随新克隆提供。
本地精简清单、原文件哈希和旧规则备份在 `docs/repository-cleanup/`。

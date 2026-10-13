[English](README.md) | [简体中文](README.zh-CN.md)

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

每页页脚提供版权声明、联系页与隐私说明链接。完整声明位于 `/copyright/`，
简体中文、繁体中文和日文分别位于对应语言前缀下。

版权页最下方链接至独立的 `/image-sources/` 图片来源页，普通页脚不增加来源入口。
来源页只记录已找到的同画面网页线索，不证明本站当初取得图片的渠道，也不代表转载许可。

站主有权授权的原创随笔/人物与关系评论正文按
[CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) 提供。
具体六篇文章、署名方式和第三方引文排除范围见 [LICENSING.md](LICENSING.md)。
参考站模板、设计、动效、代码、图片及字体不在该授权内；这不是全仓库许可。

## 权利检查与联系

每次构建会核对 `lib/rights-register.json`、固定素材基线和脚本来源哈希。
现有待核实素材保留原字节；站主复核的对白移除另记原始哈希，权利状态仍未核实。
增加或修改图片/字体必须记录来源、权利依据、
适用范围、审核人与审核日期。授权到期会阻止构建。`suspended`/`retired` 资源
不得进入发布目录或页面引用；登记为待核实不代表已取得授权。

运行 `node --test lib/rights.test.mjs` 验证这些防回流条件。
运行 `node lib/setup-git-hooks.mjs` 安装本仓库的提交邮箱检查；它保留现有姓名、
邮箱与全局设置，已有其它 hooks 时会要求手动整合。检查作者与提交者邮箱，
以及将要推送的新提交；持续集成也检查新增提交范围。

权利人可通过 `/copyright/` 的说明及邮箱提出问题。联系页的字段仅展示，全部禁用，
没有表单提交端点。邮箱链接使用访客自己的邮件程序；本仓库不发送邮件。
需要用自己的邮箱手动确认联系地址可收件、可回复，并管理邮件服务的账户安全。

处理记录工具为 `node lib/rights-cases.mjs`：

```bash
node lib/rights-cases.mjs create CR-YYYYMMDD-short-name /private/path/received.json
node lib/rights-cases.mjs event CR-YYYYMMDD-short-name acknowledged /private/path/acknowledged.json
node lib/rights-cases.mjs due
```

工具列出各阶段必填项，要求经过收件、确认、审查、决定、核验处理、通知和结案。
记录写入被忽略的 `docs/rights-private/`，不要把私人往来或证明材料提交到 Git。
通知记录只代表你手动发送后登记，不会触发发送。结案90天后提示保留期限复查，
不会自动删除；附件、邮箱与备份需要另行检查。

第三方代码、字体许可及尚待核实的权属边界见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。具体许可文本随站发布在
`assets/licenses/` 和 `assets/fonts/`；这些说明不授予原作图片或参考站代码的使用许可。

## 文件边界

仓库保留 `src/`（模板、内容、四语词表和全部网站资源）、`lib/`（构建期本地化）、
依赖配置、部署工作流和六个基本脚本。字体许可证保留在 `src/assets/fonts/`。
网站运行时的 JavaScript、字体和媒体均自托管，固定版本脚本的来源与哈希记录在
`src/assets/vendor/manifest.json`。页面提供四语隐私说明；联系表单停用，使用邮箱联系。

2026-10-12 将过程文档、证据、预览与研究/开发辅助脚本停止 Git 跟踪，原开发目录
中的文件全部保留。`docs/`、根目录过程文档和其余 `scripts/` 由 `.gitignore` 排除，
新克隆不需要这些文件或历史提交即可构建和部署。完整原版本保留在站主的本地恢复
备份中；清理后的公开历史不保证含旧研究文件，请勿把公开提交页面作为原件备份。

原开发目录仍可直接运行 `node scripts/build-copy-editor.mjs`（先构建网站）、
`node scripts/serve-copy-editor.mjs` 以及素材工具；这些辅助工具不随新克隆提供。
本地精简清单、原文件哈希和旧规则备份在 `docs/repository-cleanup/`。

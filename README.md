# tycookbook

一个用于打通「GitHub 提交 → Cloudflare Pages 自动部署」流水线的最小站点。

线上地址：<https://tycookbook.pages.dev>

## 它是怎么工作的

1. 任何人对 `main` 分支提交并 push。
2. Cloudflare Pages 通过 Git 集成自动拉取代码，运行 `node build.mjs`。
3. `build.mjs` 读取本次提交的 SHA、分支和构建时间，把 `src/index.html` 渲染成 `dist/index.html`。
4. Cloudflare Pages 把 `dist/` 发布到 `tycookbook.pages.dev`。

页面上的「构建回执」全部来自构建环境本身：commit 或构建时间变了，就说明自动部署生效了。

构建脚本读取的环境变量：

| 变量 | 来源 | 用途 |
| --- | --- | --- |
| `CF_PAGES_COMMIT_SHA` | Cloudflare Pages 构建环境 | 本次部署对应的提交 |
| `CF_PAGES_BRANCH` | Cloudflare Pages 构建环境 | 部署分支 |
| `CF_PAGES_URL` | Cloudflare Pages 构建环境 | 本次部署的线上地址 |

本地构建时这些变量不存在，脚本会退回读取本地 git 信息。

## 本地构建

```sh
node build.mjs
npx serve dist
```

打开 <http://localhost:3000> 查看。页面里的提交和时间取自本地仓库和当前时间。

## 首次部署（Cloudflare Pages）

在 Cloudflare 控制台创建 Pages 项目并连接本仓库：

- 构建命令：`node build.mjs`
- 输出目录：`dist`
- 生产分支：`main`

创建后每次向 `main` push 都会自动构建并发布；其他分支会得到独立的预览地址。

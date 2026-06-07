# 产品开发执行管理站

一个可以托管在 GitHub Pages 的静态管理网站。它用 GitHub 仓库保存数据和媒体文件，包含两个互相隔离的模块：

- 产品开发：管理多个开发者，以及每个开发者下面的产品清单、功能需求、参考图片/视频、参考链接和硬件设备。
- 执行模块：独立管理多个执行方案，每个方案包含执行描述、事项状态和反馈。
- 媒体库：上传、预览khjgkuj、复制链接和删除 `media/` 目录中的图片/视频资料。

## 本地运行

```bash
npm install
npm run dev
```

## 部署到 GitHub Pages

1. 新建一个 GitHub 仓库，把本项目推送到 `main` 分支。
2. 进入仓库 `Settings -> Pages`，Source 选择 `GitHub Actions`。
3. 推送后 `.github/workflows/deploy.yml` 会自动构建并发布到 GitHub Pages。
4. `vite.config.ts` 会在 GitHub Actions 中自动把站点路径设置为 `/<repo>/`。

## 首次连接 GitHub

打开网站后，在连接弹窗中填写：

- Owner：GitHub 用户名或组织名。
- Repo：仓库名。
- Branch：通常是 `main`。
- Personal Access Token：需要具备该仓库 Contents 读写权限。

建议使用 Fine-grained token，并仅授权目标仓库：

- Repository permissions -> Contents -> Read and write
- Metadata -> Read-only

Token 会保存在当前浏览器的 `localStorage` 中。请勿在公共电脑上使用长期有效的 Token。

## 本地草稿和初始数据

未连接 GitHub 时，你在页面里创建的开发者、产品和执行方案会自动保存为当前浏览器的本地草稿。刷新页面后仍会恢复这些草稿数据。

当你之后在页面里连接 GitHub 仓库时，网站会检测本地草稿：

- 如果仓库里的 `data/db.json` 为空，会自动把本地草稿写入仓库，作为初始数据。
- 如果仓库里已经有数据，会询问是否用本地草稿覆盖仓库数据；取消则读取仓库数据。

注意：未连接 GitHub 时，图片/视频文件不能真正上传到仓库。可以先填写文字数据或使用外链；实际文件需要连接 GitHub 后上传到 `media/` 目录。

## 数据和媒体位置

- 数据文件：`data/db.json`
- 上传媒体：`media/`

每次保存都会通过 GitHub Contents API 提交到仓库，因此 GitHub 会保留版本历史。

## 重要说明

如果仓库是公开仓库，`data/db.json` 和 `media/` 下的文件也会公开可见。若内容敏感，请使用私有仓库，并确认你的 GitHub Pages 权限方案满足私有仓库发布需求。
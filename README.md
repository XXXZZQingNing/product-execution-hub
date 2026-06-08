# 产品开发执行管理站

一个可以托管在 GitHub Pages 的静态管理网站。它用 GitHub 仓库保存数据和媒体文件，包含两个互相隔离的模块：

- 产品开发：管理多个开发者，以及每个开发者下面的产品清单、功能需求、参考图片/视频、参考链接和硬件设备。
- 执行模块：独立管理多个执行方案，每个方案包含执行描述、事项状态和反馈。
- 媒体库：上传、预览、复制链接和删除 `media/` 目录中的图片/视频资料。

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

## 访客只读与管理员编辑

网站内置了公开仓库地址，访客打开链接后可以直接浏览：

- 开发者与产品清单
- 执行方案与事项
- 媒体库中的图片/视频

访客**不需要**填写任何 GitHub 配置。

只有管理员需要点击 **开启编辑**，填写具备 Contents 读写权限的 Personal Access Token 后，才能：

- 新增/编辑/删除开发者、产品、执行方案
- 上传/删除图片和视频
- 自动保存到 GitHub 仓库

建议使用 Fine-grained token，并仅授权目标仓库：

- Repository permissions -> Contents -> Read and write
- Metadata -> Read-only

Token 会保存在当前浏览器的 `localStorage` 中。请勿在公共电脑上使用长期有效的 Token。

## 多人协作

网站会每 30 秒自动检查 GitHub 仓库是否有新数据，并在你切回页面时自动刷新。如果同事刚更新过内容，页面顶部会出现黄色提示，你也可以点击 **同步** 立即拉取。

保存时会先读取仓库最新 `data/db.json`，再把你和同事的数据按 ID 合并，避免两个人同时给同一开发者新增不同产品时被互相覆盖。

## 数据和媒体位置

- 数据文件：`data/db.json`
- 上传媒体：`media/`

每次保存都会通过 GitHub Contents API 提交到仓库，因此 GitHub 会保留版本历史。

## 重要说明

如果仓库是公开仓库，`data/db.json` 和 `media/` 下的文件也会公开可见。若内容敏感，请使用私有仓库，并确认你的 GitHub Pages 权限方案满足私有仓库发布需求。
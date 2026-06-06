# Mindless 项目指南

## 应用图标更新
当需要更新应用图标时，必须按照以下流程执行：

1. 创建 squircle 形状的 `app-icon.png` 源文件
2. 运行 `npm run tauri icon` 生成所有平台图标
3. 清理构建缓存和 macOS 图标缓存
4. 验证图标形状（四角透明，中心不透明）

详细步骤请参考 `ICON_UPDATE_GUIDE.md`。

## 常用命令
- 开发模式：`npm run tauri dev`
- 构建应用：`npm run tauri build`
- 生成图标：`npm run tauri icon`
- 清理缓存：`cd src-tauri && cargo clean`

## 技术栈
- 前端：React + TypeScript + Vite
- 后端：Tauri (Rust)
- 数据库：SQLite
- 样式：Tailwind CSS

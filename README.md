# Mindless - 个人任务管理应用

一款仿滴答清单(TickTick)的个人任务管理桌面应用，采用 Tauri v2 + React 框架构建。

## 功能特性

- **任务管理**: 创建、编辑、删除任务，支持子任务、步骤、标签、优先级
- **习惯追踪**: 打卡习惯，统计连续天数
- **倒数日**: 管理重要日期的倒计时
- **多视图**: 列表、日历、看板、四宫格视图
- **多语言**: 中文、英文、日文支持
- **本地存储**: SQLite 数据库，数据隐私安全

## 技术栈

- **前端**: React 18 + TypeScript
- **后端**: Tauri v2 (Rust)
- **状态管理**: Zustand + React Query
- **数据库**: SQLite + Drizzle ORM
- **UI**: Tailwind CSS + Radix UI
- **国际化**: i18next

## 开发指南

### 环境要求

- Node.js >= 18
- Rust >= 1.70
- macOS / Windows / Linux

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri dev
```

### 构建生产版本

```bash
npm run tauri build
```

## 项目结构

```
mindless/
├── src/                    # React 前端
│   ├── components/         # UI 组件
│   ├── pages/              # 页面组件
│   ├── hooks/              # 自定义 Hooks
│   ├── stores/             # Zustand Stores
│   ├── services/           # 服务层
│   ├── types/              # TypeScript 类型
│   └── i18n/               # 国际化
├── src-tauri/              # Tauri Rust 后端
│   ├── src/
│   │   ├── commands/       # Tauri 命令
│   │   ├── db/             # 数据库层
│   │   └── services/       # 业务逻辑
│   └── icons/              # 应用图标
└── drizzle/                # Drizzle ORM 配置
    ├── schema.ts           # 数据库 Schema
    └── migrations/         # 迁移文件
```

## 许可证

MIT

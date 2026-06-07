# Mindless 实现计划 - 快速摘要

## 📋 文档位置
完整实现计划: `task-habit-countdown-app-plan.md` (59KB, 1934行)

## 🎯 核心技术选型

### 前端技术栈
- **框架**: React 18 + TypeScript
- **状态管理**: Zustand (全局) + React Query (服务端)
- **路由**: React Router v6
- **UI**: Radix UI + Tailwind CSS
- **国际化**: i18next + react-i18next
- **日期处理**: date-fns

### 后端技术栈
- **框架**: Tauri v2 (Rust)
- **数据库**: SQLite + Drizzle ORM
- **通知**: tauri-plugin-notification
- **其他插件**: sql, dialog, system-tray

## 📊 数据模型概览

### 核心表结构
1. **tasks** - 任务 (CRUD + 优先级/标签/提醒/重复)
2. **lists** - 任务清单分类
3. **habits** - 习惯定义
4. **habit_logs** - 习惯打卡记录
5. **countdowns** - 倒数日事件
6. **settings** - 应用设置

## 🏗️ 架构分层

```
Presentation (React Components)
    ↓
State Management (Zustand + React Query)
    ↓
Service Layer (TypeScript Services)
    ↓
Data Access (Drizzle ORM)
    ↓
Tauri Core (Rust Commands + SQLite)
```

## 📅 开发周期: 40个工作日

### 阶段划分
- **Week 1-2** (Day 1-4): 项目初始化 + 数据库层
- **Week 3** (Day 5): 国际化配置
- **Week 4** (Day 6-10): 核心UI组件
- **Week 5-6** (Day 11-21): 任务管理 + 习惯追踪
- **Week 7** (Day 22-24): 倒数日功能
- **Week 8** (Day 25-30): 多视图模式
- **Week 9** (Day 31-35): 通知系统 + 优化
- **Week 10** (Day 36-40): 测试 + 打包发布

## ✅ MVP功能清单

### 必需功能
- [x] 任务 CRUD + 分类/标签/优先级
- [x] 任务提醒 + 重复任务
- [x] 习惯打卡 + 连续天数统计
- [x] 倒数日创建 + 动态计算
- [x] 四种视图: 列表/日历/看板/四宫格
- [x] 三语切换: 中文/英文/日文
- [x] macOS原生集成 (通知/托盘)

## 🔑 关键技术难点

1. **重复任务生成** → 使用 rrule.js 库
2. **习惯streak计算** → Rust后端高效算法
3. **跨视图数据同步** → React Query单一数据源
4. **大量任务性能** → 虚拟滚动 + 分页加载
5. **离线优先架构** → SQLite本地存储

## 🧪 测试策略

- **单元测试**: Vitest (工具函数/Hooks)
- **集成测试**: React Testing Library (组件交互)
- **E2E测试**: Playwright (用户旅程)
- **手动测试**: 功能checklist + 边界情况

## 📦 交付物

1. 完整的 Tauri v2 + React 应用源码
2. SQLite 数据库 schema 和迁移脚本
3. 三语翻译文件 (zh/en/ja)
4. macOS .dmg 安装包 (< 50MB)
5. 用户使用文档 (README.md)

## 🎨 设计原则

- **简约现代**: 极简UI，减少认知负担
- **本地优先**: 数据隐私安全，离线可用
- **响应式**: 适配不同窗口大小
- **无障碍**: ARIA标签，键盘导航
- **性能优先**: < 2秒启动，流畅交互

## ⚠️ 风险提示

1. Tauri v2 插件稳定性 → 预留buffer时间
2. 重复任务逻辑复杂 → 使用成熟库
3. 性能瓶颈 → 早期引入虚拟滚动

## 🚀 下一步行动

1. 执行阶段1: 项目初始化 (Day 1-2)
2. 验证开发环境配置
3. 搭建基础项目结构
4. 开始数据库层实现

---

*生成时间: 2026-06-04*
*详细计划请查看: task-habit-countdown-app-plan.md*

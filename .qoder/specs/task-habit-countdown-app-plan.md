# Mindless - 个人任务管理应用实现计划

## Context: 项目背景和目标

### 项目概述
**Mindless** 是一款仿滴答清单(TickTick)的个人任务管理桌面应用，采用 Tauri v2 框架构建，支持 macOS 原生体验并具备跨平台扩展能力。应用聚焦三大核心功能：任务管理、习惯追踪、倒数日提醒，提供多视图模式满足不同使用场景。

### 目标用户
- 需要高效管理日常任务的职场人士
- 希望培养良好习惯的自我提升者
- 需要记录重要日期和倒计时的用户

### 核心价值主张
1. **简洁高效**: 极简 UI 设计，减少认知负担
2. **本地优先**: SQLite 本地存储，数据隐私安全
3. **多语言支持**: 中文、英文、日文三语切换
4. **跨平台潜力**: macOS 首发，架构支持 Windows/Linux 扩展

### MVP 功能范围
- ✅ 任务 CRUD + 分类/标签/优先级/提醒/重复任务
- ✅ **子任务**: 任务支持添加多级子任务，支持拖拽排序
- ✅ **步骤管理**: 任务支持添加步骤清单，步骤支持日期时间设置和拖拽排序
- ✅ **富文本编辑**: 
  - 步骤描述: 支持加粗、斜体、下划线、链接
  - 任务描述: 支持完整 Markdown 语法 (除一级标题)
- ✅ 习惯打卡 + 连续天数统计 + 习惯提醒
- ✅ 倒数日创建 + 动态计算 + 提醒通知
- ✅ 四种视图: 列表视图、日历视图、看板视图、四宫格视图
- ✅ 多语言切换 (zh/en/ja)
- ✅ macOS 原生集成 (系统托盘、通知、快捷键)
- ✅ **任务排序**: 支持按截止日期 (dueDate)、开始日期 (startDate) 排序
- ✅ **任务分组**: 支持按优先级、清单 (List) 分组显示
- ✅ **多级标签**: 标签支持最多四级子标签，可设置颜色和 emoji
- ✅ **灵活优先级**: 默认 0-3 级 (4级)，设置中可开启 0-10 级 (11级) 详细模式

### 应用初始化配置
**默认清单:** 
- Inbox (收件箱) - 所有新任务的默认存放位置
- Today (今天) - 自动显示今天需要完成的任务
- Next 7 Days (未来7天) - 显示未来7天的任务
- Eisenhower Matrix (艾森豪威尔矩阵) - 按重要性分组的四象限视图

**启动页面:** 仪表盘首页 (HomePage)
- 显示今日任务概览
- 即将到期的习惯提醒
- 即将到来的倒数日

**应用图标:** 使用占位图标，用户将稍后提供自定义设计

---

## Architecture: 系统架构和技术栈

### 技术选型决策

#### 前端框架: React vs Vue
**推荐选择: React 18 + TypeScript**

**理由:**
1. **生态成熟度**: Tauri v2 对 React 支持更完善，社区案例更多
2. **类型安全**: TypeScript + React 组合提供更强的类型推断
3. **组件复用**: React Hooks 模式更适合复杂状态逻辑复用
4. **性能优化**: React 18 并发特性适合频繁更新的待办列表
5. **人才储备**: React 开发者资源更丰富

**备选方案:** Vue 3 + TypeScript (若团队熟悉 Vue 生态)

#### 状态管理方案
**推荐组合:**
- **Zustand**: 轻量级全局状态管理 (替代 Redux)
- **React Query (TanStack Query)**: 服务端状态管理 (SQLite 查询缓存)
- **React Hook Form**: 表单状态管理

**理由:**
- Zustand 比 Redux 更简洁，比 Context API 性能更好
- React Query 提供自动缓存、后台同步、乐观更新
- 避免过度工程化，MVP 阶段无需复杂状态流

#### 路由方案
**推荐: React Router v6**

**理由:**
- 声明式路由配置
- 支持嵌套路由 (适合侧边栏+主内容布局)
- 懒加载支持 (代码分割)
- Tauri 单页应用友好

#### UI 组件库
**推荐: Radix UI + Tailwind CSS**

**理由:**
- Radix UI 提供无样式可访问组件原语
- Tailwind CSS 快速构建自定义设计系统
- 完全控制视觉风格，避免第三方组件库的臃肿
- 符合"简约现代"设计要求

**备选:** shadcn/ui (基于 Radix UI 的预构建组件集合)

#### 数据库层
- **SQLite**: 通过 `tauri-plugin-sql` 访问
- **Drizzle ORM**: 类型安全的 SQL 查询构建器
- **数据库迁移**: drizzle-kit 管理 schema 演进

#### 国际化方案
**推荐: i18next + react-i18next**

**理由:**
- 成熟的 React 国际化解决方案
- 支持懒加载语言包
- 命名空间管理 (按模块拆分翻译)
- 检测系统语言自动切换

#### 通知系统
- **Tauri Notification API**: 原生系统通知
- **自定义通知中心**: 应用内通知面板

#### 日期处理
**推荐: date-fns**

**理由:**
- 函数式 API，tree-shaking 友好
- 完善的国际化支持
- 轻量级 (相比 moment.js)

### 系统架构图

```
┌─────────────────────────────────────────────────┐
│                  Mindless App                    │
├─────────────────────────────────────────────────┤
│              Presentation Layer                  │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │  Views   │ │ Components│ │   Custom Hooks  │ │
│  │ (Routes) │ │  (UI Lib) │ │  (Business Log) │ │
│  └──────────┘ └──────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────┤
│              State Management                    │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │   Zustand    │    │   React Query        │   │
│  │ (Client State│    │ (Server/DB State)    │   │
│  └──────────────┘    └──────────────────────┘   │
├─────────────────────────────────────────────────┤
│              Service Layer                       │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │ Task     │ │ Habit    │ │ Countdown       │ │
│  │ Service  │ │ Service  │ │ Service         │ │
│  └──────────┘ └──────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────┤
│              Data Access Layer                   │
│  ┌──────────────────────────────────────────┐   │
│  │         Drizzle ORM + SQLite             │   │
│  └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│              Tauri Core (Rust)                   │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │ SQL      │ │ Notif.   │ │ System Tray     │ │
│  │ Plugin   │ │ Plugin   │ │ Plugin          │ │
│  └──────────┘ └──────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 项目目录结构

```
mindless/
├── src-tauri/                    # Tauri Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Tauri 配置
│   ├── capabilities/             # 权限能力配置
│   │   ├── default.json
│   │   └── desktop.json
│   ├── src/
│   │   ├── main.rs               # 应用入口
│   │   ├── lib.rs                # 库导出
│   │   ├── commands/             # Tauri 命令模块
│   │   │   ├── mod.rs
│   │   │   ├── tasks.rs          # 任务相关命令
│   │   │   ├── habits.rs         # 习惯相关命令
│   │   │   ├── countdowns.rs     # 倒数日相关命令
│   │   │   └── notifications.rs  # 通知相关命令
│   │   ├── db/                   # 数据库层
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs     # SQLite 连接管理
│   │   │   ├── migrations.rs     # 数据库迁移
│   │   │   └── models.rs         # Rust 数据模型
│   │   ├── services/             # 业务逻辑服务
│   │   │   ├── mod.rs
│   │   │   ├── task_service.rs
│   │   │   ├── habit_service.rs
│   │   │   └── countdown_service.rs
│   │   └── utils/                # 工具函数
│   │       ├── mod.rs
│   │       ├── date_utils.rs
│   │       └── notification_utils.rs
│   ├── icons/                    # 应用图标
│   │   ├── icon.icns             # macOS 图标
│   │   └── icon.png
│   └── build.rs
│
├── src/                          # React 前端
│   ├── main.tsx                  # 应用入口
│   ├── App.tsx                   # 根组件
│   ├── vite-env.d.ts
│   │
│   ├── components/               # UI 组件
│   │   ├── ui/                   # 基础 UI 组件 (Radix + Tailwind)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/               # 布局组件
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MainContent.tsx
│   │   │
│   │   ├── task/                 # 任务相关组件
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   ├── TaskFilters.tsx
│   │   │   ├── PrioritySelector.tsx
│   │   │   ├── TagInput.tsx
│   │   │   ├── DueDatePicker.tsx
│   │   │   └── RecurrenceEditor.tsx
│   │   │
│   │   ├── habit/                # 习惯相关组件
│   │   │   ├── HabitList.tsx
│   │   │   ├── HabitItem.tsx
│   │   │   ├── HabitForm.tsx
│   │   │   ├── HabitCalendar.tsx
│   │   │   ├── StreakDisplay.tsx
│   │   │   └── HabitStats.tsx
│   │   │
│   │   ├── countdown/            # 倒数日相关组件
│   │   │   ├── CountdownList.tsx
│   │   │   ├── CountdownItem.tsx
│   │   │   ├── CountdownForm.tsx
│   │   │   └── CountdownCard.tsx
│   │   │
│   │   ├── views/                # 视图模式组件
│   │   │   ├── ListView.tsx
│   │   │   ├── CalendarView.tsx
│   │   │   ├── KanbanView.tsx
│   │   │   └── GridView.tsx      # 四宫格视图
│   │   │
│   │   ├── common/               # 通用组件
│   │   │   ├── EmptyState.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── NotificationPanel.tsx
│   │   │   └── LanguageSwitcher.tsx
│   │   │
│   │   └── icons/                # SVG 图标组件
│   │       ├── CheckIcon.tsx
│   │       ├── CalendarIcon.tsx
│   │       └── ...
│   │
│   ├── pages/                    # 页面组件 (路由级别)
│   │   ├── HomePage.tsx          # 仪表盘首页 (默认启动页)
│   │   ├── TasksPage.tsx
│   │   ├── HabitsPage.tsx
│   │   ├── CountdownsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useTasks.ts
│   │   ├── useHabits.ts
│   │   ├── useCountdowns.ts
│   │   ├── useNotifications.ts
│   │   ├── useTheme.ts
│   │   ├── useLanguage.ts
│   │   └── useKeyboardShortcuts.ts
│   │
│   ├── stores/                   # Zustand Stores
│   │   ├── useTaskStore.ts
│   │   ├── useHabitStore.ts
│   │   ├── useCountdownStore.ts
│   │   ├── useAppStore.ts        # 全局应用状态
│   │   └── useViewStore.ts       # 视图状态
│   │
│   ├── services/                 # 前端服务层
│   │   ├── taskService.ts
│   │   ├── habitService.ts
│   │   ├── countdownService.ts
│   │   └── notificationService.ts
│   │
│   ├── queries/                  # React Query hooks
│   │   ├── useTaskQueries.ts
│   │   ├── useHabitQueries.ts
│   │   └── useCountdownQueries.ts
│   │
│   ├── lib/                      # 工具库
│   │   ├── api.ts                # Tauri invoke 封装
│   │   ├── db.ts                 # 数据库客户端
│   │   ├── date.ts               # 日期工具 (date-fns 封装)
│   │   ├── validation.ts         # 表单验证 (Zod schemas)
│   │   └── constants.ts          # 常量定义
│   │
│   ├── i18n/                     # 国际化
│   │   ├── config.ts             # i18next 配置
│   │   ├── locales/
│   │   │   ├── zh/
│   │   │   │   ├── common.json
│   │   │   │   ├── tasks.json
│   │   │   │   ├── habits.json
│   │   │   │   └── countdowns.json
│   │   │   ├── en/
│   │   │   │   ├── common.json
│   │   │   │   ├── tasks.json
│   │   │   │   ├── habits.json
│   │   │   │   └── countdowns.json
│   │   │   └── ja/
│   │   │       ├── common.json
│   │   │       ├── tasks.json
│   │   │       ├── habits.json
│   │   │       └── countdowns.json
│   │   └── index.ts
│   │
│   ├── styles/                   # 全局样式
│   │   ├── globals.css
│   │   ├── theme.css             # 主题变量
│   │   └── animations.css
│   │
│   ├── types/                    # TypeScript 类型定义
│   │   ├── task.ts
│   │   ├── habit.ts
│   │   ├── countdown.ts
│   │   ├── common.ts
│   │   └── index.ts
│   │
│   └── assets/                   # 静态资源
│       ├── images/
│       └── fonts/
│
├── public/                       # 公共静态文件
│   └── favicon.ico
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── components.json               # shadcn/ui 配置 (如使用)
├── drizzle/                      # Drizzle ORM 配置
│   ├── schema.ts                 # 数据库 Schema 定义
│   ├── migrations/               # 迁移文件
│   └── drizzle.config.ts
├── .env.example
├── .gitignore
└── README.md
```

---

## Data Models: 数据模型设计

### SQLite 表结构设计

#### 1. tasks 表 (任务)

```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,                          -- UUID v4
    title TEXT NOT NULL,                          -- 任务标题
    description TEXT DEFAULT '',                  -- 任务描述
    is_completed INTEGER NOT NULL DEFAULT 0,      -- 是否完成 (0/1)
    
    -- 优先级: 默认0-3级，设置开启后可用0-10级
    priority INTEGER NOT NULL DEFAULT 0,          -- 范围: 0-3 或 0-10
    
    -- 日期时间
    due_date TEXT,                                -- 截止日期 (ISO 8601)
    due_time TEXT,                                -- 截止时间 (HH:mm)
    start_date TEXT,                              -- 开始日期
    reminder_time TEXT,                           -- 提醒时间 (ISO 8601)
    
    -- 重复任务配置 (JSON 字符串)
    recurrence_rule TEXT,                         -- e.g., "FREQ=DAILY;INTERVAL=1"
    recurrence_end_date TEXT,                     -- 重复结束日期
    
    -- 分类和标签
    list_id TEXT REFERENCES lists(id),            -- 所属清单
    tags TEXT,                                    -- JSON 数组存储标签ID
    
    -- 排序和分组
    sort_order REAL NOT NULL DEFAULT 0,           -- 拖拽排序权重
    sort_by TEXT DEFAULT 'due_date',              -- 排序字段: 'due_date' | 'start_date' | 'priority' | 'created_at'
    group_by TEXT DEFAULT 'none',                 -- 分组字段: 'none' | 'priority' | 'list'
    
    -- 元数据
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,                            -- 完成时间
    deleted_at TEXT                               -- 软删除时间
);

-- 索引
CREATE INDEX idx_tasks_list_id ON tasks(list_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_start_date ON tasks(start_date);
CREATE INDEX idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX idx_tasks_sort_order ON tasks(sort_order);
```

#### 1.1 subtasks 表 (子任务)

```sql
CREATE TABLE subtasks (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,  -- 所属任务
    parent_subtask_id TEXT REFERENCES subtasks(id),                 -- 父子任务ID (支持多级)
    title TEXT NOT NULL,                                            -- 子任务标题
    is_completed INTEGER NOT NULL DEFAULT 0,                        -- 是否完成
    sort_order REAL NOT NULL DEFAULT 0,                             -- 拖拽排序权重
    level INTEGER NOT NULL DEFAULT 0,                               -- 层级深度 (0-3, 最多4级)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX idx_subtasks_parent_id ON subtasks(parent_subtask_id);
CREATE INDEX idx_subtasks_level ON subtasks(level);
```

#### 1.2 steps 表 (任务步骤)

```sql
CREATE TABLE steps (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,   -- 所属任务
    description TEXT NOT NULL,                                      -- 步骤描述 (支持富文本)
    due_date TEXT,                                                  -- 步骤截止日期
    due_time TEXT,                                                  -- 步骤截止时间
    is_completed INTEGER NOT NULL DEFAULT 0,                        -- 是否完成
    sort_order REAL NOT NULL DEFAULT 0,                             -- 拖拽排序权重
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_steps_task_id ON steps(task_id);
CREATE INDEX idx_steps_due_date ON steps(due_date);
CREATE INDEX idx_steps_sort_order ON steps(sort_order);
```

#### 2. lists 表 (任务清单/分类)

```sql
CREATE TABLE lists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',                 -- 清单颜色
    icon TEXT DEFAULT 'folder',                   -- 清单图标
    sort_order REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 默认清单
INSERT INTO lists (id, name, color, icon) VALUES 
    ('inbox', 'Inbox', '#3B82F6', 'inbox'),
    ('today', 'Today', '#10B981', 'calendar'),
    ('next7days', 'Next 7 Days', '#F59E0B', 'clock'),
    ('eisenhower', 'Eisenhower Matrix', '#8B5CF6', 'grid');
```

#### 3. habits 表 (习惯)

```sql
CREATE TABLE habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                           -- 习惯名称
    description TEXT DEFAULT '',                  -- 习惯描述
    icon TEXT DEFAULT 'star',                     -- 习惯图标
    color TEXT DEFAULT '#8B5CF6',                 -- 习惯颜色
    
    -- 目标配置
    target_type TEXT NOT NULL DEFAULT 'binary',   -- binary(是/否), count(次数), duration(时长)
    target_value INTEGER DEFAULT 1,               -- 目标值 (次数或分钟数)
    
    -- 频率配置
    frequency TEXT NOT NULL DEFAULT 'daily',      -- daily, weekly, custom
    frequency_days TEXT,                          -- JSON: [1,3,5] 表示周一三五 (0=周日)
    
    -- 提醒
    reminder_time TEXT,                           -- 提醒时间 (HH:mm)
    reminder_enabled INTEGER NOT NULL DEFAULT 0,
    
    -- 统计
    current_streak INTEGER NOT NULL DEFAULT 0,    -- 当前连续天数
    longest_streak INTEGER NOT NULL DEFAULT 0,    -- 最长连续天数
    total_completions INTEGER NOT NULL DEFAULT 0, -- 总完成次数
    
    -- 元数据
    start_date TEXT NOT NULL,                     -- 习惯开始日期
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT                              -- 归档时间
);

CREATE INDEX idx_habits_archived_at ON habits(archived_at);
```

#### 4. habit_logs 表 (习惯打卡记录)

```sql
CREATE TABLE habit_logs (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    log_date TEXT NOT NULL,                       -- 打卡日期 (YYYY-MM-DD)
    log_time TEXT NOT NULL DEFAULT (datetime('now')), -- 打卡时间
    
    -- 完成数据
    completed INTEGER NOT NULL DEFAULT 1,         -- 是否完成
    value INTEGER DEFAULT 0,                      -- 完成数值 (次数/分钟)
    note TEXT DEFAULT '',                         -- 备注
    
    UNIQUE(habit_id, log_date)                    -- 每天只能打卡一次
);

CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_log_date ON habit_logs(log_date);
```

#### 5. countdowns 表 (倒数日)

```sql
CREATE TABLE countdowns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,                          -- 倒数日标题
    description TEXT DEFAULT '',                  -- 描述
    icon TEXT DEFAULT 'flag',                     -- 图标
    color TEXT DEFAULT '#EF4444',                 -- 颜色
    
    -- 目标日期
    target_date TEXT NOT NULL,                    -- 目标日期 (YYYY-MM-DD)
    target_time TEXT,                             -- 目标时间 (HH:mm:ss)
    
    -- 类型: countdown(倒数), countup(正数/纪念)
    event_type TEXT NOT NULL DEFAULT 'countdown',
    
    -- 提醒
    reminder_enabled INTEGER NOT NULL DEFAULT 0,
    reminder_days_before INTEGER DEFAULT 0,       -- 提前 N 天提醒
    reminder_time TEXT,                           -- 提醒时间 (HH:mm)
    
    -- 重复事件 (可选)
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_rule TEXT,                         -- iCal RRULE
    
    -- 元数据
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_countdowns_target_date ON countdowns(target_date);
```

#### 6. tags 表 (标签系统)

```sql
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                           -- 标签名称
    color TEXT DEFAULT '#3B82F6',                 -- 标签颜色
    emoji TEXT DEFAULT '',                        -- 标签emoji图标
    parent_id TEXT REFERENCES tags(id),           -- 父标签ID (支持层级)
    level INTEGER NOT NULL DEFAULT 0,             -- 层级深度 (0-3, 最多4级)
    sort_order REAL NOT NULL DEFAULT 0,           -- 排序权重
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX idx_tags_parent_id ON tags(parent_id);
CREATE INDEX idx_tags_level ON tags(level);

-- 示例: 四级标签结构
-- Work (level=0)
--   └─ Project A (level=1, parent_id=Work)
--      └─ Frontend (level=2, parent_id=Project A)
--         └─ React (level=3, parent_id=Frontend)
```

#### 7. settings 表 (应用设置)

```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 默认设置
INSERT INTO settings (key, value) VALUES 
    ('language', 'zh'),
    ('theme', 'system'),
    ('start_day_of_week', '1'),                   -- 1=Monday
    ('notification_enabled', '1'),
    ('default_list_id', 'inbox'),
    ('priority_mode', 'simple'),                  -- 'simple'(0-3) | 'detailed'(0-10)
    ('task_sort_by', 'due_date'),                 -- 'due_date' | 'start_date' | 'priority' | 'created_at'
    ('task_group_by', 'none');                    -- 'none' | 'priority' | 'list'
```

### TypeScript 类型定义

```typescript
// src/types/task.ts
export type PriorityMode = 'simple' | 'detailed';
export type Priority = number; // 0-3 (simple) or 0-10 (detailed)
export type SortBy = 'dueDate' | 'startDate' | 'priority' | 'createdAt';
export type GroupBy = 'none' | 'priority' | 'list';

export interface Task {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  priority: Priority;           // 0-3 或 0-10 (取决于设置)
  dueDate?: string;             // ISO date
  dueTime?: string;             // HH:mm
  startDate?: string;
  reminderTime?: string;        // ISO datetime
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  listId?: string;
  tagIds: string[];             // 标签ID数组
  tags?: Tag[];                 // 关联的标签对象 (可选)
  sortBy: SortBy;               // 排序字段
  groupBy: GroupBy;             // 分组字段
  subtasks?: Subtask[];         // 子任务列表 (可选)
  steps?: Step[];               // 步骤列表 (可选)
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deletedAt?: string;
  sortOrder: number;
}

// src/types/subtask.ts
export interface Subtask {
  id: string;
  taskId: string;
  parentSubtaskId?: string;     // 父子任务ID
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  level: number;                // 层级深度 (0-3, 最多4级)
  createdAt: string;
  updatedAt: string;
  children?: Subtask[];         // 子任务 (树形结构)
}

// src/types/step.ts
export interface Step {
  id: string;
  taskId: string;
  description: string;          // 富文本描述 (支持加粗、斜体、下划线、链接)
  dueDate?: string;             // 步骤截止日期
  dueTime?: string;             // 步骤截止时间
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// src/types/tag.ts
export interface Tag {
  id: string;
  name: string;
  color: string;                // 标签颜色 (#RRGGBB)
  emoji: string;                // emoji图标
  parentId?: string;            // 父标签ID
  level: number;                // 层级深度 (0-3)
  sortOrder: number;
  children?: Tag[];             // 子标签 (树形结构)
  createdAt: string;
  updatedAt: string;
}

// 标签树形结构 (最多4级)
export interface TagTree {
  [tagId: string]: Tag & { children: TagTree };
}

export interface List {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// src/types/habit.ts
export type TargetType = 'binary' | 'count' | 'duration';
export type Frequency = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  targetType: TargetType;
  targetValue: number;
  frequency: Frequency;
  frequencyDays?: number[]; // 0-6 (Sun-Sat)
  reminderTime?: string;
  reminderEnabled: boolean;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  logDate: string;    // YYYY-MM-DD
  logTime: string;
  completed: boolean;
  value: number;
  note: string;
}

// src/types/countdown.ts
export type EventType = 'countdown' | 'countup';

export interface Countdown {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  targetDate: string;   // YYYY-MM-DD
  targetTime?: string;  // HH:mm:ss
  eventType: EventType;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  reminderTime?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Drizzle ORM Schema

```typescript
// drizzle/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').default(''),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  priority: integer('priority').notNull().default(0),  // 0-3 or 0-10
  dueDate: text('due_date'),
  dueTime: text('due_time'),
  startDate: text('start_date'),
  reminderTime: text('reminder_time'),
  recurrenceRule: text('recurrence_rule'),
  recurrenceEndDate: text('recurrence_end_date'),
  listId: text('list_id').references(() => lists.id),
  tagIds: text('tag_ids'), // JSON array of tag IDs
  sortBy: text('sort_by').notNull().default('due_date'),     // 'due_date' | 'start_date' | 'priority' | 'created_at'
  groupBy: text('group_by').notNull().default('none'),       // 'none' | 'priority' | 'list'
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  completedAt: text('completed_at'),
  deletedAt: text('deleted_at'),
  sortOrder: real('sort_order').notNull().default(0),
});

// Tags table (hierarchical, max 4 levels)
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').default('#3B82F6'),
  emoji: text('emoji').default(''),
  parentId: text('parent_id').references(() => tags.id),
  level: integer('level').notNull().default(0),  // 0-3
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Subtasks table (hierarchical, max 4 levels)
export const subtasks = sqliteTable('subtasks', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  parentSubtaskId: text('parent_subtask_id').references(() => subtasks.id),
  title: text('title').notNull(),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  sortOrder: real('sort_order').notNull().default(0),
  level: integer('level').notNull().default(0),  // 0-3
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Steps table (task checklist with rich text)
export const steps = sqliteTable('steps', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),  // Rich text (bold, italic, underline, links)
  dueDate: text('due_date'),
  dueTime: text('due_time'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').default(''),
  icon: text('icon').default('star'),
  color: text('color').default('#8B5CF6'),
  targetType: text('target_type').notNull().default('binary'),
  targetValue: integer('target_value').default(1),
  frequency: text('frequency').notNull().default('daily'),
  frequencyDays: text('frequency_days'), // JSON array
  reminderTime: text('reminder_time'),
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull().default(false),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  totalCompletions: integer('total_completions').notNull().default(0),
  startDate: text('start_date').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  archivedAt: text('archived_at'),
});

export const habitLogs = sqliteTable('habit_logs', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  logDate: text('log_date').notNull(),
  logTime: text('log_time').notNull().default(sql`(datetime('now'))`),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(true),
  value: integer('value').default(0),
  note: text('note').default(''),
}, (table) => ({
  uniqueIdx: table.habitId, table.logDate, // unique constraint
}));

export const countdowns = sqliteTable('countdowns', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').default(''),
  icon: text('icon').default('flag'),
  color: text('color').default('#EF4444'),
  targetDate: text('target_date').notNull(),
  targetTime: text('target_time'),
  eventType: text('event_type').notNull().default('countdown'),
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull().default(false),
  reminderDaysBefore: integer('reminder_days_before').default(0),
  reminderTime: text('reminder_time'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
  recurrenceRule: text('recurrence_rule'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
```

---

## Components: 组件架构

### 组件层级结构

```
App (Root)
├── AppLayout
│   ├── Sidebar
│   │   ├── NavigationMenu
│   │   ├── ListTree
│   │   └── LanguageSwitcher
│   │
│   ├── Header
│   │   ├── SearchBar
│   │   ├── ViewModeToggle
│   │   └── NotificationBell
│   │
│   └── MainContent
│       ├── Routes
│       │   ├── HomePage          # 仪表盘首页 (应用启动默认页)
│       │   │   ├── TodayTasks    # 今日任务概览
│       │   │   ├── UpcomingHabits # 即将到期的习惯
│       │   │   └── NearbyCountdowns # 即将到来的倒数日
│       │   │
│       │   ├── TasksPage
│       │   │   ├── TaskFilters
│       │   │   └── ViewContainer
│       │   │       ├── ListView
│       │   │       │   └── TaskItem (repeated)
│       │   │       ├── CalendarView
│       │   │       │   └── DayCell (with TaskBadges)
│       │   │       ├── KanbanView
│       │   │       │   └── KanbanColumn
│       │   │       │       └── TaskCard
│       │   │       └── GridView
│       │   │           └── TaskGridItem
│       │   │
│       │   ├── HabitsPage
│       │   │   ├── HabitList
│       │   │   │   └── HabitItem
│       │   │   │       ├── StreakDisplay
│       │   │   │       └── CheckInButton
│       │   │   └── HabitStats
│       │   │
│       │   ├── CountdownsPage
│       │   │   └── CountdownList
│       │   │       └── CountdownCard
│       │   │
│       │   └── SettingsPage
│       │
│       └── FloatingActionButtons
│           ├── AddTaskButton
│           ├── AddHabitButton
│           └── AddCountdownButton
│
└── Modals (Portal)
    ├── TaskFormModal
    ├── HabitFormModal
    ├── CountdownFormModal
    └── NotificationPanel
```

### 关键组件职责说明

#### 1. 视图容器组件 (ViewContainer)
**职责:** 根据当前视图模式渲染不同的子视图
```typescript
interface ViewContainerProps {
  viewMode: 'list' | 'calendar' | 'kanban' | 'grid';
  tasks: Task[];
}
```

#### 2. TaskItem / TaskCard
**职责:** 展示单个任务，支持拖拽、勾选、编辑
- 显示标题、优先级徽章 (0-3或0-10级)、截止日期
- 复选框切换完成状态
- 标签显示 (支持emoji和颜色，最多4级层级)
- 右键菜单 (编辑、删除、移动)
- 拖拽手柄 (看板/列表视图)

#### 2.1 TaskSortControls (任务排序控件)
**职责:** 提供任务排序功能
- 排序字段选择: 截止日期 (dueDate)、开始日期 (startDate)、优先级 (priority)、创建时间 (createdAt)
- 升序/降序切换
- 排序设置持久化到数据库

#### 2.2 TaskGroupControls (任务分组控件)
**职责:** 提供任务分组显示功能
- 分组方式选择: 无分组、按优先级、按清单 (List)
- 分组折叠/展开
- 分组头部显示统计信息

#### 2.4 SubtaskList (子任务列表)
**职责:** 展示和管理任务的子任务层级结构
- 树形结构展示子任务 (最多4级)
- 支持拖拽排序和移动
- 复选框切换完成状态
- 快速添加子任务
- 折叠/展开子层级

#### 2.5 StepList (步骤清单)
**职责:** 管理任务的步骤 checklist
- 步骤列表展示，支持拖拽排序
- 每个步骤可设置截止日期和时间
- 富文本编辑器 (加粗、斜体、下划线、链接)
- 步骤完成进度显示
- 步骤与主任务关联

#### 2.6 RichTextEditor (富文本编辑器)
**职责:** 提供步骤描述的富文本编辑功能
- 工具栏: 加粗 (Ctrl+B)、斜体 (Ctrl+I)、下划线 (Ctrl+U)
- 链接插入和编辑
- Markdown 快捷键支持
- 实时预览

#### 2.7 MarkdownEditor (Markdown 编辑器)
**职责:** 提供任务描述的 Markdown 编辑功能
- 支持完整 Markdown 语法 (除一级标题 #)
- 实时预览模式
- 代码块、表格、引用等高级语法
- 图片链接支持

#### 2.8 TagSelector (标签选择器)
**职责:** 多级标签选择和展示
- 树形结构展示标签 (最多4级)
- 每个标签显示颜色和emoji
- 支持搜索和快速选择
- 子标签缩进显示层级关系

#### 3. HabitItem
**职责:** 展示习惯及打卡状态
- 显示习惯名称、图标、颜色
- StreakDisplay 展示连续天数
- CheckInButton 今日打卡按钮
- 最近 7 天打卡热力图

#### 4. CountdownCard
**职责:** 展示倒数日卡片
- 大字体显示剩余天数
- 目标日期和标题
- 进度条 (可选)
- 编辑/删除操作

#### 5. CalendarView
**职责:** 月视图/周视图展示任务和习惯
- 使用 `react-big-calendar` 或自定义实现
- 日期单元格显示任务数量徽章
- 点击日期筛选任务
- 拖拽任务变更日期

#### 6. KanbanView
**职责:** 看板视图 (按状态/优先级分组)
- 列: Today / Upcoming / Completed (或按优先级)
- 每列内任务可拖拽排序
- 列间任务可拖拽移动

#### 7. GridView (四宫格)
**职责:** 网格布局展示任务卡片
- 响应式网格 (2x2, 3x3 等)
- 每张卡片显示任务摘要
- 适合概览今日/本周任务

### 自定义 Hooks 设计

```typescript
// hooks/useTasks.ts
export function useTasks(filters?: TaskFilters) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => taskService.getTasks(filters),
  });
  
  const createTask = useMutation({
    mutationFn: taskService.createTask,
    onSuccess: () => queryClient.invalidateQueries(['tasks']),
  });
  
  const updateTask = useMutation({
    mutationFn: taskService.updateTask,
    onSuccess: () => queryClient.invalidateQueries(['tasks']),
  });
  
  const deleteTask = useMutation({
    mutationFn: taskService.deleteTask,
    onSuccess: () => queryClient.invalidateQueries(['tasks']),
  });
  
  return { tasks, isLoading, createTask, updateTask, deleteTask };
}

// hooks/useHabits.ts
export function useHabits() {
  const { data: habits } = useQuery({
    queryKey: ['habits'],
    queryFn: habitService.getHabits,
  });
  
  const checkIn = useMutation({
    mutationFn: habitService.checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries(['habits']);
      queryClient.invalidateQueries(['habitStats']);
    },
  });
  
  return { habits, checkIn };
}

// hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'n') {
        e.preventDefault();
        openNewTaskModal();
      }
      if (e.key === 'Escape') {
        closeModals();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
```

### Zustand Store 设计

```typescript
// stores/useAppStore.ts
interface AppState {
  language: 'zh' | 'en' | 'ja';
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  
  setLanguage: (lang: 'zh' | 'en' | 'ja') => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: 'zh',
  theme: 'system',
  sidebarCollapsed: false,
  setLanguage: (lang) => {
    set({ language: lang });
    i18n.changeLanguage(lang);
  },
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ 
    sidebarCollapsed: !state.sidebarCollapsed 
  })),
}));

// stores/useViewStore.ts
interface ViewState {
  currentView: 'list' | 'calendar' | 'kanban' | 'grid';
  selectedDate?: string;
  selectedListId?: string;
  
  setView: (view: ViewState['currentView']) => void;
  setSelectedDate: (date?: string) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'list',
  setView: (view) => set({ currentView: view }),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
```

---

## Implementation Steps: 实现步骤

### 阶段 1: 项目初始化 (Day 1-2)

**目标:** 搭建 Tauri v2 + React 项目骨架

**步骤:**
1. **初始化 Tauri 项目**
   ```bash
   npm create tauri-app@latest mindless -- --template react-ts
   cd mindless
   ```

2. **安装核心依赖**
   ```bash
   npm install react-router-dom zustand @tanstack/react-query
   npm install i18next react-i18next
   npm install date-fns
   npm install zod react-hook-form @hookform/resolvers
   npm install class-variance-authority clsx tailwind-merge
   npm install lucide-react  # 图标库
   ```

3. **安装 Tauri 插件**
   ```bash
   cargo add tauri-plugin-sql --features sqlite
   cargo add tauri-plugin-notification
   cargo add tauri-plugin-dialog
   ```

4. **配置 Tailwind CSS**
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

5. **配置 Drizzle ORM**
   ```bash
   npm install drizzle-orm better-sqlite3
   npm install -D drizzle-kit
   ```

6. **设置项目结构**
   - 创建 `src/components`, `src/pages`, `src/hooks`, `src/stores` 等目录
   - 创建 `src-tauri/src/commands`, `src-tauri/src/db` 等目录

7. **配置 Tauri**
   - 编辑 `tauri.conf.json`: 设置窗口大小、标题、图标
   - 配置 `capabilities/default.json`: 启用 sql, notification, dialog 权限

**验收标准:**
- ✅ `npm run tauri dev` 成功启动开发服务器
- ✅ 看到空白 Tauri 窗口
- ✅ 热重载正常工作

---

### 阶段 2: 数据库层实现 (Day 3-4)

**目标:** 完成 SQLite 数据库初始化和 Drizzle ORM 配置

**步骤:**
1. **定义 Drizzle Schema**
   - 编写 `drizzle/schema.ts` (参考上文数据模型)
   - 生成 TypeScript 类型

2. **创建数据库迁移**
   ```bash
   npx drizzle-kit generate
   ```
   - 生成初始迁移文件
   - 验证 SQL 语句正确性

3. **实现 Rust 数据库连接**
   - `src-tauri/src/db/connection.rs`: 创建 SQLite 连接池
   - `src-tauri/src/db/migrations.rs`: 自动运行迁移

4. **编写 Tauri 命令**
   - `src-tauri/src/commands/tasks.rs`: 
     - `create_task`, `get_tasks`, `update_task`, `delete_task`
   - `src-tauri/src/commands/habits.rs`:
     - `create_habit`, `get_habits`, `check_in_habit`, `get_habit_stats`
   - `src-tauri/src/commands/countdowns.rs`:
     - `create_countdown`, `get_countdowns`, `delete_countdown`

5. **前端 API 封装**
   - `src/lib/api.ts`: 封装 `invoke` 调用
   - `src/services/taskService.ts`: 任务服务
   - `src/services/habitService.ts`: 习惯服务
   - `src/services/countdownService.ts`: 倒数日服务

6. **测试数据库操作**
   - 手动测试 CRUD 操作
   - 验证外键约束和索引

**验收标准:**
- ✅ 应用启动时自动创建数据库文件
- ✅ 所有迁移成功执行
- ✅ 前端能成功调用 Tauri 命令读写数据

---

### 阶段 3: 国际化配置 (Day 5)

**目标:** 实现中/英/日三语切换

**步骤:**
1. **配置 i18next**
   - `src/i18n/config.ts`: 初始化 i18next
   - 配置语言检测 (localStorage + 系统语言)

2. **创建翻译文件**
   - `src/i18n/locales/zh/common.json`: 通用文本
   - `src/i18n/locales/en/common.json`
   - `src/i18n/locales/ja/common.json`
   - 按模块拆分: `tasks.json`, `habits.json`, `countdowns.json`

3. **实现语言切换器**
   - `components/common/LanguageSwitcher.tsx`
   - 下拉菜单选择语言
   - 保存到 localStorage 和数据库 settings 表

4. **集成到 App**
   - 在 `main.tsx` 中包裹 `<I18nextProvider>`
   - 使用 `useTranslation` hook 获取翻译

5. **测试多语言**
   - 切换语言验证文本更新
   - 重启应用验证语言持久化

**验收标准:**
- ✅ 应用支持三种语言切换
- ✅ 切换后所有文本立即更新
- ✅ 重启应用记住上次选择的语言

---

### 阶段 4: 核心 UI 组件开发 (Day 6-10)

**目标:** 构建基础 UI 组件库和布局框架

**步骤:**
1. **基础 UI 组件 (Radix UI + Tailwind)**
   - `components/ui/button.tsx`: 按钮变体 (primary, secondary, ghost)
   - `components/ui/input.tsx`: 输入框
   - `components/ui/dialog.tsx`: 模态对话框
   - `components/ui/dropdown.tsx`: 下拉菜单
   - `components/ui/calendar.tsx`: 日期选择器
   - `components/ui/checkbox.tsx`: 复选框
   - `components/ui/badge.tsx`: 徽章
   - `components/ui/card.tsx`: 卡片容器
   - `components/ui/tabs.tsx`: 标签页

2. **布局组件**
   - `components/layout/AppLayout.tsx`: 主布局 (sidebar + header + content)
   - `components/layout/Sidebar.tsx`: 侧边栏导航
   - `components/layout/Header.tsx`: 顶部栏 (搜索、视图切换、通知)
   - `components/layout/MainContent.tsx`: 主内容区

3. **通用组件**
   - `components/common/EmptyState.tsx`: 空状态提示
   - `components/common/LoadingSpinner.tsx`: 加载动画
   - `components/common/SearchBar.tsx`: 搜索栏
   - `components/icons/*`: SVG 图标组件

4. **样式系统**
   - `styles/globals.css`: 全局样式重置
   - `styles/theme.css`: CSS 变量定义 (颜色、间距、圆角)
   - 配置 Tailwind 主题扩展

5. **路由配置**
   - `App.tsx`: 配置 React Router
   - 定义路由: `/`, `/tasks`, `/habits`, `/countdowns`, `/settings`

**验收标准:**
- ✅ 所有 UI 组件可独立预览
- ✅ 布局响应式适配不同窗口大小
- ✅ 暗色/亮色主题切换正常

---

### 阶段 5: 任务管理功能 (Day 11-18)

**目标:** 实现完整的任务 CRUD、子任务、步骤和列表视图

**步骤:**
1. **任务列表组件**
   - `components/task/TaskList.tsx`: 任务列表容器
   - `components/task/TaskItem.tsx`: 单个任务项
     - 复选框切换完成状态
     - 优先级徽章 (颜色区分)
     - 截止日期显示 (逾期标红)
     - 标签展示 (颜色和emoji)
     - 子任务进度显示
     - 步骤完成进度显示

2. **任务表单**
   - `components/task/TaskForm.tsx`: 创建/编辑任务表单
   - `components/task/PrioritySelector.tsx`: 优先级选择器 (根据设置显示0-3或0-10级)
   - `components/task/TagSelector.tsx`: 标签选择器 (树形结构，支持4级层级)
     - 显示标签颜色和emoji
     - 支持搜索和快速定位
     - 子标签缩进显示层级
   - `components/task/DueDatePicker.tsx`: 日期时间选择
   - `components/task/RecurrenceEditor.tsx`: 重复规则编辑器

3. **子任务管理**
   - `components/task/SubtaskList.tsx`: 子任务列表组件
     - 树形结构展示 (最多4级)
     - 拖拽排序和移动 (@dnd-kit/core)
     - 折叠/展开子层级
     - 批量操作
   - `components/task/SubtaskItem.tsx`: 单个子任务项
     - 复选框切换完成状态
     - 缩进显示层级关系
     - 右键菜单 (编辑、删除、添加子任务)
   - `src/services/subtaskService.ts`: 子任务CRUD服务
   - Rust后端: `src-tauri/src/commands/subtasks.rs`

4. **步骤管理**
   - `components/task/StepList.tsx`: 步骤清单组件
     - 步骤列表展示，支持拖拽排序
     - 每个步骤可设置截止日期和时间
     - 步骤完成进度条
     - 批量操作 (批量完成/删除)
   - `components/task/StepItem.tsx`: 单个步骤项
     - 复选框切换完成状态
     - 富文本描述渲染
     - 日期时间显示
   - `components/task/RichTextEditor.tsx`: 富文本编辑器
     - 工具栏: 加粗、斜体、下划线、链接
     - Markdown快捷键支持
     - 实时预览模式
   - `src/services/stepService.ts`: 步骤CRUD服务
   - Rust后端: `src-tauri/src/commands/steps.rs`

5. **Markdown编辑器**
   - `components/task/MarkdownEditor.tsx`: 任务描述Markdown编辑器
     - 支持完整Markdown语法 (除一级标题)
     - 实时预览模式 (分屏/内联)
     - 代码块、表格、引用等高级语法
     - 图片链接支持
   - 集成markdown-it或remark库

6. **任务服务集成**
   - 连接 `useTasks` hook 到 React Query
   - 实现乐观更新 (创建/更新/删除)
   - 错误处理和回滚
   - 子任务和步骤的级联更新

7. **任务排序和分组**
   - `components/task/TaskSortControls.tsx`: 排序控件
     - 排序字段: dueDate / startDate / priority / createdAt
     - 升序/降序切换
   - `components/task/TaskGroupControls.tsx`: 分组控件
     - 分组方式: none / priority / list
     - 分组折叠/展开
   - 排序和分组设置持久化到数据库

8. **任务过滤和搜索**
   - `components/task/TaskFilters.tsx`: 过滤器 (全部/今天/未来/已完成)
   - 按标签筛选 (支持多级标签)
   - 按优先级范围筛选
   - 搜索过滤

9. **列表视图优化**
   - 虚拟滚动 (大量任务时)
   - 拖拽排序 (使用 `@dnd-kit/core`)
   - 批量操作 (批量完成/删除)

10. **详情弹窗**
    - `components/task/TaskDetail.tsx`: 任务详情侧边栏
      - 显示完整描述 (Markdown渲染)
      - 子任务列表和进度
      - 步骤清单和进度
      - 标签、优先级、提醒等元数据
   - 显示完整描述、标签、提醒设置

**验收标准:**
- ✅ 能创建、编辑、删除任务
- ✅ 任务列表实时刷新
- ✅ 过滤器和搜索正常工作
- ✅ 拖拽排序持久化到数据库
- ✅ 子任务支持最多4级层级，可拖拽排序
- ✅ 步骤支持富文本编辑 (加粗、斜体、下划线、链接)
- ✅ 步骤支持设置日期时间
- ✅ 任务描述支持完整Markdown语法 (除一级标题)
- ✅ 子任务和步骤完成进度正确计算和显示

---

### 阶段 6: 习惯管理功能 (Day 17-21)

**目标:** 实现习惯追踪和统计

**步骤:**
1. **习惯列表**
   - `components/habit/HabitList.tsx`: 习惯列表
   - `components/habit/HabitItem.tsx`: 习惯项
     - 习惯名称、图标、颜色
     - 今日打卡按钮
     - 连续天数显示

2. **打卡功能**
   - `components/habit/CheckInButton.tsx`: 打卡按钮
   - 点击记录 `habit_logs`
   - 更新 `current_streak` 和 `total_completions`

3. **连续天数计算**
   - Rust 服务层实现 streak 计算逻辑:
     ```rust
     fn calculate_streak(habit_id: &str, logs: &[HabitLog]) -> i32 {
         // 从昨天往前数连续打卡天数
         // 考虑频率配置 (daily/weekly/custom)
     }
     ```
   - 前端显示 `StreakDisplay` 组件

4. **习惯表单**
   - `components/habit/HabitForm.tsx`: 创建/编辑习惯
   - 目标类型选择 (binary/count/duration)
   - 频率配置 (每日/每周/自定义)
   - 提醒时间设置

5. **统计数据**
   - `components/habit/HabitStats.tsx`: 统计面板
   - 显示: 当前连续、最长连续、总完成次数、完成率
   - 最近 30 天打卡热力图 (类似 GitHub contributions)

6. **习惯提醒**
   - 后台定时检查未打卡习惯
   - 发送系统通知

**验收标准:**
- ✅ 能创建习惯并每日打卡
- ✅ 连续天数计算准确
- ✅ 统计数据实时更新
- ✅ 打卡记录持久化

---

### 阶段 6.5: 标签管理系统 (Day 20-21)

**目标:** 实现多级标签的创建、编辑、删除和层级管理

**步骤:**
1. **标签管理页面**
   - `pages/TagsPage.tsx`: 标签管理主页面
   - 树形结构展示所有标签 (最多4级)
   - 拖拽调整标签层级
   - 批量操作 (批量删除、批量修改颜色)

2. **标签表单**
   - `components/tag/TagForm.tsx`: 创建/编辑标签表单
   - 标签名称输入
   - 颜色选择器 (预设色板 + 自定义)
   - Emoji选择器 (常用emoji快速选择)
   - 父标签选择 (控制层级，限制最多4级)

3. **标签树组件**
   - `components/tag/TagTree.tsx`: 树形结构展示
   - 展开/折叠子标签
   - 拖拽排序和移动
   - 右键菜单 (编辑、删除、添加子标签)

4. **标签服务集成**
   - `src/services/tagService.ts`: 标签CRUD服务
   - 标签层级关系验证 (防止循环引用)
   - 删除标签时检查关联任务

5. **标签选择器集成**
   - 在任务表单中集成TagSelector
   - 支持搜索和快速选择
   - 显示标签颜色和emoji

**验收标准:**
- ✅ 能创建最多4级的标签树
- ✅ 标签可设置颜色和emoji
- ✅ 拖拽调整标签层级和顺序
- ✅ 删除标签时有适当的警告和处理

---

### 阶段 8: 倒数日功能 (Day 25-27)

**目标:** 实现倒数日创建和动态计算

**步骤:**
1. **倒数日列表**
   - `components/countdown/CountdownList.tsx`: 列表容器
   - `components/countdown/CountdownCard.tsx`: 卡片展示
     - 大字体显示剩余天数
     - 目标日期和标题
     - 颜色主题

2. **天数计算**
   - 前端使用 `date-fns` 计算:
     ```typescript
     const daysRemaining = differenceInDays(targetDate, today);
     ```
   - 处理负数 (已过期的事件)

3. **倒数日表单**
   - `components/countdown/CountdownForm.tsx`: 创建/编辑表单
   - 目标日期时间选择
   - 事件类型 (countdown/countup)
   - 提醒设置 (提前 N 天)

4. **提醒功能**
   - 应用启动时检查即将到期的倒数日
   - 发送系统通知

5. **排序和筛选**
   - 按剩余天数排序
   - 显示即将到来的事件

**验收标准:**
- ✅ 能创建倒数日并正确显示剩余天数
- ✅ 天数随日期变化自动更新
- ✅ 提醒功能正常工作

---

### 阶段 9: 多视图模式 (Day 28-33)

**目标:** 实现日历、看板、四宫格视图

**步骤:**
1. **视图切换器**
   - `components/common/ViewModeToggle.tsx`: 视图切换按钮组
   - 集成到 Header
   - 状态保存到 `useViewStore`

2. **日历视图**
   - `components/views/CalendarView.tsx`
   - 使用 `react-big-calendar` 或自定义实现
   - 月视图展示任务和习惯
   - 点击日期筛选
   - 拖拽任务变更日期

3. **看板视图**
   - `components/views/KanbanView.tsx`
   - 列配置: Today / Upcoming / Completed
   - 使用 `@dnd-kit/core` 实现拖拽
   - 列内任务排序
   - 列间任务移动

4. **四宫格视图**
   - `components/views/GridView.tsx`
   - 响应式网格布局 (CSS Grid)
   - 每个格子显示任务摘要卡片
   - 适合今日任务概览

5. **视图数据适配**
   - 每种视图从同一数据源获取任务
   - 按视图需求转换数据格式

**验收标准:**
- ✅ 四种视图可自由切换
- ✅ 各视图数据一致
- ✅ 拖拽操作在所有视图中正常工作

---

### 阶段 10: 通知系统集成 (Day 34-35)

**目标:** 实现任务/习惯/倒数日提醒

**步骤:**
1. **Tauri 通知插件配置**
   - 在 `tauri.conf.json` 中启用 notification 权限
   - macOS 请求通知权限

2. **通知服务**
   - `src-tauri/src/commands/notifications.rs`: Rust 通知命令
   - `src/services/notificationService.ts`: 前端封装

3. **提醒调度**
   - 应用启动时扫描即将到期的提醒
   - 使用 `tokio::time::sleep` 或系统 cron 定时检查
   - 触发通知:
     ```rust
     Notification::new()
         .title("任务提醒")
         .body("明天截止: 完成报告")
         .show()?;
     ```

4. **应用内通知面板**
   - `components/common/NotificationPanel.tsx`
   - 显示未读通知列表
   - 标记已读

5. **系统托盘集成** (可选)
   - 最小化到托盘
   - 托盘菜单快速操作

**验收标准:**
- ✅ 任务到期前发送系统通知
- ✅ 习惯提醒按时触发
- ✅ 通知权限正确处理

---

### 阶段 11: 设置页面和优化 (Day 36-38)

**目标:** 完成设置功能和性能优化

**步骤:**
1. **设置页面**
   - `pages/SettingsPage.tsx`
   - 语言切换 (zh/en/ja)
   - 主题切换 (light/dark/system)
   - 一周起始日设置
   - 通知开关
   - **优先级模式设置**: 
     - 简单模式 (0-3级): 无/低/中/高
     - 详细模式 (0-10级): 11个优先级等级
   - **任务排序默认设置**:
     - 默认排序字段: dueDate / startDate / priority / createdAt
     - 默认分组方式: none / priority / list
   - 数据导出/导入 (JSON)

2. **键盘快捷键**
   - `hooks/useKeyboardShortcuts.ts`
   - Cmd+N: 新建任务
   - Cmd+F: 搜索
   - Escape: 关闭弹窗
   - 1/2/3/4: 切换视图

3. **性能优化**
   - React Query 缓存配置
   - 虚拟滚动优化长列表
   - 图片/图标懒加载
   - 代码分割 (lazy loading routes)

4. **错误处理**
   - 全局错误边界
   - 友好的错误提示
   - 日志记录

5. **无障碍优化**
   - ARIA 标签
   - 键盘导航
   - 屏幕阅读器支持

**验收标准:**
- ✅ 设置项保存并生效
- ✅ 键盘快捷键正常工作
- ✅ Lighthouse 性能评分 > 90

---

### 阶段 12: 测试和调试 (Day 39-41)

**目标:** 全面测试和修复 bug

**步骤:**
1. **单元测试**
   - 使用 Vitest 测试工具函数
   - 测试日期计算逻辑
   - 测试 streak 计算算法

2. **组件测试**
   - 使用 React Testing Library
   - 测试 TaskItem、HabitItem 等关键组件
   - 模拟用户交互

3. **集成测试**
   - 测试完整流程: 创建任务 → 编辑 → 完成 → 删除
   - 测试多语言切换
   - 测试视图切换

4. **手动测试**
   - 功能 checklist 逐项验证
   - 边界情况测试 (空数据、大量数据)
   - 不同语言环境测试

5. **Bug 修复**
   - 记录并修复发现的问题
   - 回归测试

**验收标准:**
- ✅ 所有核心功能通过测试
- ✅ 无严重 bug
- ✅ 测试覆盖率 > 70%

---

### 阶段 13: 打包和发布准备 (Day 42-43)

**目标:** 构建生产版本并准备发布

**步骤:**
1. **应用图标和资源**
   - **图标源文件**: 使用 `mindless.icon` 目录中的设计稿
     - 位置: `/Users/apple/Documents/Playgrounds/mindless/mindless.icon/`
     - 主图: `Assets/吕仙儿 第一张.png` (3.3MB)
     - 配置: `icon.json` (包含自动渐变填充、阴影、半透明效果)
   - **图标规范要求**:
     - **macOS**: 
       - 圆角半径: 遵循 Apple Human Interface Guidelines (约22%的圆角)
       - 尺寸: 1024x1024px (基础), 导出多套尺寸 (16x, 32x, 64x, 128x, 256x, 512x)
       - 格式: `.icns` 文件，放置在 `src-tauri/icons/icon.icns`
       - 安全区域: 内容保持在中心 90% 区域
     - **Windows**:
       - 圆角: Windows 11 采用与 macOS 类似的圆角设计
       - 尺寸: 256x256px (主要), 支持多尺寸 (16x, 32x, 48x, 128x)
       - 格式: `.ico` 文件，包含多个尺寸层级
     - **跨平台兼容**: 
       - 确保图标在浅色和深色背景下都清晰可见
       - 图标大小适中，避免过于复杂或过于简单
       - 保持品牌一致性，核心图形在各平台保持一致
   - **图标生成工具**:
     - 使用 `tauri icon` CLI 工具自动生成多尺寸图标
     ```bash
     npm run tauri icon /path/to/mindless.icon/Assets/吕仙儿\ 第一张.png
     ```
     - 手动调整确保圆角符合各平台规范
     - 测试在不同背景下的可视性

2. **构建配置**
   - 配置 `tauri.conf.json` 生产设置
   - 设置应用标识符 (`com.mindless.app`)
   - 配置版本号

3. **构建生产版本**
   ```bash
   npm run tauri build
   ```
   - 生成 `.dmg` (macOS)
   - 验证安装包大小 (< 50MB)

4. **安装测试**
   - 在干净 macOS 环境测试安装
   - 验证首次启动体验
   - 测试自动更新 (可选)

5. **文档**
   - 编写 `README.md`
   - 用户使用指南
   - 常见问题 FAQ

**验收标准:**
- ✅ 成功构建 `.dmg` 安装包
- ✅ 安装包能正常安装和运行
- ✅ 应用图标正确显示

---

## Testing: 测试策略

### 测试金字塔

```
        /\
       /  \      E2E Tests (Playwright)
      /----\
     /      \    Integration Tests
    /--------\
   /          \  Unit Tests (Vitest)
  /------------\
```

### 1. 单元测试 (Unit Tests)

**工具:** Vitest + React Testing Library

**测试范围:**
- **工具函数**
  - 日期计算 (`differenceInDays`, `formatDate`)
  - Streak 计算算法
  - 数据转换函数

- **Hooks**
  - `useTasks` (mock API)
  - `useHabits` (mock API)
  - `useKeyboardShortcuts`

- **组件**
  - `TaskItem` (渲染、点击事件)
  - `HabitItem` (打卡按钮)
  - `CountdownCard` (天数显示)

**示例:**
```typescript
// tests/unit/dateUtils.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDaysRemaining } from '@/lib/date';

describe('calculateDaysRemaining', () => {
  it('should return positive number for future date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(calculateDaysRemaining(future)).toBe(5);
  });
  
  it('should return negative number for past date', () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    expect(calculateDaysRemaining(past)).toBe(-3);
  });
});
```

### 2. 集成测试 (Integration Tests)

**工具:** Vitest + MSW (Mock Service Worker)

**测试范围:**
- **完整用户流程**
  - 创建任务 → 出现在列表中 → 编辑 → 删除
  - 习惯打卡 → streak 更新 → 统计变化
  - 视图切换 → 数据保持一致

- **API 集成**
  - Mock Tauri invoke 调用
  - 测试错误处理

**示例:**
```typescript
// tests/integration/taskFlow.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TasksPage } from '@/pages/TasksPage';

test('can create and complete a task', async () => {
  render(<TasksPage />);
  
  // Click add button
  fireEvent.click(screen.getByRole('button', { name: /add task/i }));
  
  // Fill form
  fireEvent.change(screen.getByLabelText(/title/i), {
    target: { value: 'Test Task' }
  });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));
  
  // Verify task appears
  expect(await screen.findByText('Test Task')).toBeInTheDocument();
  
  // Complete task
  fireEvent.click(screen.getByRole('checkbox'));
  
  // Verify completion
  expect(screen.getByText('Test Task')).toHaveClass('completed');
});
```

### 3. E2E 测试 (End-to-End)

**工具:** Playwright

**测试范围:**
- **关键用户旅程**
  - 首次启动 → 创建第一个任务
  - 切换语言 → 验证文本更新
  - 切换主题 → 验证样式变化
  
- **跨平台兼容性**
  - macOS 窗口行为
  - 系统通知权限

**示例:**
```typescript
// tests/e2e/app.spec.ts
import { test, expect } from '@playwright/test';

test('app launches and shows home page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Mindless/);
  await expect(page.locator('h1')).toContainText('Today');
});

test('can switch language', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="language-switcher"]');
  await page.click('[data-lang="en"]');
  await expect(page.locator('nav')).toContainText('Tasks');
});
```

### 4. 手动测试 Checklist

**功能测试:**
- [ ] 任务 CRUD 操作
- [ ] 习惯打卡和 streak 计算
- [ ] 倒数日天数显示
- [ ] 四种视图切换
- [ ] 多语言切换
- [ ] 主题切换
- [ ] 通知发送和接收
- [ ] 键盘快捷键
- [ ] 数据持久化 (重启后数据保留)

**边界测试:**
- [ ] 空任务列表显示
- [ ] 1000+ 任务性能
- [ ] 无效日期输入
- [ ] 网络断开 (离线模式)
- [ ] 数据库损坏恢复

**兼容性测试:**
- [ ] macOS 12+ (Monterey 及更高版本)
- [ ] 不同屏幕分辨率
- [ ] 暗色/亮色模式
- [ ] 中文/英文/日文输入法

---

## Verification: 验证方法

### 1. 自动化验证脚本

创建 `scripts/verify.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 Running verification checks..."

# 1. Type checking
echo "✓ Checking TypeScript types..."
npm run type-check

# 2. Linting
echo "✓ Running linter..."
npm run lint

# 3. Unit tests
echo "✓ Running unit tests..."
npm run test:unit

# 4. Build check
echo "✓ Testing production build..."
npm run build

# 5. Tauri build (dry run)
echo "✓ Checking Tauri configuration..."
npm run tauri info

echo "✅ All verification checks passed!"
```

### 2. 代码审查清单

**Pull Request 审查要点:**
- [ ] 代码符合 TypeScript 严格模式
- [ ] 组件有适当的 PropTypes/接口定义
- [ ] 添加了必要的单元测试
- [ ] 没有硬编码字符串 (使用 i18n)
- [ ] 数据库查询使用参数化 (防止 SQL 注入)
- [ ] 错误处理完善
- [ ] 性能考虑 (避免不必要的重渲染)
- [ ] 无障碍支持 (ARIA 标签)

### 3. 性能基准测试

**指标监控:**
- **启动时间:** < 2 秒 (冷启动)
- **任务列表渲染:** < 100ms (100 个任务)
- **视图切换:** < 50ms
- **内存占用:** < 200MB (正常运行)

**工具:**
- Chrome DevTools Performance tab
- Tauri 内置性能监控
- `console.time()` 关键路径计时

### 4. 用户验收测试 (UAT)

**测试场景:**
1. **新用户首次使用**
   - 下载并安装应用
   - 首次启动引导
   - 创建第一个任务
   - 验证任务保存

2. **日常使用流程**
   - 早晨查看今日任务
   - 完成任务并勾选
   - 打卡习惯
   - 查看倒数日

3. **高级功能**
   - 创建重复任务
   - 设置提醒
   - 切换视图模式
   - 导出数据

### 5. 持续集成 (CI)

**GitHub Actions 工作流:**

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Unit tests
        run: npm run test:unit
      
      - name: Build
        run: npm run build
```

### 6. 质量门禁

**合并前必须满足:**
- ✅ 所有 CI 检查通过
- ✅ 代码审查至少 1 人批准
- ✅ 测试覆盖率不低于 70%
- ✅ 无 ESLint 警告
- ✅ 无 TypeScript 错误
- ✅ 手动测试 checklist 完成

---

## 关键技术难点和解决方案

### 难点 1: 重复任务生成

**问题:** 如何实现复杂的重复规则 (每日/每周/每月/每年/自定义)

**解决方案:**
- 使用 **rrule.js** 库解析 iCalendar RFC 5545 规则
- 后端存储 `recurrence_rule` 字符串
- 每次查询时动态生成未来 30 天的实例
- 不预先创建所有实例 (节省存储空间)

```typescript
import { RRule } from 'rrule';

const rule = new RRule({
  freq: RRule.WEEKLY,
  interval: 2,
  byweekday: [RRule.MO, RRule.WE, RRule.FR],
  dtstart: new Date('2024-01-01'),
});

const nextOccurrences = rule.all((date) => {
  return date > new Date() && date < new Date('2024-12-31');
});
```

### 难点 2: 习惯连续天数计算

**问题:** 如何准确计算考虑频率配置的连续天数

**解决方案:**
- Rust 后端实现高效计算算法
- 从昨天往前遍历，检查每一天是否符合频率要求
- 缓存计算结果，仅在打卡时重新计算

```rust
fn calculate_current_streak(
    habit: &Habit,
    logs: &[HabitLog],
) -> i32 {
    let mut streak = 0;
    let mut check_date = chrono::Local::today() - chrono::Duration::days(1);
    
    loop {
        // 检查该日期是否在频率允许的天内
        if !is_frequency_match(habit, check_date.weekday()) {
            break;
        }
        
        // 检查是否有打卡记录
        if logs.iter().any(|log| log.log_date == check_date.to_string()) {
            streak += 1;
            check_date -= chrono::Duration::days(1);
        } else {
            break;
        }
    }
    
    streak
}
```

### 难点 3: 跨视图数据同步

**问题:** 四种视图共享同一数据源，如何保证一致性

**解决方案:**
- 单一数据源: React Query 缓存
- 视图组件只负责渲染，不负责数据获取
- 使用 `queryClient.invalidateQueries` 确保数据新鲜
- 乐观更新立即反映到所有视图

```typescript
// 所有视图共享同一个 query key
const { data: tasks } = useQuery({
  queryKey: ['tasks', filters],
  queryFn: fetchTasks,
});

// 更新后 invalidate，所有视图自动刷新
updateTaskMutation.onSuccess = () => {
  queryClient.invalidateQueries(['tasks']);
};
```

### 难点 4: 大量任务的性能优化

**问题:** 当任务数量超过 1000 时，列表渲染卡顿

**解决方案:**
- **虚拟滚动:** 使用 `@tanstack/react-virtual` 仅渲染可见区域
- **分页加载:** 初始加载 50 条，滚动到底部加载更多
- **Web Workers:** 复杂计算 (过滤、排序) 移到 worker
- **防抖搜索:** 搜索输入延迟 300ms 执行

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: tasks.length,
  getScrollElement: () => containerRef.current,
  estimateSize: () => 60, // 每项高度
});

return (
  <div ref={containerRef}>
    <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
      {virtualizer.getVirtualItems().map((item) => (
        <TaskItem key={item.key} task={tasks[item.index]} />
      ))}
    </div>
  </div>
);
```

### 难点 5: 离线优先和数据同步

**问题:** 应用完全离线运行，如何处理数据冲突

**解决方案:**
- **本地优先架构:** 所有数据存储在 SQLite
- **最后写入胜出:** 简单场景下使用 `updated_at` 时间戳
- **操作日志:** 记录所有变更用于冲突解决 (未来云同步预留)
- **定期备份:** 导出 JSON 备份文件

### 难点 6: macOS 原生集成

**问题:** 如何实现系统托盘、Dock 徽章、全局快捷键

**解决方案:**
- **系统托盘:** 使用 `tauri-plugin-system-tray`
- **Dock 徽章:** 通过 Tauri API 设置未完成任务数
- **全局快捷键:** 使用 `tauri-plugin-global-shortcut`
- **原生菜单:** 自定义 `tauri.conf.json` 中的 menu 配置

```json
// tauri.conf.json
{
  "app": {
    "systemTray": {
      "iconPath": "icons/tray-icon.png",
      "iconAsTemplate": true
    }
  }
}
```

---

## 附录: 参考资源

### 滴答清单功能调研总结

**任务模型关键点:**
- **优先级**: 
  - 简单模式: 4级 (无/低/中/高)，用颜色区分
  - 详细模式: 11级 (0-10)，提供更细粒度的优先级控制
- **标签**: 
  - 多对多关系，支持颜色和emoji图标
  - 最多4级层级结构，支持拖拽管理
- **子任务**: 
  - 支持多级子任务 (最多4级)
  - 拖拽排序和移动
  - 树形结构展示
- **步骤清单**: 
  - 步骤支持日期时间设置
  - 富文本描述 (加粗、斜体、下划线、链接)
  - 拖拽排序
- **任务描述**: 支持完整Markdown语法 (除一级标题)
- **排序**: 支持按截止日期、开始日期、优先级、创建时间排序
- **分组**: 支持按优先级或清单分组显示
- **重复任务**: 支持 iCal RRULE 标准
- **提醒**: 多个提醒时间点，支持系统通知和邮件

**习惯管理特点:**
- 打卡方式: 一键打卡 + 数值记录 (次数/时长)
- 统计维度: 连续天数、完成率、趋势图表
- 提醒机制: 固定时间提醒，可 snooze

**视图模式:**
- 列表视图: 默认视图，支持分组和排序
- 日历视图: 月/周/日视图，拖拽调整日期
- 看板视图: 按状态/项目分组，拖拽移动
- 矩阵视图 (四宫格): 艾森豪威尔矩阵 (重要/紧急)

### 技术栈对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| React + Zustand | 生态成熟，灵活 | 需要自行组装 |
| Vue + Pinia | 上手简单，官方推荐 | Tauri 社区案例较少 |
| Electron | 生态最成熟 | 体积大，性能差 |
| Flutter Desktop | 跨平台一致性好 | Rust 集成复杂 |

**最终选择:** React + Tauri v2 (平衡性能和开发效率)

---

## 总结

本计划提供了一个完整的 MVP 实现路线图，预计开发周期 **45 个工作日**。关键里程碑:

- **Week 1-2:** 项目初始化和数据库层
- **Week 3-4:** UI 组件和国际化配置
- **Week 5-7:** 任务管理 (含子任务、步骤、排序、分组、多级标签、富文本)
- **Week 8:** 习惯追踪功能
- **Week 9:** 标签管理系统
- **Week 10:** 倒数日功能
- **Week 11-12:** 多视图模式和通知系统
- **Week 13:** 设置页面和性能优化
- **Week 14:** 测试、优化和发布

**新增核心功能:**
- ✅ **灵活优先级**: 支持简单模式 (0-3级) 和详细模式 (0-10级)
- ✅ **任务排序**: 按截止日期、开始日期、优先级、创建时间排序
- ✅ **任务分组**: 按优先级或清单分组显示
- ✅ **多级标签**: 最多4级层级，支持颜色和emoji图标
- ✅ **子任务系统**: 支持最多4级子任务层级，拖拽排序
- ✅ **步骤清单**: 步骤支持日期时间、富文本编辑 (加粗/斜体/下划线/链接)
- ✅ **Markdown支持**: 任务描述支持完整Markdown语法 (除一级标题)

**风险点:**
1. Tauri v2 插件稳定性 (预留 buffer 时间)
2. 重复任务逻辑复杂性 (使用成熟库 rrule.js)
3. 标签和子任务树形结构复杂度 (限制最多4级，防止过深)
4. 富文本编辑器集成 (选择合适的轻量级库)
5. 性能瓶颈 (早期引入虚拟滚动)
6. 跨平台图标适配 (确保圆角和尺寸符合各平台规范)

**成功标准:**
- ✅ 所有 MVP 功能完整实现 (任务/子任务/步骤/习惯/倒数日/多视图/标签)
- ✅ 无严重 bug，性能达标
- ✅ 用户体验流畅，符合简约现代设计
- ✅ 支持三语切换，macOS 原生体验
- ✅ 标签系统支持4级层级，颜色和emoji自定义
- ✅ 子任务支持4级层级，拖拽排序流畅
- ✅ 步骤支持富文本编辑和日期时间设置
- ✅ 任务描述支持Markdown渲染
- ✅ 应用图标符合 macOS/Windows 平台规范，圆角和尺寸适中

---

*文档版本: 1.0*  
*最后更新: 2026-06-04*  
*作者: Qoder AI Assistant*

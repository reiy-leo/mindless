# 影视页面设计文档

## 概述

为Mindless应用添加影视管理功能，支持管理电影和电视剧，包括分类、观看状态追踪、评分、关联等功能。

## 核心需求

### 1. 页面布局
- **两列布局**：左侧边栏 + 右侧内容区
- **左列**：
  - 智能分组：所有、收藏、正常、已看完、已归档
  - 影视组：类型分类（科幻、动作、爱情等），支持新建、编辑、删除
- **右列**：
  - 工具栏：视图切换、搜索、排序
  - 影片列表：支持Grid和List两种视图

### 2. 影片类型
- **电影**：独立item
- **电视剧**：每一季都是独立item，季与季之间独立管理

### 3. Item字段
- **基本信息**：
  - cover（封面图片，本地上传）
  - 名称
  - 其他名称（支持多个值）
  - 年份
  - 打分（1-10分）

- **链接**：
  - 豆瓣链接
  - IMDB链接
  - 蓝番茄链接
  - 在线观看链接（支持多个值，可标注平台）

- **关联**：
  - 双向关联其他item（支持关联多个，用于系列关联如续集、前传）

- **状态**：
  - 观看状态：正常、收藏、已看完、已归档

### 4. 智能分组
- **所有**：显示全部影片
- **收藏**：status=favorite的影片
- **正常**：status=normal的影片（想看/正在看）
- **已看完**：status=watched的影片
- **已归档**：status=archived的影片

### 5. 视图模式
- **Grid视图**（卡片）：
  - 显示封面图片
  - 显示名称
  - 显示评分（可选）
- **List视图**（列表）：
  - 显示名称
  - 显示年份
  - 显示观看状态
  - 显示评分

## 数据库设计

### 表结构

#### media_groups（影视组表）
```sql
CREATE TABLE media_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT '🎬',
  sort_order REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### media_items（影片表）
```sql
CREATE TABLE media_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'movie' | 'season'
  title TEXT NOT NULL,
  year INTEGER,
  cover TEXT, -- 本地图片路径
  rating REAL, -- 1-10
  status TEXT NOT NULL DEFAULT 'normal', -- 'normal' | 'favorite' | 'watched' | 'archived'
  group_id TEXT REFERENCES media_groups(id),
  
  -- 链接
  douban_url TEXT,
  imdb_url TEXT,
  rotten_tomatoes_url TEXT,
  
  -- 电视剧特有字段
  tv_show_title TEXT, -- 所属剧名（仅season类型使用）
  season_number INTEGER, -- 季号（仅season类型使用）
  
  sort_order REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### media_other_names（其他名称表）
```sql
CREATE TABLE media_other_names (
  id TEXT PRIMARY KEY,
  media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT DEFAULT '别名',
  sort_order REAL NOT NULL DEFAULT 0
);
```

#### media_watch_links（在线观看链接表）
```sql
CREATE TABLE media_watch_links (
  id TEXT PRIMARY KEY,
  media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  platform TEXT, -- 平台名称（如Netflix、爱奇艺）
  sort_order REAL NOT NULL DEFAULT 0
);
```

#### media_relations（关联表）
```sql
CREATE TABLE media_relations (
  id TEXT PRIMARY KEY,
  media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  related_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  relation_type TEXT DEFAULT 'series' -- 'series' | 'sequel' | 'prequel' | 'spin-off'
);
```

### 索引
```sql
CREATE INDEX idx_media_items_status ON media_items(status);
CREATE INDEX idx_media_items_group_id ON media_items(group_id);
CREATE INDEX idx_media_items_type ON media_items(type);
CREATE INDEX idx_media_other_names_media_item_id ON media_other_names(media_item_id);
CREATE INDEX idx_media_watch_links_media_item_id ON media_watch_links(media_item_id);
CREATE INDEX idx_media_relations_media_item_id ON media_relations(media_item_id);
CREATE INDEX idx_media_relations_related_item_id ON media_relations(related_item_id);
```

## 组件设计

### 组件树
```
MediaPage
├── MediaSidebar
│   ├── SmartGroupsSection
│   │   ├── SmartGroupItem (所有)
│   │   ├── SmartGroupItem (收藏)
│   │   ├── SmartGroupItem (正常)
│   │   ├── SmartGroupItem (已看完)
│   │   └── SmartGroupItem (已归档)
│   └── MediaGroupsSection
│       ├── GroupHeader (新建按钮)
│       └── MediaGroupItem[]
│           ├── GroupIcon
│           ├── GroupName
│           └── GroupActions (编辑、删除)
├── MediaContent
│   ├── MediaToolbar
│   │   ├── ViewToggle (Grid/List切换)
│   │   ├── SearchInput
│   │   └── SortSelect
│   └── MediaList
│       ├── MediaCard[] (Grid视图)
│       │   ├── CoverImage
│       │   ├── Title
│       │   └── Rating
│       └── MediaListItem[] (List视图)
│           ├── Title
│           ├── Year
│           ├── StatusBadge
│           └── Rating
└── MediaItemForm (模态框)
    ├── CoverUploader
    ├── BasicInfoSection
    │   ├── TitleInput
    │   ├── OtherNamesInput (多值)
    │   ├── YearInput
    │   └── RatingInput
    ├── LinksSection
    │   ├── DoubanUrlInput
    │   ├── ImdbUrlInput
    │   ├── RottenTomatoesUrlInput
    │   └── WatchLinksInput (多值)
    ├── RelationsSection
    │   └── RelationSelector (多选)
    └── StatusSection
        └── StatusSelect
```

### 核心组件说明

#### MediaSidebar
- 管理智能分组和影视组的选择状态
- 支持影视组的CRUD操作
- 使用ResizeHandle组件调整宽度

#### MediaContent
- 根据选中的分组筛选影片
- 支持Grid/List视图切换
- 支持搜索和排序

#### MediaItemForm
- 新建/编辑影片的模态框
- 封面图片上传（存储到本地）
- 多值输入组件（其他名称、观看链接）
- 关联选择器（支持搜索和多选）

## 数据流

```
用户操作 
  ↓
React组件 (useState/useCallback)
  ↓
React Query Hooks (useQuery/useMutation)
  ↓
Tauri Commands (Rust后端)
  ↓
Drizzle ORM
  ↓
SQLite数据库
```

### 查询示例

```typescript
// 获取所有影片
const useMediaItems = (filters?: { status?: string; groupId?: string }) => {
  return useQuery({
    queryKey: ['mediaItems', filters],
    queryFn: () => invoke('get_media_items', { filters }),
  });
};

// 创建影片
const useCreateMediaItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMediaItemInput) => invoke('create_media_item', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaItems'] });
    },
  });
};
```

## 文件结构

```
src/
├── pages/
│   └── MediaPage.tsx
├── components/
│   └── media/
│       ├── MediaSidebar.tsx
│       ├── MediaContent.tsx
│       ├── MediaCard.tsx
│       ├── MediaListItem.tsx
│       ├── MediaItemForm.tsx
│       ├── CoverUploader.tsx
│       ├── MultiValueInput.tsx
│       └── RelationSelector.tsx
├── queries/
│   └── useMediaQueries.ts
├── types/
│   └── media.ts
└── stores/
    └── useAppStore.ts (添加media相关状态)

src-tauri/src/
├── commands/
│   └── media.rs
└── db/
    └── media.rs

drizzle/
└── schema.ts (添加media相关表)
```

## 国际化

需要添加中英文翻译：
```json
{
  "media": {
    "title": "影视",
    "smart_groups": {
      "all": "所有",
      "favorites": "收藏",
      "normal": "正常",
      "watched": "已看完",
      "archived": "已归档"
    },
    "actions": {
      "new": "新建",
      "edit": "编辑",
      "delete": "删除",
      "save": "保存",
      "cancel": "取消"
    },
    "fields": {
      "title": "名称",
      "otherNames": "其他名称",
      "year": "年份",
      "rating": "评分",
      "cover": "封面",
      "doubanUrl": "豆瓣链接",
      "imdbUrl": "IMDB链接",
      "rottenTomatoesUrl": "蓝番茄链接",
      "watchLinks": "在线观看链接",
      "relations": "关联影片",
      "status": "观看状态",
      "group": "分组"
    },
    "status": {
      "normal": "正常",
      "favorite": "收藏",
      "watched": "已看完",
      "archived": "已归档"
    },
    "type": {
      "movie": "电影",
      "season": "电视剧季"
    }
  }
}
```

## 实现优先级

### P0（核心功能）
1. 数据库表创建和迁移
2. 基础CRUD操作（创建、读取、更新、删除）
3. 页面布局和组件结构
4. 智能分组筛选
5. Grid/List视图切换

### P1（重要功能）
1. 影视组管理（新建、编辑、删除）
2. 封面图片上传
3. 多值输入（其他名称、观看链接）
4. 搜索和排序

### P2（增强功能）
1. 双向关联功能
2. 拖拽排序
3. 批量操作
4. 导入/导出

## 测试策略

### 单元测试
- 组件渲染测试
- 工具函数测试
- 数据转换测试

### 集成测试
- 完整的CRUD流程
- 分组筛选功能
- 视图切换功能

### E2E测试
- 用户完整操作流程
- 数据持久化验证

## 注意事项

1. **图片存储**：封面图片存储在应用数据目录，使用相对路径引用
2. **性能优化**：大量影片时使用虚拟滚动
3. **数据一致性**：删除影片时级联删除关联数据
4. **用户体验**：表单验证、加载状态、错误处理

## 变更记录

- 2026-06-15：初始设计文档

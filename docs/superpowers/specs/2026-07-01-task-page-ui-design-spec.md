# 任务页 UI 设计规格与偏好

> 供后续 agent 复用。本文描述当前任务页的产品形态、视觉偏好、交互边界和实现约束。除非需求明确要求重构，否则按这里的边界做最小改动。

## 目标定位

任务页不是营销页，也不是卡片化看板入口；它是一个高频工作台。设计优先级是密度、扫描效率、低干扰编辑、跨视图一致性。

核心体验：

- 左侧选择任务范围：智能清单、进阶分组、普通清单、置顶入口。
- 中间处理任务：按当前清单/状态/排序/分组展示任务，支持列表、日历、看板、矩阵视图。
- 右侧编辑详情：选中任务后直接编辑标题、日期、优先级、描述、标签、步骤、子任务、附件和关联项。

## 信息架构

任务页采用三栏结构：

- `TaskSidebar`：清单导航。只负责展示入口、数量、折叠状态、右键/编辑入口，不拥有 `selectedListId`。
- `TaskListPane`：任务工作区。负责标题、视图设置、内联新建任务、列表/日历/看板/矩阵渲染、任务选择。
- `TaskDetailPanel`：任务详情。负责当前任务或子任务的富编辑能力。
- `TasksPage`：编排层。保留查询、mutation、`selectedListId`、`selectedTaskId`、`selectedSubtaskId`、过滤、排序、分组、overlay/menu 回调。

不要把页面状态下沉到 UI 子组件里，尤其是 `selectedListId`、任务分组数据和 overlay 结果监听。子组件接收数据和回调，保持可替换的展示层。

## 视觉语言

整体基调是安静、实用、密集：

- 使用 `theme-*` 和 CSS 变量，例如 `var(--theme-bg-2)`、`var(--theme-color)`、`var(--theme-text-70)`。
- 背景和选中态低对比，避免大面积强色块。
- 操作按钮以图标为主，文字只用于清单名、任务名、分组标题、设置项标签等需要扫描的内容。
- 圆角保持克制：常用 `rounded-md` / `rounded-lg`，不要引入更大的装饰性卡片圆角。
- 列表项和工具条应紧凑：常见间距是 `px-2`、`py-1.5`、`gap-1` 到 `gap-3`。
- 边界用细线和背景差异表达：侧栏右边框、详情左边框、弹层边框、设置面板阴影。

避免：

- 营销式 hero、说明文字、空泛引导。
- 大卡片嵌套小卡片。
- 纯装饰渐变、光斑、过强品牌色。
- 为了显眼而加粗所有区域；任务页需要能长时间使用。

## 左侧栏规格

侧栏是导航，不是内容卡片。

布局：

- 宽度由 `groupsPanelWidth` 控制，当前约束为 `minWidth: 215`、`maxWidth: 315`。
- 背景使用半透明 theme 背景，右侧有边框。
- 顶部可显示置顶清单和置顶进阶分组，使用小图标按钮网格。
- 智能清单在上方，普通清单和进阶分组分区展示。

交互：

- 当前选中项使用低对比背景和主题文字色。
- 数量 badge 靠右，只有 count 大于 0 才显示。
- 编辑按钮默认隐藏，hover 当前行后显示；显示编辑按钮时可以隐藏 count。
- 右键菜单入口保留在行容器上，不要只绑在文字或图标上。
- 分区标题可折叠，标题本身小号、半粗、低对比。

偏好：

- 清单名必须 truncate。
- 图标必须 shrink，避免长名称挤压。
- 新增/编辑操作使用 lucide 图标或已有 emoji 图标系统，不新增文字按钮。

## 中间任务区规格

中间区是主要工作面板。列表视图下宽度受详情栏联动约束，其他视图填满剩余空间。

顶部：

- 标题用当前清单/分组名，`text-lg font-bold` 即可，不要放大成页面 hero。
- 右上角只有一个设置入口，使用 `MoreVertical` 图标。
- 设置弹层包含视图、状态、排序、分组四块；每块短标题，小号大写/半粗视觉。

视图切换：

- 视图按钮是图标加极短文字的网格按钮。
- 当前视图使用 `bg-theme-500 text-white`。
- 支持 `calendar`、`kanban`、`list`、`matrix`，并共享同一套 `filteredTasks`、`selectedTaskId`、toggle/update 回调。

状态筛选：

- 使用全部、进行中、已完成三态。
- 切换状态时要同时恢复该状态自己的排序和分组设置。

列表视图：

- 顶部固定内联新建框，不弹大表单作为默认路径。
- 输入框下面是一排图标操作：优先级、标签、日期、剪贴板、附件、模板，右侧发送/创建。
- 有值的控件使用主题色或对应语义色高亮；无值控件保持低对比 hover。
- 附件待上传时在输入框下方显示紧凑 chips。
- 空态只显示简短空状态文本，不加插画或营销说明。

分组：

- 分组数据必须保持 grouped 到渲染阶段，不要提前 flatten 丢失边界。
- 分组标题 sticky、低对比、小号，右侧显示数量。
- 分组可折叠，折叠状态按 group id 保存。

任务行：

- 行高紧凑，`px-2 py-2`，左侧完成控件，中间任务标题，右侧进度和日期偏移。
- 选中态低对比，不使用强 outline。
- 完成任务标题使用删除线和降权文字色。
- 子步骤进度可用圆环/饼图/短条，列表页默认圆环。
- 日期显示相对天数：今天、`+N天`、`-N天`；逾期用红色，未来用绿色。
- 右键菜单从整行触发。

## 右侧详情面板规格

详情面板是编辑器，不是只读卡片。

结构：

- 左边框分隔，背景与中间区一致。
- 顶部先放日期按钮，再放标题和优先级。
- 右上角是一排 section toggle 图标：步骤、子任务、附件、笔记、人物、媒体。
- 详情内容区可滚动，使用 `space-y-4` 分隔模块。

编辑行为：

- 标题是输入框，blur 保存，Enter blur。
- 描述使用 `MilkdownEditor`，变更防抖保存。
- 日期选择通过 `DATE_RANGE_PICKER_LABEL` overlay，来源标记为 `task-detail`。
- 优先级使用当前 priority mode；`OxygenNotIncluded` 模式必须走专用 picker。
- 标签使用 `TagCombobox`，可创建新标签并立即选中。

模块偏好：

- 步骤和子任务是核心执行模块，按 section toggle 显隐。
- 子任务进入详情时，保留返回父任务的轻量 breadcrumb。
- 附件图片区用 5 列方格缩略图，文件附件用紧凑列表。
- 附件支持拖放上传；拖入时用半透明 dashed overlay。
- 上传/同步/失败状态用图标和颜色表达，失败显示错误并提供重传。
- 关联笔记、人物、媒体保持轻量：小标题、选择器、紧凑列表或小缩略图。

## Overlay 与弹层偏好

任务页已有共享 overlay 机制，新增弹出式 UI 时优先复用 `showOverlay` 和 `overlayManager`。

规则：

- 日期和标签选择这类跨窗口/跨 webview 弹层走 overlay。
- 传入 `_source` 区分来源，例如 `inline-task-form`、`task-detail`。
- 通过 `getScreenRect` 定位，payload 带 `anchorX`、`anchorY`、`anchorH`。
- 本地小弹层可继续用绝对定位或 portal，但只限轻量菜单，例如模板列表、优先级列表、附件右键菜单。
- 弹层打开/关闭不要破坏父页面选中态。

## i18n 要求

任务页所有可见文字都应走 `useTranslation('common')` 和 locale key。

必须本地化：

- 标题、设置项、视图名、状态名。
- placeholder、tooltip/title、空态。
- 附件操作、错误状态、日期/任务模块标签。

避免新增硬编码中文或英文。当前若遇到遗留硬编码文案，改动同一区域时顺手替换为 locale key。

## 状态与数据边界

后续 agent 改任务页时优先守住这些边界：

- `TasksPage.tsx` 仍是查询和 mutation 编排层。
- `selectedListId` 属于 `useViewStore` / 页面编排，不属于 `TaskSidebar`。
- `selectedTaskId` 和 `selectedSubtaskId` 属于页面编排，列表/详情只通过回调更新。
- `taskGroups` 保持分组结构直到渲染，列表组件再把每组渲染成 header + rows。
- 切换清单、进阶分组或智能分组时，应清空当前选中任务，而不是自动选中替代任务。
- per-list 设置包含 view mode、filter status、sort、group；状态筛选下有独立排序/分组设置。
- tag 跨窗口刷新依赖全局 `tags:changed` 事件和任务页 invalidation，不要在 combobox 内部硬刷。

## 可扩展方向

新增能力时按以下优先级落点：

- 新的任务视图：放到 `src/components/tasks/views/`，复用 `filteredTasks`、`selectedTaskId`、toggle/update 回调。
- 新的任务列表控制：放到 `src/components/tasks/controls/`，由 `TaskListPane` 设置弹层引用。
- 新的详情模块：作为 `TaskDetailPanel` 内 section，接入顶部 section toggle 和 `visibleSections`。
- 新的弹层选择器：优先注册到 `overlayManager`，用 `_source` 回传结果。
- 新的右键菜单行为：扩展已有 menu 组件，保持 fixed 定位和 viewport 翻转处理。

## 变更检查清单

完成任务页 UI 变更前至少检查：

- 是否保持三栏职责边界。
- 是否没有把页面状态下沉到展示组件。
- 是否保持分组数据到渲染阶段。
- 是否所有新增可见文字都有 i18n key。
- 是否使用现有 theme token 和 lucide 图标。
- 是否没有引入大卡片、hero、装饰背景或营销说明。
- 是否 overlay 来源和结果监听不会串到其他入口。
- 是否在切换任务范围时清理已选任务。
- 是否执行最小可用验证；任务页逻辑变更优先跑 `rtk npm run build`，涉及过滤/视图设置时再跑相关 task tests。

## 关键源码入口

- `src/pages/TasksPage.tsx`
- `src/components/tasks/sidebar/TaskSidebar.tsx`
- `src/components/tasks/list/TaskListPane.tsx`
- `src/components/tasks/list/TaskRow.tsx`
- `src/components/tasks/detail/TaskDetailPanel.tsx`
- `src/components/tasks/controls/TaskGroupControls.tsx`
- `src/components/tasks/controls/TaskSortControls.tsx`
- `src/components/tasks/views/CalendarView.tsx`
- `src/components/tasks/views/KanbanView.tsx`
- `src/components/tasks/views/EisenhowerMatrixView.tsx`
- `src/lib/overlayManager.ts`
- `src/lib/tasks/taskViewSettings.ts`

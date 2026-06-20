import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
    PlusIcon,
    PencilIcon,
    TagIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    InboxIcon,
    CalendarIcon,
    ClockIcon,
    EyeIcon,
    EyeSlashIcon,
    PaperClipIcon,
    AdjustmentsHorizontalIcon,
    ArchiveBoxIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { Pin } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ResizeHandle } from "@/components/ResizeHandle";
import {
    useTasks,
    useCreateTask,
    useUpdateTask,
    useDeleteTask,
    useToggleTaskCompletion,
    useTags,
    useSubtasks,
    useSteps,
    useLists,
    useCreateSubtask,
    useUpdateSubtask,
    useDeleteSubtask,
    useCreateStep,
    useUpdateStep,
    useDeleteStep,
    useCreateTag,
    useReorderSubtasks,
    useReorderSteps,
    useCompleteRecurringTask,
    useAllSubtasks,
    useSaveListSettings,
    useAllTasks,
    useUpdateList,
    useDeleteList,
} from "@/queries/useTaskQueries";
import { useViewStore } from "@/stores/useViewStore";
import { useAppStore } from "@/stores/useAppStore";
import { PRIORITY_COLORS, VIEW_MODES } from "@/lib/constants";
import TaskForm from "@/components/tasks/TaskForm";
import SubtaskList from "@/components/tasks/SubtaskList";
import StepList from "@/components/tasks/StepList";
import CalendarView from "@/components/tasks/CalendarView";
import KanbanView from "@/components/tasks/KanbanView";
import TagCombobox from "@/components/TagCombobox";
import DateTimeCalenderWithRangePicker from "@/components/DateTimeCalenderWithRangePicker";
import EisenhowerMatrixView from "@/components/tasks/EisenhowerMatrixView";
import MilkdownEditor from "@/components/MilkdownEditor";
import { TaskSortControls } from "@/components/tasks/TaskSortControls";
import { TaskGroupControls } from "@/components/tasks/TaskGroupControls";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import type { Task, Priority, SortBy, GroupBy, Step as StepType, List, ListSettings } from "@/types/task";

const ICON_KEY_TO_EMOJI: Record<string, string> = {
    folder: "📁",
    inbox: "📥",
    star: "⭐",
    heart: "❤️",
    fire: "🔥",
    book: "📖",
    flag: "🚩",
    target: "🎯",
    lightning: "⚡",
    briefcase: "💼",
    home: "🏠",
};

function resolveIcon(icon?: string): string {
    if (!icon) return "📁";
    if (icon.length <= 2) return icon;
    return ICON_KEY_TO_EMOJI[icon] || "📁";
}
import type { Tag } from "@/types/tag";
import type { AdvancedGroup } from "@/stores/useAppStore";

// ==================== Helper: Build subtask tree ====================
function buildSubtaskTree(flatSubtasks: Task[]): (Task & { children?: Task[] })[] {
    const map = new Map<string, Task & { children?: Task[] }>();
    const roots: (Task & { children?: Task[] })[] = [];

    flatSubtasks.forEach((s) => map.set(s.id, { ...s, children: [] }));

    flatSubtasks.forEach((s) => {
        const node = map.get(s.id)!;
        if (s.parentTaskId && map.has(s.parentTaskId)) {
            map.get(s.parentTaskId)!.children!.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

// ==================== Helper: Get all descendant IDs ====================
function getDescendantIds(flatSubtasks: Task[], parentId: string): string[] {
    const children = flatSubtasks.filter((s) => s.parentTaskId === parentId);
    const result: string[] = [];
    for (const child of children) {
        result.push(child.id);
        result.push(...getDescendantIds(flatSubtasks, child.id));
    }
    return result;
}

// ==================== Helper: Calculate steps progress ====================
function calcStepsProgress(steps: StepType[]): { completed: number; total: number } | null {
    if (steps.length === 0) return null;
    const completed = steps.filter((s) => s.isCompleted).length;
    return { completed, total: steps.length };
}

// ==================== Helper: Calculate full progress (subtasks + steps) ====================
function calcFullProgress(subtasks: Task[], steps: StepType[]): { completed: number; total: number } | null {
    const total = subtasks.length + steps.length;
    if (total === 0) return null;
    const completed = subtasks.filter((s) => s.isCompleted).length + steps.filter((s) => s.isCompleted).length;
    return { completed, total };
}

// ==================== Task Detail Panel ====================
function TaskDetailPanel({
    task,
    allTags,
    selectedSubtaskId,
    onUpdateTask,
    onSubtaskClick,
    onSubtaskBack,
}: {
    task: Task;
    allTags: Tag[];
    selectedSubtaskId?: string | null;
    onClose: () => void;
    onDelete: () => void;
    onUpdateTask: (params: any) => void;
    onSubtaskClick?: (id: string) => void;
    onSubtaskBack?: () => void;
}) {
    const { t } = useTranslation("common");

    // When a subtask is selected, treat it as the active task
    const { data: flatSubtasks = [] } = useSubtasks(task.id);
    const selectedSubtask = useMemo(() => {
        if (!selectedSubtaskId) return null;
        return flatSubtasks.find((s) => s.id === selectedSubtaskId) || null;
    }, [flatSubtasks, selectedSubtaskId]);

    const activeTask = selectedSubtask || task;
    const { data: steps = [] } = useSteps(activeTask.id);
    // Load subtasks of the active task (direct children only)
    const { data: activeSubtasks = [] } = useSubtasks(activeTask.id);

    const createSubtask = useCreateSubtask();
    const updateSubtask = useUpdateSubtask();
    const deleteSubtask = useDeleteSubtask();
    const createStep = useCreateStep();
    const updateStep = useUpdateStep();
    const deleteStep = useDeleteStep();
    const createTag = useCreateTag();
    const reorderSubtasks = useReorderSubtasks();
    const reorderSteps = useReorderSteps();

    const subtaskTree = useMemo(() => buildSubtaskTree(activeSubtasks), [activeSubtasks]);

    // Calculate progress
    const progress = useMemo(() => calcFullProgress(activeSubtasks, steps), [activeSubtasks, steps]);

    // Auto-complete task when all subtasks and steps are done
    useEffect(() => {
        if (!progress || progress.total === 0) return;
        if (progress.completed === progress.total && !activeTask.isCompleted) {
            onUpdateTask({ isCompleted: true });
        }
    }, [progress, activeTask.isCompleted, onUpdateTask]);

    // Parse task's tag_ids (comma-separated string)
    const taskTagIds: string[] = useMemo(() => {
        if (!activeTask.tagIds || activeTask.tagIds.length === 0) return [];
        return activeTask.tagIds.split(",").filter(Boolean);
    }, [activeTask.tagIds]);

    const handleAddSubtask = (title: string, parentSubtaskId?: string) => {
        const level = parentSubtaskId ? (activeSubtasks.find((s) => s.id === parentSubtaskId)?.level ?? 0) + 1 : 0;
        createSubtask.mutate({ taskId: activeTask.id, title, parentSubtaskId, level });
    };

    const handleToggleSubtask = (id: string) => {
        const subtask = activeSubtasks.find((s) => s.id === id);
        if (subtask) {
            const newCompleted = !subtask.isCompleted;
            updateSubtask.mutate({ id, taskId: activeTask.id, isCompleted: newCompleted });
            const descendants = getDescendantIds(activeSubtasks, id);
            for (const descId of descendants) {
                const desc = activeSubtasks.find((s) => s.id === descId);
                if (desc && desc.isCompleted !== newCompleted) {
                    updateSubtask.mutate({ id: descId, taskId: activeTask.id, isCompleted: newCompleted });
                }
            }
        }
    };

    const handleDeleteSubtask = (id: string) => {
        deleteSubtask.mutate({ id, taskId: activeTask.id });
    };

    const handleUpdateSubtaskTitle = (id: string, title: string) => {
        updateSubtask.mutate({ id, taskId: activeTask.id, title });
    };

    const handleAddStep = (description: string) => {
        createStep.mutate({ taskId: activeTask.id, description });
    };

    const handleToggleStep = (id: string) => {
        const step = steps.find((s: StepType) => s.id === id);
        if (step) {
            updateStep.mutate({ id, taskId: activeTask.id, isCompleted: !step.isCompleted });
        }
    };

    const handleDeleteStep = (id: string) => {
        deleteStep.mutate({ id, taskId: activeTask.id });
    };

    const handleUpdateStepDescription = (id: string, description: string) => {
        updateStep.mutate({ id, taskId: activeTask.id, description });
    };

    const handleUpdateStepDueDate = (id: string, dueDate?: string) => {
        updateStep.mutate({ id, taskId: activeTask.id, dueDate });
    };

    const handleUpdateStepDueTime = (id: string, dueTime?: string) => {
        updateStep.mutate({ id, taskId: activeTask.id, dueTime });
    };

    const handleToggleTag = (tagId: string) => {
        const currentIds = taskTagIds.includes(tagId)
            ? taskTagIds.filter((id) => id !== tagId)
            : [...taskTagIds, tagId];
        onUpdateTask({ tagIds: currentIds.join(",") });
    };

    const [showPriorityPicker, setShowPriorityPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [localDesc, setLocalDesc] = useState(activeTask.description || "");

    // Sync local description when active task changes
    useEffect(() => {
        setLocalDesc(activeTask.description || "");
    }, [activeTask.id, activeTask.description]);

    // Close date picker on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest("[data-date-picker]")) {
                setShowDatePicker(false);
            }
        };
        if (showDatePicker) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showDatePicker]);

    // Debounced save description
    const descTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const handleDescChange = (value: string) => {
        setLocalDesc(value);
        clearTimeout(descTimerRef.current);
        descTimerRef.current = setTimeout(() => {
            onUpdateTask({ description: value });
        }, 500);
    };

    return (
        <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700" style={{ backgroundColor: 'var(--theme-bg-2)' }}>
            {/* Date button above header */}
            <div className="px-4 pt-4 pb-2">
                <div className="relative" data-date-picker>
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full ${
                            activeTask.dueDate
                                ? "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-blue-50 dark:bg-blue-900/10"
                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-800"
                        }`}
                    >
                        <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                            {activeTask.dueDate
                                ? activeTask.endDate
                                    ? `${activeTask.dueDate}${activeTask.dueTime ? ` ${activeTask.dueTime}` : ""} → ${
                                          activeTask.endDate
                                      }${activeTask.endTime ? ` ${activeTask.endTime}` : ""}`
                                    : `${activeTask.dueDate}${activeTask.dueTime ? ` ${activeTask.dueTime}` : ""}`
                                : t("tasks.date_placeholder")}
                        </span>
                    </button>
                    {showDatePicker && (
                        <div className="absolute left-0 top-full mt-1 z-50 w-77 border shadow-2xl rounded-md">
                            <DateTimeCalenderWithRangePicker
                                date={activeTask.dueDate || undefined}
                                time={activeTask.dueTime || undefined}
                                startDate={activeTask.dueDate || undefined}
                                startTime={activeTask.dueTime || undefined}
                                endDate={activeTask.endDate || undefined}
                                endTime={activeTask.endTime || undefined}
                                mode={activeTask.endDate ? "range" : "single"}
                                onSingleChange={(d, tm) => {
                                    onUpdateTask({ dueDate: d || undefined, dueTime: tm || undefined });
                                    setShowDatePicker(false);
                                }}
                                onRangeChange={(sd, st, ed, et) => {
                                    onUpdateTask({
                                        dueDate: sd || undefined,
                                        dueTime: st || undefined,
                                        endDate: ed || undefined,
                                        endTime: et || undefined,
                                    });
                                    setShowDatePicker(false);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Header */}
            <div className="px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={activeTask.title}
                        onChange={(e) => onUpdateTask({ title: e.target.value })}
                        className="text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none flex-1 min-w-0 truncate rounded px-1"
                    />
                    {/* Priority icon button with dropdown */}
                    <div
                        className="relative flex-shrink-0"
                        onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowPriorityPicker(false);
                        }}
                        tabIndex={-1}
                    >
                        <button
                            onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title={t("tasks.priority.label")}
                        >
                            <AdjustmentsHorizontalIcon
                                className="w-4 h-4"
                                style={{ color: PRIORITY_COLORS[activeTask.priority] || undefined }}
                            />
                        </button>
                        {showPriorityPicker && (
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 w-32">
                                {[0, 1, 2, 3].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => {
                                            onUpdateTask({ priority: p });
                                            setShowPriorityPicker(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: PRIORITY_COLORS[p] }}
                                        />
                                        <span className="text-gray-700 dark:text-gray-300">
                                            {t(`tasks.priority.${["none", "low", "medium", "high"][p]}`)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {/* Parent task link */}
                {selectedSubtask && onSubtaskBack && (
                    <button
                        onClick={onSubtaskBack}
                        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mt-1"
                    >
                        <ChevronRightIcon className="w-3 h-3 rotate-180 flex-shrink-0" />
                        <span className="truncate">{task.title}</span>
                    </button>
                )}
            </div>

            {/* Progress bar - tightly below header */}
            {progress && progress.total > 0 && (
                <div className="group relative">
                    <div className="w-full h-1 bg-gray-100 dark:bg-gray-700">
                        <div
                            className="h-full transition-all duration-300"
                            style={{
                                width: `${(progress.completed / progress.total) * 100}%`,
                                backgroundColor: progress.completed === progress.total ? "#10B981" : "#3B82F6",
                            }}
                        />
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 -top-7 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-0.5 rounded whitespace-nowrap">
                        {Math.round((progress.completed / progress.total) * 100)}%
                    </div>
                </div>
            )}

            {/* Detail Content */}
            <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">
                {/* Description */}
                <MilkdownEditor
                    markdown={localDesc}
                    onChange={handleDescChange}

                    // placeholder="详细说明"
                />

                {/* Tags */}
                <TagCombobox
                    allTags={allTags}
                    selectedIds={taskTagIds}
                    onToggle={handleToggleTag}
                    onCreateTag={(name) => {
                        createTag.mutate(
                            { name },
                            {
                                onSuccess: (newTag) => {
                                    const currentIds = [...taskTagIds, newTag.id];
                                    onUpdateTask({ tagIds: currentIds.join(",") });
                                },
                            },
                        );
                    }}
                />

                {/* Steps */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                    <StepList
                        steps={steps}
                        taskDueDate={activeTask.dueDate}
                        onAdd={handleAddStep}
                        onToggle={handleToggleStep}
                        onDelete={handleDeleteStep}
                        onUpdateDescription={handleUpdateStepDescription}
                        onUpdateDueDate={handleUpdateStepDueDate}
                        onUpdateDueTime={handleUpdateStepDueTime}
                        onReorder={(items) => reorderSteps.mutate(items)}
                    />
                </div>

                {/* Subtasks */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                    <SubtaskList
                        subtasks={subtaskTree}
                        onAdd={handleAddSubtask}
                        onToggle={handleToggleSubtask}
                        onDelete={handleDeleteSubtask}
                        onUpdateTitle={handleUpdateSubtaskTitle}
                        onReorder={(items) => reorderSubtasks.mutate(items)}
                        onSubtaskClick={onSubtaskClick}
                    />
                </div>
            </div>
        </div>
    );
}

// ==================== Task Row ====================
function TaskRow({
    task,
    isSelected,
    onSelect,
    onToggle,
}: {
    task: Task;
    isSelected: boolean;
    onSelect: () => void;
    onToggle: () => void;
}) {
    const { t } = useTranslation("common");
    const { data: taskSteps = [] } = useSteps(task.id);
    const rowProgress = useMemo(() => calcStepsProgress(taskSteps), [taskSteps]);

    return (
        <div
            onClick={onSelect}
            className={`group flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                isSelected ? "ring-2 ring-blue-500" : ""
            }`}
        >
            <input
                type="checkbox"
                checked={task.isCompleted}
                onChange={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 flex-shrink-0"
            />
            <span
                className={`flex-1 min-w-0 truncate text-sm ${
                    task.isCompleted
                        ? "line-through text-gray-400 dark:text-gray-500"
                        : "text-gray-900 dark:text-gray-100"
                }`}
            >
                {task.title}
            </span>
            {/* Subtask/Step progress badge */}
            {rowProgress && rowProgress.total > 0 && (
                <div
                    className="flex items-center gap-1 flex-shrink-0"
                    title={`${rowProgress.completed}/${rowProgress.total}`}
                >
                    <div className="w-10 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${(rowProgress.completed / rowProgress.total) * 100}%`,
                                backgroundColor: rowProgress.completed === rowProgress.total ? "#10B981" : "#3B82F6",
                            }}
                        />
                    </div>
                </div>
            )}
            {/* Due date badge */}
            {task.dueDate &&
                (() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const due = new Date(task.dueDate + "T00:00:00");
                    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = diffDays < 0;
                    const absDays = Math.abs(diffDays);
                    const unit = t("dashboard.days_left");
                    const label = diffDays === 0 ? t("today") : isOverdue ? `-${absDays}${unit}` : `+${absDays}${unit}`;
                    return (
                        <span
                            className={`text-xs font-medium flex-shrink-0 ${
                                isOverdue ? "text-red-500" : "text-green-500"
                            }`}
                        >
                            {label}
                        </span>
                    );
                })()}
        </div>
    );
}

// ==================== Resize Handle ====================
// ==================== Main Page ====================
export default function TasksPage() {
    const { t } = useTranslation("common");
    const { viewMode, filterStatus, selectedListId, setViewMode, setFilterStatus, setSelectedListId } = useViewStore();
    const {
        themeColor,
        taskSortBy,
        taskSortOrder,
        taskGroupBy,
        setTaskSortBy,
        setTaskSortOrder,
        setTaskGroupBy,
        groupsPanelWidth,
        detailPanelWidth,
        setGroupsPanelWidth,
        setDetailPanelWidth,
    } = useAppStore();
    const saveListSettings = useSaveListSettings();
    const isLoadingSettings = useRef(false);

    // Load per-list settings when selectedListId changes
    useEffect(() => {
        if (selectedListId === null) return;
        isLoadingSettings.current = true;
        import("@/lib/api").then(({ getListSettings }) => {
            getListSettings(selectedListId)
                .then((settings) => {
                    if (settings) {
                        setTaskSortBy(settings.sortBy);
                        setTaskSortOrder(settings.sortOrder);
                        setTaskGroupBy(settings.groupBy);
                        setFilterStatus(settings.filterStatus);
                        setViewMode(settings.viewMode);
                    }
                    // Use setTimeout to ensure stores have been updated before we allow saving
                    setTimeout(() => {
                        isLoadingSettings.current = false;
                    }, 0);
                })
                .catch(() => {
                    isLoadingSettings.current = false;
                });
        });
    }, [selectedListId, setTaskSortBy, setTaskSortOrder, setTaskGroupBy, setFilterStatus, setViewMode]);

    // Save current settings to DB when they change
    const persistSettings = useCallback(
        (overrides?: Partial<ListSettings>) => {
            if (isLoadingSettings.current || !selectedListId) return;
            const current: ListSettings = {
                listId: selectedListId,
                sortBy: overrides?.sortBy ?? taskSortBy,
                sortOrder: overrides?.sortOrder ?? taskSortOrder,
                groupBy: overrides?.groupBy ?? taskGroupBy,
                filterStatus: overrides?.filterStatus ?? filterStatus,
                viewMode: overrides?.viewMode ?? viewMode,
            };
            saveListSettings.mutate(current);
        },
        [selectedListId, taskSortBy, taskSortOrder, taskGroupBy, filterStatus, viewMode, saveListSettings],
    );

    // Wrapper setters that also persist
    const handleSetViewMode = useCallback(
        (mode: "list" | "calendar" | "kanban" | "matrix") => {
            setViewMode(mode);
            persistSettings({ viewMode: mode });
        },
        [setViewMode, persistSettings],
    );

    const handleSetFilterStatus = useCallback(
        (status: "all" | "active" | "completed") => {
            setFilterStatus(status);
            persistSettings({ filterStatus: status });
        },
        [setFilterStatus, persistSettings],
    );

    const handleSetTaskGroupBy = useCallback(
        (by: string) => {
            setTaskGroupBy(by as GroupBy);
            persistSettings({ groupBy: by as ListSettings["groupBy"] });
        },
        [setTaskGroupBy, persistSettings],
    );

    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);
    const [listsExpanded, setListsExpanded] = useState(true);
    const [advListsExpanded, setAdvListsExpanded] = useState(true);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [editingAdvGroup, setEditingAdvGroup] = useState<AdvancedGroup | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDescription, setNewTaskDescription] = useState("");
    const [newTaskPriority, setNewTaskPriority] = useState<Priority>(0);
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        type: "list" | "advGroup";
        id: string;
    } | null>(null);

    const { data: tasks = [], isLoading } = useTasks();
    const { data: allTasksForCount = [] } = useAllTasks();
    const { data: allTags = [] } = useTags();
    const { data: allLists = [] } = useLists();
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();
    const toggleTask = useToggleTaskCompletion();
    const completeRecurring = useCompleteRecurringTask();
    const updateSubtask = useUpdateSubtask();
    const updateList = useUpdateList();
    const deleteList = useDeleteList();

    // Adjust detail panel width when window resizes
    useEffect(() => {
        let prevWidth = window.innerWidth;

        const handleResize = () => {
            const newWidth = window.innerWidth;
            const delta = newWidth - prevWidth;
            prevWidth = newWidth;

            if (delta !== 0) {
                setDetailPanelWidth((w) => Math.max(300, Math.min(800, w + delta)));
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [setDetailPanelWidth]);

    // Keyboard shortcut listeners
    useEffect(() => {
        const handleNewTask = () => {
            setEditingTask(null);
            setShowTaskForm(true);
        };
        const handleEscape = () => {
            if (showTaskForm) {
                setShowTaskForm(false);
                setEditingTask(null);
            }
            if (selectedSubtaskId) {
                setSelectedSubtaskId(null);
            } else if (selectedTaskId) {
                setSelectedTaskId(null);
            }
        };

        window.addEventListener("mindless:new-task", handleNewTask);
        window.addEventListener("mindless:escape", handleEscape);

        return () => {
            window.removeEventListener("mindless:new-task", handleNewTask);
            window.removeEventListener("mindless:escape", handleEscape);
        };
    }, [showTaskForm, selectedTaskId, selectedSubtaskId]);

    const selectedTask = useMemo(
        () => tasks.find((task) => task.id === selectedTaskId) || null,
        [tasks, selectedTaskId],
    );

    // Advanced group matching
    const {
        smartGroupVisibility,
        setSmartGroupVisibility,
        advancedGroups,
        addAdvancedGroup,
        updateAdvancedGroup,
        deleteAdvancedGroup,
    } = useAppStore();
    const queryClient = useQueryClient();

    // Listen for dialog results from WebviewWindow
    useEffect(() => {
        const unlistenAdvGroup = listen<{ action: string; group?: AdvancedGroup }>("dialog:result", (event) => {
            const { action } = event.payload;
            if (action === "submit" && event.payload.group) {
                const group = event.payload.group;
                if (editingAdvGroup) {
                    updateAdvancedGroup(group);
                } else {
                    addAdvancedGroup(group);
                }
            }
            setEditingAdvGroup(null);
        });

        const unlistList = listen<{ action: string }>("dialog:result", (event) => {
            const { action } = event.payload;
            if (action === "submit" || action === "delete") {
                queryClient.invalidateQueries({ queryKey: ["lists"] });
            }
        });

        return () => {
            unlistenAdvGroup.then((fn) => fn());
            unlistList.then((fn) => fn());
        };
    }, [editingAdvGroup, addAdvancedGroup, updateAdvancedGroup, queryClient]);

    const matchAdvancedGroup = useCallback((task: Task, group: AdvancedGroup): boolean => {
        const f = group.filters;
        if (f.listIds?.length) {
            const taskListId = task.listId || "inbox";
            if (!f.listIds.includes(taskListId)) return false;
        }
        if (f.tagIds?.length) {
            const taskTagIds = task.tagIds ? task.tagIds.split(",").filter(Boolean) : [];
            if (!f.tagIds.some((tid) => taskTagIds.includes(tid))) return false;
        }
        if (f.titleRegex) {
            try {
                if (!new RegExp(f.titleRegex).test(task.title)) return false;
            } catch {
                return false;
            }
        }
        if (f.dateType) {
            const dateVal = f.dateType === "due" ? task.dueDate : task.createdAt?.split("T")[0];
            if (!dateVal) return false;
            if ((f.dateMode || "absolute") === "absolute") {
                if (f.dateFrom && dateVal < f.dateFrom) return false;
                if (f.dateTo && dateVal > f.dateTo) return false;
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const pastDays = f.datePastDays ?? 7;
                const futureDays = f.dateFutureDays ?? 7;
                const minDate = new Date(today);
                minDate.setDate(minDate.getDate() - pastDays);
                const maxDate = new Date(today);
                maxDate.setDate(maxDate.getDate() + futureDays);
                const minStr = minDate.toISOString().split("T")[0];
                const maxStr = maxDate.toISOString().split("T")[0];
                if (dateVal < minStr || dateVal > maxStr) return false;
            }
        }
        if (f.priorities?.length) {
            if (!f.priorities.includes(task.priority)) return false;
        }
        return true;
    }, []);

    // Filter and search tasks
    const filteredTasksBase = useMemo(
        () =>
            tasks.filter((task) => {
                if (filterStatus === "active" && task.isCompleted) return false;
                if (filterStatus === "completed" && !task.isCompleted) return false;

                // List filtering
                if (selectedListId) {
                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
                        now.getDate(),
                    ).padStart(2, "0")}`;

                    // Advanced groups
                    if (selectedListId.startsWith("adv:")) {
                        const groupId = selectedListId.slice(4);
                        const group = advancedGroups.find((g) => g.id === groupId);
                        if (group && !matchAdvancedGroup(task, group)) return false;
                    } else if (selectedListId === "smart:today") {
                        if (task.dueDate !== todayStr) return false;
                    } else if (selectedListId === "smart:tomorrow") {
                        const tomorrow = new Date(now);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(
                            2,
                            "0",
                        )}-${String(tomorrow.getDate()).padStart(2, "0")}`;
                        if (task.dueDate !== tomorrowStr) return false;
                    } else if (selectedListId === "smart:recent7days") {
                        const next7 = new Date(now);
                        next7.setDate(next7.getDate() + 7);
                        const next7Str = `${next7.getFullYear()}-${String(next7.getMonth() + 1).padStart(
                            2,
                            "0",
                        )}-${String(next7.getDate()).padStart(2, "0")}`;
                        if (!task.dueDate || task.dueDate < todayStr || task.dueDate > next7Str) return false;
                    } else if (selectedListId === "smart:thisMonth") {
                        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
                        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(
                            2,
                            "0",
                        )}-${String(monthEnd.getDate()).padStart(2, "0")}`;
                        if (!task.dueDate || task.dueDate < monthStart || task.dueDate > monthEndStr) return false;
                    } else if (selectedListId === "smart:recent") {
                        const recentStart = new Date(now);
                        recentStart.setDate(recentStart.getDate() - 30);
                        const recentStartStr = `${recentStart.getFullYear()}-${String(
                            recentStart.getMonth() + 1,
                        ).padStart(2, "0")}-${String(recentStart.getDate()).padStart(2, "0")}`;
                        const recentEnd = new Date(now);
                        recentEnd.setDate(recentEnd.getDate() + 30);
                        const recentEndStr = `${recentEnd.getFullYear()}-${String(recentEnd.getMonth() + 1).padStart(
                            2,
                            "0",
                        )}-${String(recentEnd.getDate()).padStart(2, "0")}`;
                        if (!task.dueDate || task.dueDate < recentStartStr || task.dueDate > recentEndStr) return false;
                    } else {
                        // Regular list: match listId (inbox = null or 'inbox')
                        const taskListId = task.listId || "inbox";
                        if (selectedListId === "inbox") {
                            if (taskListId !== "inbox") return false;
                        } else {
                            if (task.listId !== selectedListId) return false;
                        }
                    }
                }

                return true;
            }),
        [tasks, filterStatus, selectedListId, advancedGroups, matchAdvancedGroup],
    );

    // Sort tasks
    const filteredTasks = useMemo(() => {
        const sorted = [...filteredTasksBase].sort((a, b) => {
            let aVal: any, bVal: any;
            switch (taskSortBy) {
                case "sortOrder":
                    aVal = a.sortOrder ?? 0;
                    bVal = b.sortOrder ?? 0;
                    break;
                case "dueDate":
                    aVal = a.dueDate || "";
                    bVal = b.dueDate || "";
                    break;
                case "startDate":
                    aVal = a.startDate || "";
                    bVal = b.startDate || "";
                    break;
                case "priority":
                    aVal = a.priority;
                    bVal = b.priority;
                    break;
                case "createdAt":
                    aVal = a.createdAt;
                    bVal = b.createdAt;
                    break;
            }
            if (aVal < bVal) return taskSortOrder === "asc" ? -1 : 1;
            if (aVal > bVal) return taskSortOrder === "asc" ? 1 : -1;
            // Tiebreaker: sortOrder (manual order)
            return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        });

        // Group tasks
        if (taskGroupBy === "priority") {
            const groups: Record<number, typeof sorted> = {};
            sorted.forEach((task) => {
                const priority = task.priority || 0;
                if (!groups[priority]) groups[priority] = [];
                groups[priority].push(task);
            });
            return Object.entries(groups)
                .sort(([a], [b]) => Number(b) - Number(a))
                .flatMap(([, groupTasks]) => groupTasks);
        }
        if (taskGroupBy === "list") {
            const groups: Record<string, typeof sorted> = {};
            sorted.forEach((task) => {
                const listId = task.listId || "inbox";
                if (!groups[listId]) groups[listId] = [];
                groups[listId].push(task);
            });
            return Object.values(groups).flat();
        }

        return sorted;
    }, [filteredTasksBase, taskSortBy, taskSortOrder, taskGroupBy]);

    // Load subtasks for all visible tasks and flatten
    const taskIds = useMemo(() => filteredTasks.map((t) => t.id), [filteredTasks]);
    const { data: allSubtasksData } = useAllSubtasks(taskIds);
    const allSubtasks = allSubtasksData ?? [];

    // Build flattened list: task followed by its subtasks
    type FlatItem = { type: "task"; task: Task } | { type: "subtask"; subtask: Task; parentTask: Task };
    const flatItems = useMemo<FlatItem[]>(() => {
        const items: FlatItem[] = [];
        // allSubtasks are direct children of filteredTasks (parent_task_id = task.id)
        const subtasksByTask = new Map<string, Task[]>();
        allSubtasks.forEach((s) => {
            if (s.parentTaskId) {
                const list = subtasksByTask.get(s.parentTaskId) || [];
                list.push(s);
                subtasksByTask.set(s.parentTaskId, list);
            }
        });
        filteredTasks.forEach((task) => {
            items.push({ type: "task", task });
            const subs = subtasksByTask.get(task.id) || [];
            subs.sort((a, b) => a.sortOrder - b.sortOrder);
            subs.forEach((sub) => {
                items.push({ type: "subtask", subtask: sub, parentTask: task });
            });
        });
        return items;
    }, [filteredTasks, allSubtasks]);

    const handleCreateInline = () => {
        if (!newTaskTitle.trim()) return;
        createTask.mutate(
            {
                title: newTaskTitle.trim(),
                description: newTaskDescription.trim() || undefined,
                priority: newTaskPriority,
                listId:
                    selectedListId && !selectedListId.startsWith("smart:") && !selectedListId.startsWith("adv:")
                        ? selectedListId
                        : undefined,
            },
            {
                onSuccess: () => {
                    setNewTaskTitle("");
                    setNewTaskDescription("");
                    setNewTaskPriority(0);
                },
            },
        );
    };

    const handleInlineKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleCreateInline();
        }
        if (e.key === "Escape") {
            setNewTaskTitle("");
            setNewTaskDescription("");
            setNewTaskPriority(0);
        }
    };

    const closeForm = () => {
        setShowTaskForm(false);
        setEditingTask(null);
    };

    const handleCreateTask = (taskData: {
        title: string;
        description?: string;
        priority: Priority;
        dueDate?: string;
        dueTime?: string;
        endDate?: string;
        endTime?: string;
        startDate?: string;
        listId?: string;
        recurrenceRule?: string;
        recurrenceEndDate?: string;
    }) => {
        createTask.mutate(taskData, { onSuccess: closeForm });
    };

    const handleUpdateTask = (taskData: {
        title: string;
        description?: string;
        priority: Priority;
        dueDate?: string;
        dueTime?: string;
        endDate?: string;
        endTime?: string;
        startDate?: string;
        listId?: string;
        recurrenceRule?: string;
        recurrenceEndDate?: string;
    }) => {
        if (editingTask) {
            updateTask.mutate({ id: editingTask.id, ...taskData }, { onSuccess: closeForm });
        }
    };

    const handleToggleTask = (id: string, isCompleted: boolean) => {
        const task = tasks.find((t) => t.id === id);
        // If completing a recurring task, generate the next occurrence
        if (!isCompleted && task?.recurrenceRule) {
            completeRecurring.mutate(id);
        } else {
            toggleTask.mutate({ id, isCompleted: !isCompleted });
        }
    };

    const handleDeleteTask = (id: string) => {
        if (!window.confirm(t("tasks.delete_confirm"))) return;
        deleteTask.mutate(id);
        if (selectedTaskId === id) {
            setSelectedTaskId(null);
        }
    };

    const handleUpdateTaskField = (params: any) => {
        const targetId = selectedSubtaskId || selectedTask?.id;
        if (targetId) {
            updateTask.mutate({ id: targetId, ...params });
        }
    };

    const handleUpdateTaskInline = (id: string, params: any) => {
        updateTask.mutate({ id, ...params });
    };

    // Task groups (smart lists + user lists)
    const SMART_LISTS = [
        { id: "inbox", iconKey: "inbox", labelKey: "lists.inbox", required: true },
        { id: "smart:today", iconKey: "calendar", labelKey: "lists.today", required: true },
        { id: "smart:tomorrow", iconKey: "clock", labelKey: "lists.tomorrow", required: false },
        { id: "smart:recent7days", iconKey: "recent7days", labelKey: "lists.next_7_days", required: false },
        { id: "smart:thisMonth", iconKey: "thisMonth", labelKey: "lists.this_month", required: false },
        { id: "smart:recent", iconKey: "recent", labelKey: "lists.recent", required: true },
    ] as const;

    const GROUP_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
        inbox: InboxIcon,
        calendar: CalendarIcon,
        clock: ClockIcon,
        recent7days: ClockIcon,
        thisMonth: CalendarIcon,
        recent: ClockIcon,
    };

    const visibleSmartLists = useMemo(
        () =>
            SMART_LISTS.filter(
                (sl) =>
                    sl.required ||
                    smartGroupVisibility[sl.id.replace("smart:", "") as keyof typeof smartGroupVisibility],
            ),
        [smartGroupVisibility],
    );

    const seedIds = new Set(["inbox", "today", "tomorrow", "next7days", "thismonth", "recent"]);
    const pinnedLists = useMemo(
        () => allLists.filter((l) => !seedIds.has(l.id) && l.isArchived !== true && l.isPinned),
        [allLists],
    );
    const pinnedAdvGroups = useMemo(() => advancedGroups.filter((g) => g.isPinned), [advancedGroups]);
    const userLists = useMemo(
        () =>
            allLists
                .filter((l) => !seedIds.has(l.id) && l.isArchived !== true)
                .sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return a.sortOrder - b.sortOrder;
                }),
        [allLists],
    );

    const listTaskCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
            now.getDate(),
        ).padStart(2, "0")}`;

        // Tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(
            tomorrow.getDate(),
        ).padStart(2, "0")}`;

        // Next 7 days
        const next7 = new Date(now);
        next7.setDate(next7.getDate() + 7);
        const next7Str = `${next7.getFullYear()}-${String(next7.getMonth() + 1).padStart(2, "0")}-${String(
            next7.getDate(),
        ).padStart(2, "0")}`;

        // This month (natural month)
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(
            monthEnd.getDate(),
        ).padStart(2, "0")}`;

        // Recent (±30 days)
        const recentStart = new Date(now);
        recentStart.setDate(recentStart.getDate() - 30);
        const recentStartStr = `${recentStart.getFullYear()}-${String(recentStart.getMonth() + 1).padStart(
            2,
            "0",
        )}-${String(recentStart.getDate()).padStart(2, "0")}`;
        const recentEnd = new Date(now);
        recentEnd.setDate(recentEnd.getDate() + 30);
        const recentEndStr = `${recentEnd.getFullYear()}-${String(recentEnd.getMonth() + 1).padStart(2, "0")}-${String(
            recentEnd.getDate(),
        ).padStart(2, "0")}`;

        allTasksForCount.forEach((task) => {
            const lid = task.listId || "inbox";
            counts[lid] = (counts[lid] || 0) + 1;
            if (task.dueDate === todayStr) {
                counts["smart:today"] = (counts["smart:today"] || 0) + 1;
            }
            if (task.dueDate === tomorrowStr) {
                counts["smart:tomorrow"] = (counts["smart:tomorrow"] || 0) + 1;
            }
            if (task.dueDate && task.dueDate >= todayStr && task.dueDate <= next7Str) {
                counts["smart:recent7days"] = (counts["smart:recent7days"] || 0) + 1;
            }
            if (task.dueDate && task.dueDate >= monthStart && task.dueDate <= monthEndStr) {
                counts["smart:thisMonth"] = (counts["smart:thisMonth"] || 0) + 1;
            }
            if (task.dueDate && task.dueDate >= recentStartStr && task.dueDate <= recentEndStr) {
                counts["smart:recent"] = (counts["smart:recent"] || 0) + 1;
            }
        });
        return counts;
    }, [allTasksForCount]);

    // Advanced group task counts
    const advGroupCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        advancedGroups.forEach((group) => {
            counts[group.id] = allTasksForCount.filter((task) => matchAdvancedGroup(task, group)).length;
        });
        return counts;
    }, [allTasksForCount, advancedGroups, matchAdvancedGroup]);

    const handleAdvGroupClick = (groupId: string) => {
        setSelectedListId(selectedListId === `adv:${groupId}` ? null : `adv:${groupId}`);
    };

    const handleEditAdvGroup = async (e: React.MouseEvent, group: AdvancedGroup) => {
        e.stopPropagation();
        setEditingAdvGroup(group);
        try {
            const existingWindow = await WebviewWindow.getByLabel("advanced-group-form");
            if (existingWindow) {
                await existingWindow.setFocus();
                return;
            }
        } catch {}

        new WebviewWindow("advanced-group-form", {
            url: `/dialog/advanced-group-form?groupId=${encodeURIComponent(group.id)}`,
            title: t("advanced_groups.edit"),
            width: 420,
            height: 600,
            resizable: false,
            alwaysOnTop: true,
            decorations: false,
            transparent: true,
            // shadow: true,
        });
    };

    const handleContextMenu = (e: React.MouseEvent, type: "list" | "advGroup", id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type, id });
    };

    const handlePinList = (listId: string) => {
        const list = allLists.find((l) => l.id === listId);
        if (list) {
            updateList.mutate({ id: listId, isPinned: !list.isPinned });
        }
        setContextMenu(null);
    };

    const handleArchiveList = (listId: string) => {
        const list = allLists.find((l) => l.id === listId);
        if (list) {
            updateList.mutate({ id: listId, isArchived: !list.isArchived });
        }
        setContextMenu(null);
    };

    const handleDeleteList = (listId: string) => {
        deleteList.mutate(listId);
        setContextMenu(null);
    };

    const handlePinAdvGroup = (groupId: string) => {
        const group = advancedGroups.find((g) => g.id === groupId);
        if (group) {
            updateAdvancedGroup({ ...group, isPinned: !group.isPinned });
        }
        setContextMenu(null);
    };

    const handleDeleteAdvGroup = (groupId: string) => {
        deleteAdvancedGroup(groupId);
        setContextMenu(null);
    };

    const handleListClick = (listId: string) => {
        setSelectedListId(selectedListId === listId ? null : listId);
    };

    const handleCreateList = async () => {
        try {
            const existingWindow = await WebviewWindow.getByLabel("list-form");
            if (existingWindow) {
                await existingWindow.setFocus();
                return;
            }
        } catch {}

        new WebviewWindow("list-form", {
            url: "/dialog/list-form",
            title: t("lists.create_list"),
            width: 480,
            height: 500,
            resizable: false,
            center: true,
            alwaysOnTop: true,
            decorations: false,
            transparent: true,
            // shadow: true,
        });
    };

    const handleEditList = async (e: React.MouseEvent, list: List) => {
        e.stopPropagation();
        try {
            const existingWindow = await WebviewWindow.getByLabel("list-form");
            if (existingWindow) {
                await existingWindow.setFocus();
                return;
            }
        } catch {}

        new WebviewWindow("list-form", {
            url: `/dialog/list-form?listId=${encodeURIComponent(list.id)}`,
            title: t("lists.edit_list"),
            width: 480,
            height: 500,
            resizable: false,
            center: true,
            alwaysOnTop: true,
            decorations: false,
            transparent: true,
            // shadow: true,
        });
    };

    const getGroupIcon = (iconKey: string) => {
        const Icon = GROUP_ICON_MAP[iconKey] || InboxIcon;
        return <Icon className="w-3.5 h-3.5" />;
    };

    // Compute header title based on selected list
    const headerTitle = useMemo(() => {
        if (!selectedListId) return t("navigation.tasks");
        if (selectedListId.startsWith("adv:")) {
            const groupId = selectedListId.slice(4);
            const group = advancedGroups.find((g) => g.id === groupId);
            return group?.name || t("navigation.tasks");
        }
        if (selectedListId === "smart:today") return t("lists.today");
        if (selectedListId === "smart:tomorrow") return t("lists.tomorrow");
        if (selectedListId === "smart:recent7days") return t("lists.next_7_days");
        if (selectedListId === "smart:thisMonth") return t("lists.this_month");
        if (selectedListId === "smart:recent") return t("lists.recent");
        if (selectedListId === "inbox") return t("lists.inbox");
        const list = allLists.find((l) => l.id === selectedListId);
        return list?.name || t("navigation.tasks");
    }, [selectedListId, allLists, advancedGroups, t]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-500 dark:text-gray-400">{t("common.loading")}</div>
            </div>
        );
    }
    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Task Groups Panel */}
            <div
                className="border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
                style={{ width: groupsPanelWidth, minWidth: 215, maxWidth: 315, flexShrink: 0, backgroundColor: 'var(--theme-bg-20)' }}
            >
                {/* Pinned items - icon only */}
                {(pinnedLists.length > 0 || pinnedAdvGroups.length > 0) && (
                    <div className="px-2 pt-2 pb-1">
                        <div className="flex flex-wrap gap-1">
                            {pinnedLists.map((list) => {
                                const isActive = selectedListId === list.id;
                                return (
                                    <div key={list.id} className="relative group">
                                        <button
                                            onClick={() => handleListClick(list.id)}
                                            onContextMenu={(e) => handleContextMenu(e, "list", list.id)}
                                            title={list.name}
                                            className={`p-1.5 rounded-lg transition-colors text-sm ${
                                                isActive
                                                    ? "bg-black/10 dark:bg-white/15"
                                                    : "hover:bg-black/5 dark:hover:bg-white/10"
                                            }`}
                                            style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                                        >
                                            {resolveIcon(list.icon)}
                                        </button>
                                    </div>
                                );
                            })}
                            {pinnedAdvGroups.map((group) => {
                                const isActive = selectedListId === `adv:${group.id}`;
                                return (
                                    <div key={group.id} className="relative group">
                                        <button
                                            onClick={() => handleAdvGroupClick(group.id)}
                                            onContextMenu={(e) => handleContextMenu(e, "advGroup", group.id)}
                                            title={group.name}
                                            className={`p-1.5 rounded-lg transition-colors text-sm ${
                                                isActive
                                                    ? "bg-black/10 dark:bg-white/15"
                                                    : "hover:bg-black/5 dark:hover:bg-white/10"
                                            }`}
                                            style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                                        >
                                            {resolveIcon(group.icon)}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Separator line */}
                        <hr className="mt-2" style={{
                            borderColor: `color-mix(in srgb, ${themeColor} 30%, white)`
                        }}/>
                    </div>
                )}

                {/* Smart lists - fixed at top */}
                <div className="px-2 pt-2 pb-1">
                    <div className="space-y-px">
                        {visibleSmartLists.map((smartList) => {
                            const isActive = selectedListId === smartList.id;
                            const count = listTaskCounts[smartList.id] || 0;
                            const groupKey = smartList.id.replace("smart:", "") as keyof typeof smartGroupVisibility;
                            const isToggleable = !smartList.required;

                            return (
                                <div key={smartList.id} className="relative group">
                                    <button
                                        onClick={() => handleListClick(smartList.id)}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-sm ${
                                            isActive
                                                ? 'bg-black/10 dark:bg-white/15'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'
                                        }`}
                                        style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                                    >
                                        {getGroupIcon(smartList.iconKey)}
                                        <span className="flex-1 truncate">{t(smartList.labelKey)}</span>
                                        {count > 0 && (
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{count}</span>
                                        )}
                                    </button>
                                    {showGroupSettings && isToggleable && (
                                        <button
                                            onClick={() =>
                                                setSmartGroupVisibility(groupKey, !smartGroupVisibility[groupKey])
                                            }
                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-70 hover:opacity-100"
                                        >
                                            {smartGroupVisibility[groupKey] ? (
                                                <EyeIcon className="w-3 h-3 text-gray-400" />
                                            ) : (
                                                <EyeSlashIcon className="w-3 h-3 text-gray-400" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Separator line */}
                    <hr className="mt-2" style={{
                        borderColor: `color-mix(in srgb, ${themeColor} 30%, white)`
                    }}/>
                </div>

                {/* Advanced groups */}
                <div className="overflow-auto px-2 py-2">
                    {/* Section header */}
                    <div className="flex items-center justify-between mb-1 px-1.5">
                        <button
                            onClick={() => setAdvListsExpanded(!advListsExpanded)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                            {advListsExpanded ? (
                                <ChevronDownIcon className="w-3 h-3" />
                            ) : (
                                <ChevronRightIcon className="w-3 h-3" />
                            )}
                            {t("advanced_groups.title")}
                        </button>
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => setShowGroupSettings(!showGroupSettings)}
                                className={`p-0.5 rounded transition-colors ${
                                    showGroupSettings
                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-500"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
                                }`}
                                title={t("lists.manage")}
                            >
                                <EyeIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={async () => {
                                    setEditingAdvGroup(null);
                                    try {
                                        const existingWindow = await WebviewWindow.getByLabel("advanced-group-form");
                                        if (existingWindow) {
                                            await existingWindow.setFocus();
                                            return;
                                        }
                                    } catch {}

                                    new WebviewWindow("advanced-group-form", {
                                        url: "/dialog/advanced-group-form",
                                        title: t("advanced_groups.create"),
                                        width: 520,
                                        height: 700,
                                        resizable: false,
                                        center: true,
                                        alwaysOnTop: true,
                                        decorations: false,
                                        transparent: true,
                                        // shadow: true,
                                    });
                                }}
                                className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title={t("lists.create_list")}
                            >
                                <PlusIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            </button>
                        </div>
                    </div>
                    {advListsExpanded && (
                        <div className="space-y-px">
                            {[...advancedGroups]
                                .sort((a, b) => {
                                    if (a.isPinned && !b.isPinned) return -1;
                                    if (!a.isPinned && b.isPinned) return 1;
                                    return 0;
                                })
                                .map((group) => {
                                    const isActive = selectedListId === `adv:${group.id}`;
                                    const count = advGroupCounts[group.id] || 0;

                                    return (
                                        <div key={group.id} className="relative group">
                                            <button
                                                onClick={() => handleAdvGroupClick(group.id)}
                                                onContextMenu={(e) => handleContextMenu(e, "advGroup", group.id)}
                                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left group/item text-sm ${
                                                    isActive
                                                        ? "bg-black/10 dark:bg-white/15"
                                                        : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
                                                }`}
                                                style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                                            >
                                                <span className="flex-shrink-0 text-sm">
                                                    {resolveIcon(group.icon)}
                                                </span>
                                                <span className="flex-1 truncate">{group.name}</span>
                                                {count > 0 && (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 group-hover/item:hidden">
                                                        {count}
                                                    </span>
                                                )}
                                                <span
                                                    onClick={(e) => handleEditAdvGroup(e, group)}
                                                    className="hidden group-hover/item:block p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                                >
                                                    <PencilIcon className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                                </span>
                                            </button>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>

                {/* Scrollable: groups */}
                <div className="overflow-auto px-2 py-2">
                    {/* Section header */}
                    <div className="flex items-center justify-between mb-1 px-1.5">
                        <button
                            onClick={() => setListsExpanded(!listsExpanded)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                            {listsExpanded ? (
                                <ChevronDownIcon className="w-3 h-3" />
                            ) : (
                                <ChevronRightIcon className="w-3 h-3" />
                            )}
                            {t("lists.title")}
                        </button>
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => setShowGroupSettings(!showGroupSettings)}
                                className={`p-0.5 rounded transition-colors ${
                                    showGroupSettings
                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-500"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
                                }`}
                                title={t("lists.manage")}
                            >
                                <EyeIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleCreateList}
                                className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title={t("lists.create_list")}
                            >
                                <PlusIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {listsExpanded && (
                        <div className="space-y-px">
                            {/* User lists */}
                            {userLists.map((list) => {
                                const isActive = selectedListId === list.id;
                                const count = listTaskCounts[list.id] || 0;

                                return (
                                    <div key={list.id} className="relative group">
                                        <button
                                            onClick={() => handleListClick(list.id)}
                                            onContextMenu={(e) => handleContextMenu(e, "list", list.id)}
                                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left group/item text-sm ${
                                                isActive
                                                    ? "bg-black/10 dark:bg-white/15"
                                                    : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
                                            }`}
                                            style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                                        >
                                            <span className="flex-shrink-0 text-sm">
                                                {resolveIcon(list.icon)}
                                            </span>
                                            <span className="flex-1 truncate">{list.name}</span>
                                            {count > 0 && (
                                                <span className="text-xs text-gray-400 dark:text-gray-500 group-hover/item:hidden">
                                                    {count}
                                                </span>
                                            )}
                                            <span
                                                onClick={(e) => handleEditList(e, list)}
                                                className="hidden group-hover/item:block p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                            >
                                                <PencilIcon className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                            </span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Resize handle: groups <-> list */}
            <ResizeHandle onResize={(delta) => setGroupsPanelWidth((w) => Math.max(215, Math.min(315, w + delta)))} />

            {/* Task List Panel */}
            <div className="flex flex-col overflow-hidden flex-1 min-w-[300px] max-w-[400px]" style={{ backgroundColor: 'var(--theme-bg-2)' }}>
                {/* Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 px-3 py-3">
                    <div data-tauri-drag-region className="flex items-center justify-between">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{headerTitle}</h1>
                        <div className="flex items-center gap-2">
                            <div
                                className="relative"
                                onBlur={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowSettings(false);
                                }}
                                tabIndex={-1}
                            >
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className={`p-2 rounded-lg transition-colors ${
                                        showSettings
                                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-500"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                                    }`}
                                    title={t("tasks.settings")}
                                >
                                    <AdjustmentsHorizontalIcon className="w-3 h-3" />
                                </button>

                                {/* Settings popup */}
                                {showSettings && (
                                    <div
                                        className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4 space-y-4"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* View mode */}
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                                                {t("tasks.settings_view")}
                                            </label>
                                            <div className="flex gap-1">
                                                {Object.entries(VIEW_MODES).map(([key, label]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() =>
                                                            handleSetViewMode(key as keyof typeof VIEW_MODES)
                                                        }
                                                        className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors ${
                                                            viewMode === key
                                                                ? "bg-blue-500 text-white"
                                                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                        }`}
                                                    >
                                                        {t(label)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Status filter */}
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                                                {t("tasks.settings_status")}
                                            </label>
                                            <div className="flex gap-1">
                                                {[
                                                    { value: "all", label: t("tasks.status.all") },
                                                    { value: "active", label: t("tasks.status.active") },
                                                    { value: "completed", label: t("tasks.status.completed") },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => handleSetFilterStatus(opt.value as any)}
                                                        className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors ${
                                                            filterStatus === opt.value
                                                                ? "bg-blue-500 text-white"
                                                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sort */}
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                                                {t("tasks.settings_sort")}
                                            </label>
                                            <TaskSortControls
                                                onChange={(sortBy, sortOrder) => {
                                                    setTaskSortBy(sortBy as SortBy);
                                                    setTaskSortOrder(sortOrder);
                                                    persistSettings({
                                                        sortBy: sortBy as ListSettings["sortBy"],
                                                        sortOrder,
                                                    });
                                                }}
                                            />
                                        </div>

                                        {/* Group */}
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                                                {t("tasks.settings_group")}
                                            </label>
                                            <TaskGroupControls onChange={(groupBy) => handleSetTaskGroupBy(groupBy)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Task content area */}
                {viewMode === "calendar" ? (
                    <CalendarView
                        tasks={filteredTasks}
                        allTags={allTags}
                        selectedTaskId={selectedTaskId}
                        onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
                        onToggleTask={handleToggleTask}
                    />
                ) : viewMode === "kanban" ? (
                    <KanbanView
                        tasks={filteredTasks}
                        allTags={allTags}
                        selectedTaskId={selectedTaskId}
                        onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
                        onToggleTask={handleToggleTask}
                        onUpdateTask={handleUpdateTaskInline}
                    />
                ) : viewMode === "matrix" ? (
                    <EisenhowerMatrixView
                        tasks={filteredTasks}
                        allTags={allTags}
                        selectedTaskId={selectedTaskId}
                        onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
                        onToggleTask={handleToggleTask}
                        onUpdateTask={handleUpdateTaskInline}
                    />
                ) : (
                    <div className="flex-1 overflow-auto p-4">
                        {/* Inline new task form */}
                        <div className="mb-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <textarea
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                onKeyDown={handleInlineKeyDown}
                                placeholder={t("tasks.inline_placeholder")}
                                rows={2}
                                className="w-full px-4 pt-3 pb-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                            />
                            <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-1">
                                    {/* Priority */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                                            className={`p-1.5 rounded transition-colors ${
                                                newTaskPriority > 0
                                                    ? "text-orange-500 bg-orange-50 dark:bg-orange-900/20"
                                                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
                                            }`}
                                            title={t("tasks.priority.label")}
                                        >
                                            <AdjustmentsHorizontalIcon className="w-4 h-4" />
                                        </button>
                                        {showPriorityPicker && (
                                            <div className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1.5 flex gap-1 z-50">
                                                {[0, 1, 2, 3].map((p) => (
                                                    <button
                                                        key={p}
                                                        onClick={() => {
                                                            setNewTaskPriority(p as Priority);
                                                            setShowPriorityPicker(false);
                                                        }}
                                                        className={`px-2 py-1 rounded text-xs transition-colors ${
                                                            newTaskPriority === p
                                                                ? "bg-blue-500 text-white"
                                                                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                                                        }`}
                                                    >
                                                        {t(`tasks.priority.${["none", "low", "medium", "high"][p]}`)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Tags */}
                                    <button
                                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
                                        title={t("tasks.tags.title")}
                                    >
                                        <TagIcon className="w-4 h-4" />
                                    </button>
                                    {/* Attachment */}
                                    <button
                                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
                                        title={t("tasks.attachment")}
                                    >
                                        <PaperClipIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={handleCreateInline}
                                    disabled={!newTaskTitle.trim()}
                                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                                >
                                    {t("tasks.create_task")}
                                </button>
                            </div>
                        </div>

                        {filteredTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                <p className="text-lg">{t("tasks.no_tasks")}</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {flatItems.map((item) => {
                                    const isSubtask = item.type === "subtask";
                                    const displayTask = isSubtask
                                        ? {
                                              ...item.subtask,
                                              description: "",
                                              priority: 0 as Priority,
                                              createdAt: item.subtask.createdAt || "",
                                              updatedAt: item.subtask.updatedAt || "",
                                              sortOrder: item.subtask.sortOrder,
                                              sortBy: "sortOrder" as const,
                                              groupBy: "none" as const,
                                          }
                                        : item.task;

                                    return (
                                        <TaskRow
                                            key={displayTask.id}
                                            task={displayTask as Task}
                                            isSelected={
                                                isSubtask
                                                    ? selectedSubtaskId === displayTask.id
                                                    : selectedTaskId === displayTask.id && !selectedSubtaskId
                                            }
                                            onSelect={() => {
                                                if (isSubtask) {
                                                    setSelectedTaskId(item.parentTask.id);
                                                    setSelectedSubtaskId(item.subtask.id);
                                                } else {
                                                    setSelectedTaskId(
                                                        selectedTaskId === item.task.id ? null : item.task.id,
                                                    );
                                                    setSelectedSubtaskId(null);
                                                }
                                            }}
                                            onToggle={() => {
                                                if (isSubtask) {
                                                    updateSubtask.mutate({
                                                        id: item.subtask.id,
                                                        taskId: item.parentTask.id,
                                                        isCompleted: !item.subtask.isCompleted,
                                                    });
                                                } else {
                                                    handleToggleTask(item.task.id, item.task.isCompleted);
                                                }
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Resize handle: list <-> detail */}
            <ResizeHandle onResize={(delta) => setDetailPanelWidth((w) => Math.max(300, Math.min(800, w - delta)))} />

            {/* Task Detail Panel */}
            <div
                className="overflow-hidden border-l border-gray-200 dark:border-gray-700 flex-shrink-0"
                style={{ width: detailPanelWidth, backgroundColor: 'var(--theme-bg-2)' }}
            >
                {selectedTask ? (
                    <TaskDetailPanel
                        task={selectedTask}
                        allTags={allTags}
                        selectedSubtaskId={selectedSubtaskId}
                        onClose={() => {
                            setSelectedTaskId(null);
                            setSelectedSubtaskId(null);
                        }}
                        onDelete={() => handleDeleteTask(selectedSubtaskId || selectedTask.id)}
                        onUpdateTask={handleUpdateTaskField}
                        onSubtaskClick={(id) => setSelectedSubtaskId(id)}
                        onSubtaskBack={() => setSelectedSubtaskId(null)}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <p className="text-sm">{t("tasks.select_task")}</p>
                    </div>
                )}
            </div>

            {/* Task Form Dialog */}
            <TaskForm
                isOpen={showTaskForm}
                onClose={() => {
                    setShowTaskForm(false);
                    setEditingTask(null);
                }}
                onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
                task={editingTask}
            />

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
                    <div
                        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        {contextMenu.type === "list" ? (
                            <>
                                <button
                                    onClick={() => {
                                        const list = allLists.find((l) => l.id === contextMenu.id);
                                        if (list)
                                            handleEditList({ stopPropagation: () => {} } as React.MouseEvent, list);
                                        setContextMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    {t("common.edit")}
                                </button>
                                <button
                                    onClick={() => handlePinList(contextMenu.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Pin className="w-4 h-4" />
                                    {allLists.find((l) => l.id === contextMenu.id)?.isPinned
                                        ? t("lists.unpin")
                                        : t("lists.pin")}
                                </button>
                                <button
                                    onClick={() => handleArchiveList(contextMenu.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <ArchiveBoxIcon className="w-4 h-4" />
                                    {allLists.find((l) => l.id === contextMenu.id)?.isArchived
                                        ? t("lists.unarchive")
                                        : t("lists.archive")}
                                </button>
                                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                <button
                                    onClick={() => handleDeleteList(contextMenu.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    {t("common.delete")}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => {
                                        const group = advancedGroups.find((g) => g.id === contextMenu.id);
                                        if (group)
                                            handleEditAdvGroup(
                                                { stopPropagation: () => {} } as React.MouseEvent,
                                                group,
                                            );
                                        setContextMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    {t("common.edit")}
                                </button>
                                <button
                                    onClick={() => handlePinAdvGroup(contextMenu.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Pin className="w-4 h-4" />
                                    {advancedGroups.find((g) => g.id === contextMenu.id)?.isPinned
                                        ? t("lists.unpin")
                                        : t("lists.pin")}
                                </button>
                                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                <button
                                    onClick={() => handleDeleteAdvGroup(contextMenu.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    {t("common.delete")}
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

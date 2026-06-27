import {
  Archive,
  RefreshCw,
  CornerDownRight,
  CornerUpLeft,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clipboard,
  ClipboardList,
  Clock,
  File,
  MoreVertical,
  AlertCircle,
  Film,
  Flag,
  Contact,
  Inbox,
  Search,
  Paperclip,
  Pencil,
  Plus,
  List as ListIcon,
  Sun,
  Table2,
  Tag as TagIconLucide,
  Trash2,
  Columns,
  X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Pin, Send } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import CheckNow from '@/components/common/CheckNow'
import MilkdownEditor from '@/components/MilkdownEditor'
import LinkedItemSelector from '@/components/media/LinkedItemSelector'
import { AvatarImage } from '@/components/people/AvatarImage'
import { ResizeHandle } from '@/components/ResizeHandle'
import TagCombobox from '@/components/TagCombobox'
import CalendarView from '@/components/tasks/CalendarView'
import EisenhowerMatrixView from '@/components/tasks/EisenhowerMatrixView'
import KanbanView from '@/components/tasks/KanbanView'
import StepList from '@/components/tasks/StepList'
import SubtaskList from '@/components/tasks/SubtaskList'
import TaskForm from '@/components/tasks/TaskForm'
import { TaskGroupControls } from '@/components/tasks/TaskGroupControls'
import { TaskSortControls } from '@/components/tasks/TaskSortControls'
import { PRIORITY_COLORS, VIEW_MODES } from '@/lib/constants'
import { DATE_RANGE_PICKER_LABEL, GROUP_FORM_LABEL, showOverlay, TAG_LIST_PICKER_LABEL } from '@/lib/overlayManager'
import { getScreenRect } from '@/lib/screenRect'
import { getLocalToday } from '@/lib/taskHelpers'
import { useMediaItems } from '@/queries/useMediaQueries'
import { useAllNotes } from '@/queries/useNoteQueries'
import { useAllPersons } from '@/queries/usePersonQueries'
import {
  useAllSubtasks,
  useAllTasks,
  useAtomTag,
  useAttachments,
  useCompleteRecurringTask,
  useCreateAttachment,
  useCreateList,
  useCreateStep,
  useCreateSubtask,
  useCreateTag,
  useCreateTask,
  useCreateTaskTemplate,
  useDeleteAttachment,
  useDeleteList,
  useDeleteStep,
  useDeleteSubtask,
  useDeleteTask,
  useIncrementTemplateUsage,
  useLinkTaskItem,
  useLists,
  useReorderSteps,
  useReorderSubtasks,
  useSaveListSettings,
  useSteps,
  useSubtasks,
  useTags,
  useTaskLinkedItems,
  useTasks,
  useTaskTemplates,
  useToggleTaskCompletion,
  useUnlinkTaskItem,
  useUpdateList,
  useUpdateStep,
  useUpdateSubtask,
  useUpdateTask,
  useUpdateTaskTemplate,
} from '@/queries/useTaskQueries'
import { useAppStore } from '@/stores/useAppStore'
import { useViewStore } from '@/stores/useViewStore'
import type { Attachment, PendingAttachment } from '@/types/attachment'
import type { GroupBy, List, ListSettings, Priority, SortBy, Step as StepType, Task, TaskStatus } from '@/types/task'

type TaskStatus3 = 'all' | 'active' | 'completed'

const ICON_KEY_TO_EMOJI: Record<string, string> = {
  book: '📖',
  briefcase: '💼',
  fire: '🔥',
  flag: '🚩',
  folder: '📁',
  heart: '❤️',
  home: '🏠',
  inbox: '📥',
  lightning: '⚡',
  star: '⭐',
  target: '🎯',
}

function resolveIcon(icon?: string): string {
  if (!icon) {
    return '📁'
  }
  if (icon.length <= 2) {
    return icon
  }
  return ICON_KEY_TO_EMOJI[icon] || '📁'
}

import type { AdvancedGroup } from '@/stores/useAppStore'
import type { Tag } from '@/types/tag'

// ==================== Helper: Build subtask tree ====================
function buildSubtaskTree(flatSubtasks: Task[]): (Task & { children?: Task[] })[] {
  const map = new Map<string, Task & { children?: Task[] }>()
  const roots: (Task & { children?: Task[] })[] = []

  flatSubtasks.forEach((s) => {
    map.set(s.id, { ...s, children: [] })
  })

  flatSubtasks.forEach((s) => {
    const node = map.get(s.id)
    if (!node) return
    if (s.parentTaskId && map.has(s.parentTaskId)) {
      map.get(s.parentTaskId)?.children?.push(node) ?? ''
    } else {
      roots.push(node)
    }
  })

  return roots
}

// ==================== Helper: Get all descendant IDs ====================
function getDescendantIds(flatSubtasks: Task[], parentId: string): string[] {
  const children = flatSubtasks.filter((s) => s.parentTaskId === parentId)
  const result: string[] = []
  for (const child of children) {
    result.push(child.id)
    result.push(...getDescendantIds(flatSubtasks, child.id))
  }
  return result
}

// ==================== Helper: Calculate steps progress ====================
function calcStepsProgress(steps: StepType[]): { completed: number; total: number } | null {
  if (steps.length === 0) {
    return null
  }
  const completed = steps.filter((s) => s.isCompleted).length
  return { completed, total: steps.length }
}

// ==================== Helper: Calculate full progress (subtasks + steps) ====================
function calcFullProgress(subtasks: Task[], steps: StepType[]): { completed: number; total: number } | null {
  const total = subtasks.length + steps.length
  if (total === 0) {
    return null
  }
  const completed = subtasks.filter((s) => s.isCompleted).length + steps.filter((s) => s.isCompleted).length
  return { completed, total }
}

// ==================== Task Detail Panel ====================
function TaskDetailPanel({
  task,
  allTags,
  selectedSubtaskId,
  onUpdateTask,
  onSubtaskClick,
  onSubtaskBack,
  inlineDateOpenedRef,
  focusTitleOnMount,
  onFocusTitleDone,
}: {
  task: Task
  allTags: Tag[]
  selectedSubtaskId?: string | null
  onClose: () => void
  onDelete: () => void
  onUpdateTask: (params: any) => void
  onSubtaskClick?: (id: string) => void
  onSubtaskBack?: () => void
  inlineDateOpenedRef?: React.RefObject<boolean>
  focusTitleOnMount?: boolean
  onFocusTitleDone?: () => void
}) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  // When a subtask is selected, treat it as the active task
  const { data: flatSubtasks = [] } = useSubtasks(task.id)
  const selectedSubtask = useMemo(() => {
    if (!selectedSubtaskId) {
      return null
    }
    return flatSubtasks.find((s) => s.id === selectedSubtaskId) || null
  }, [flatSubtasks, selectedSubtaskId])

  const activeTask = selectedSubtask || task
  const [editTitle, setEditTitle] = useState(activeTask.title)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const activeTaskIdRef = useRef(activeTask.id)

  useLayoutEffect(() => {
    if (activeTaskIdRef.current !== activeTask.id) {
      activeTaskIdRef.current = activeTask.id
      setEditTitle(activeTask.title)
    }
  }, [activeTask.id, activeTask.title])

  useEffect(() => {
    setEditTitle(activeTask.title)
  }, [activeTask.title, activeTask.id])

  useEffect(() => {
    if (focusTitleOnMount) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus()
        titleInputRef.current?.select()
        onFocusTitleDone?.()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [focusTitleOnMount, onFocusTitleDone])

  const handleTitleBlur = () => {
    if (activeTaskIdRef.current !== activeTask.id) return
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== activeTask.title) {
      onUpdateTask({ title: trimmed })
    } else {
      setEditTitle(activeTask.title)
    }
  }

  const { data: steps = [] } = useSteps(activeTask.id)
  // Load subtasks of the active task (direct children only)
  const { data: activeSubtasks = [] } = useSubtasks(activeTask.id)

  const createSubtask = useCreateSubtask()
  const updateSubtask = useUpdateSubtask()
  const deleteSubtask = useDeleteSubtask()
  const createStep = useCreateStep()
  const updateStep = useUpdateStep()
  const deleteStep = useDeleteStep()
  const createTag = useCreateTag()
  const reorderSubtasks = useReorderSubtasks()
  const reorderSteps = useReorderSteps()

  const { data: attachments = [] } = useAttachments(activeTask.id)
  const createAttachmentMutation = useCreateAttachment()
  const deleteAttachmentMutation = useDeleteAttachment()

  // Track uploading attachments with their sync status
  const [uploadingAttachments, setUploadingAttachments] = useState<
    Map<string, { attachment: Attachment; status: 'uploading' | 'syncing' | 'synced' | 'failed'; error?: string }>
  >(new Map())

  const { data: linkedItemsData = [] } = useTaskLinkedItems(activeTask.id)
  const linkTaskItem = useLinkTaskItem()
  const unlinkTaskItem = useUnlinkTaskItem()
  const { data: allPersons = [] } = useAllPersons()
  const { data: mediaItemsData = [] } = useMediaItems()
  const { data: allNotes = [] } = useAllNotes()

  const linkedNoteIds = useMemo(
    () => linkedItemsData.filter((li) => li.linkedType === 'note').map((li) => li.linkedId),
    [linkedItemsData],
  )
  const linkedPersonIds = useMemo(
    () => linkedItemsData.filter((li) => li.linkedType === 'person').map((li) => li.linkedId),
    [linkedItemsData],
  )
  const linkedMediaIds = useMemo(
    () => linkedItemsData.filter((li) => li.linkedType === 'media').map((li) => li.linkedId),
    [linkedItemsData],
  )

  const linkedNotes = useMemo(() => allNotes.filter((n) => linkedNoteIds.includes(n.id)), [allNotes, linkedNoteIds])
  const linkedPersons = useMemo(
    () => allPersons.filter((p) => linkedPersonIds.includes(p.id)),
    [allPersons, linkedPersonIds],
  )
  const linkedMediaItems = useMemo(
    () => mediaItemsData.filter((m) => linkedMediaIds.includes(m.id)),
    [mediaItemsData, linkedMediaIds],
  )

  const handleLinkItem = useCallback(
    (linkedType: string, linkedId: string) => {
      linkTaskItem.mutate({ linkedId, linkedType, taskId: activeTask.id })
    },
    [activeTask.id, linkTaskItem],
  )

  const handleUnlinkItem = useCallback(
    (linkId: string) => {
      unlinkTaskItem.mutate(linkId)
    },
    [unlinkTaskItem],
  )

  const toggleSection = useCallback((key: string) => {
    setVisibleSections((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      onUpdateTask({ visibleSections: JSON.stringify(next) })
      return next
    })
  }, [onUpdateTask])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const defaultTaskSections = useAppStore((s) => s.defaultTaskSections)
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>(() => {
    if (task.visibleSections) {
      try { return JSON.parse(task.visibleSections) } catch {}
    }
    return { ...defaultTaskSections }
  })

  useEffect(() => {
    if (activeTask.visibleSections) {
      try {
        setVisibleSections(JSON.parse(activeTask.visibleSections))
        return
      } catch {}
    }
    setVisibleSections({ ...defaultTaskSections })
  }, [activeTask.id, activeTask.visibleSections, defaultTaskSections])
  const [attachContextMenu, setAttachContextMenu] = useState<{ x: number; y: number; att: Attachment } | null>(null)
  const attachContextMenuRef = useRef<HTMLDivElement>(null)
  const [attachContextMenuFlipY, setAttachContextMenuFlipY] = useState(false)

  useLayoutEffect(() => {
    if (!attachContextMenu || !attachContextMenuRef.current) {
      return
    }
    const rect = attachContextMenuRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - attachContextMenu.y
    setAttachContextMenuFlipY(rect.height > spaceBelow && attachContextMenu.y > spaceBelow)
  }, [attachContextMenu])

  const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']

  const isImageFile = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    return IMAGE_EXTENSIONS.includes(ext)
  }

  useEffect(() => {
    ;(async () => {
      const api = await import('@/lib/api')
      const { getActiveProvider } = await import('@/lib/sync')
      const activeProvider = await getActiveProvider()

      for (const att of attachments) {
        if (imageUrls[att.id]) {
          continue
        }
        if (!isImageFile(att.originalFilename)) {
          continue
        }
        if (att.localPath) {
          try {
            const dataUrl = await api.readImageDataUrl(att.localPath)
            setImageUrls((prev) => ({ ...prev, [att.id]: dataUrl }))
          } catch {}
        } else if (activeProvider) {
          const { provider, info } = activeProvider
          try {
            const content = await provider.getFileContent(info.owner, info.repo, `attachments/${att.filename}`)
            if (content) {
              const bytes = Uint8Array.from(atob(content), (c) => c.charCodeAt(0))
              const localPath = await api.cacheAttachmentImage({
                fileBytes: Array.from(bytes),
                filename: att.filename,
                id: att.id,
              })
              const dataUrl = await api.readImageDataUrl(localPath)
              setImageUrls((prev) => ({ ...prev, [att.id]: dataUrl }))
            }
          } catch {}
        }
      }
    })()
  }, [attachments])

  const [isDragging, setIsDragging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const unlistenRef = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    const setup = async () => {
      const { getCurrentWebview } = await import('@tauri-apps/api/webview')
      unlistenRef.current = await getCurrentWebview().onDragDropEvent((event) => {
        const panel = panelRef.current
        if (!panel) return

        if (event.payload.type === 'enter' || event.payload.type === 'over') {
          const { x, y } = event.payload.position
          const rect = panel.getBoundingClientRect()
          const inPanel = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
          setIsDragging(inPanel)
        } else if (event.payload.type === 'drop') {
          setIsDragging(false)
          const { paths, position } = event.payload
          const rect = panel.getBoundingClientRect()
          const inPanel = position.x >= rect.left && position.x <= rect.right && position.y >= rect.top && position.y <= rect.bottom
          if (inPanel && paths.length > 0) {
            const filePath = paths[0]
            const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown'
            import('@/lib/api').then((api) => api.readFileBytes(filePath)).then((bytes) => {
              uploadAttachmentBytes(fileName, bytes)
            })
          }
        } else {
          setIsDragging(false)
        }
      })
    }
    setup()
    return () => { unlistenRef.current?.() }
  }, [activeTask.id])

  const lastUploadRef = useRef<{ name: string; time: number } | null>(null)

  const uploadAttachmentBytes = async (fileName: string, bytes: number[]) => {
    const now = Date.now()
    if (lastUploadRef.current && lastUploadRef.current.name === fileName && now - lastUploadRef.current.time < 1000) {
      return
    }
    lastUploadRef.current = { name: fileName, time: now }

    if (bytes.length > 30 * 1024 * 1024) {
      const { message } = await import('@tauri-apps/plugin-dialog')
      await message(t('tasks.attachment_too_large'), { kind: 'error' })
      return
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tempAttachment: Attachment = {
      addedDatetime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      filename: '',
      id: tempId,
      localPath: null,
      originalFilename: fileName,
      rawUrl: null,
      sha256: '',
      syncError: null,
      syncProvider: null,
      syncStatus: 'none',
      taskId: activeTask.id,
      uploadedTo: null,
    }

    setUploadingAttachments((prev) => new Map(prev).set(tempId, { attachment: tempAttachment, status: 'uploading' }))

    try {
      const attachment = await createAttachmentMutation.mutateAsync({
        fileBytes: bytes,
        originalFilename: fileName,
        taskId: activeTask.id,
      })

      setUploadingAttachments((prev) => {
        const next = new Map(prev)
        next.delete(tempId)
        next.set(attachment.id, { attachment, status: 'syncing' })
        return next
      })

      const { getActiveProvider } = await import('@/lib/sync')
      const activeProvider = await getActiveProvider()
      if (activeProvider) {
        const { provider, info } = activeProvider
        const api = await import('@/lib/api')

        try {
          const chunks: string[] = []
          for (let i = 0; i < bytes.length; i += 8192) {
            chunks.push(String.fromCharCode(...bytes.slice(i, i + 8192)))
          }
          const base64Content = btoa(chunks.join(''))
          const uploadTimeout = 30000
          await Promise.race([
            provider.uploadBinaryFile(
              info.owner,
              info.repo,
              `attachments/${attachment.filename}`,
              base64Content,
              `Mindless: add attachment ${attachment.originalFilename}`,
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), uploadTimeout)),
          ])

          const uploadedPath = `attachments/${attachment.filename}`
          const rawUrl = getAttachmentRawUrl(attachment.filename)
          await api.updateAttachmentSyncStatus({
            id: attachment.id,
            rawUrl: rawUrl || undefined,
            syncProvider: info.provider,
            syncStatus: 'synced',
            uploadedTo: uploadedPath,
          })

          setUploadingAttachments((prev) => {
            const next = new Map(prev)
            next.set(attachment.id, { attachment, status: 'synced' })
            return next
          })

          if (isImageFile(attachment.originalFilename) && attachment.localPath) {
            const dataUrl = await api.readImageDataUrl(attachment.localPath)
            setImageUrls((prev) => ({ ...prev, [attachment.id]: dataUrl }))
          }

          setTimeout(() => {
            setUploadingAttachments((prev) => {
              const next = new Map(prev)
              next.delete(attachment.id)
              return next
            })
          }, 500)
        } catch (syncErr) {
          console.error('Failed to sync attachment:', syncErr)

          try {
            await api.cacheAttachmentImage({
              fileBytes: bytes,
              filename: attachment.filename,
              id: attachment.id,
            })
          } catch (cacheErr) {
            console.error('Failed to cache attachment locally:', cacheErr)
          }

          await api.updateAttachmentSyncStatus({
            id: attachment.id,
            syncError: syncErr instanceof Error ? syncErr.message : 'Unknown error',
            syncProvider: info.provider,
            syncStatus: 'failed',
          })

          queryClient.invalidateQueries({ queryKey: ['attachments', activeTask.id] })

          setUploadingAttachments((prev) => {
            const next = new Map(prev)
            next.set(attachment.id, {
              attachment,
              error: syncErr instanceof Error ? syncErr.message : 'Unknown error',
              status: 'failed',
            })
            return next
          })
        }
      } else {
        setUploadingAttachments((prev) => {
          const next = new Map(prev)
          next.delete(tempId)
          return next
        })
      }
    } catch (err) {
      console.error('Failed to add attachment:', err)
      setUploadingAttachments((prev) => {
        const next = new Map(prev)
        next.delete(tempId)
        return next
      })
    }
  }

  const handleAddAttachment = async () => {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      multiple: false,
    })
    if (!selected) {
      return
    }
    const filePath = typeof selected === 'string' ? selected : selected
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown'
    const bytes = await import('@/lib/api').then((a) => a.readFileBytes(filePath))
    await uploadAttachmentBytes(fileName, bytes)
  }

  const handleClipboardPaste = async () => {
    try {
      const bytes = await import('@/lib/api').then((a) => a.readClipboardImage())
      if (!bytes) {
        const { message } = await import('@tauri-apps/plugin-dialog')
        await message(t('tasks.clipboard_no_image'), { kind: 'warning' })
        return
      }
      const now = new Date()
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const fileName = `剪贴板-${ts}.png`

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const tempAttachment: Attachment = {
        addedDatetime: new Date().toISOString().replace('T', ' ').slice(0, 19),
        filename: '',
        id: tempId,
        localPath: null,
        originalFilename: fileName,
        rawUrl: null,
        sha256: '',
        syncError: null,
        syncProvider: null,
        syncStatus: 'none',
        taskId: activeTask.id,
        uploadedTo: null,
      }

      setUploadingAttachments((prev) => new Map(prev).set(tempId, { attachment: tempAttachment, status: 'uploading' }))

      try {
        const attachment = await createAttachmentMutation.mutateAsync({
          fileBytes: bytes,
          originalFilename: fileName,
          taskId: activeTask.id,
        })

        setUploadingAttachments((prev) => {
          const next = new Map(prev)
          next.delete(tempId)
          next.set(attachment.id, { attachment, status: 'syncing' })
          return next
        })

        const { getActiveProvider } = await import('@/lib/sync')
        const activeProvider = await getActiveProvider()
        if (activeProvider) {
          const { provider, info } = activeProvider
          const api = await import('@/lib/api')

          try {
            const chunks: string[] = []
            for (let i = 0; i < bytes.length; i += 8192) {
              chunks.push(String.fromCharCode(...bytes.slice(i, i + 8192)))
            }
            const base64Content = btoa(chunks.join(''))
            const uploadTimeout = 30000
            await Promise.race([
              provider.uploadBinaryFile(
                info.owner,
                info.repo,
                `attachments/${attachment.filename}`,
                base64Content,
                `Mindless: add attachment ${attachment.originalFilename}`,
              ),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), uploadTimeout)),
            ])

            const uploadedPath = `attachments/${attachment.filename}`
            const rawUrl = getAttachmentRawUrl(attachment.filename)
            await api.updateAttachmentSyncStatus({
              id: attachment.id,
              rawUrl: rawUrl || undefined,
              syncProvider: info.provider,
              syncStatus: 'synced',
              uploadedTo: uploadedPath,
            })

            setUploadingAttachments((prev) => {
              const next = new Map(prev)
              next.set(attachment.id, { attachment, status: 'synced' })
              return next
            })

            if (isImageFile(attachment.originalFilename) && attachment.localPath) {
              const dataUrl = await api.readImageDataUrl(attachment.localPath)
              setImageUrls((prev) => ({ ...prev, [attachment.id]: dataUrl }))
            }

            setTimeout(() => {
              setUploadingAttachments((prev) => {
                const next = new Map(prev)
                next.delete(attachment.id)
                return next
              })
            }, 500)
          } catch (syncErr) {
            console.error('Failed to sync attachment:', syncErr)

            try {
              await api.cacheAttachmentImage({
                fileBytes: bytes,
                filename: attachment.filename,
                id: attachment.id,
              })
            } catch (cacheErr) {
              console.error('Failed to cache attachment locally:', cacheErr)
            }

            await api.updateAttachmentSyncStatus({
              id: attachment.id,
              syncError: syncErr instanceof Error ? syncErr.message : 'Unknown error',
              syncProvider: info.provider,
              syncStatus: 'failed',
            })

            queryClient.invalidateQueries({ queryKey: ['attachments', activeTask.id] })

            setUploadingAttachments((prev) => {
              const next = new Map(prev)
              next.set(attachment.id, {
                attachment,
                error: syncErr instanceof Error ? syncErr.message : 'Unknown error',
                status: 'failed',
              })
              return next
            })
          }
        } else {
          setUploadingAttachments((prev) => {
            const next = new Map(prev)
            next.delete(tempId)
            return next
          })
        }
      } catch (err) {
        console.error('Failed to add attachment:', err)
        setUploadingAttachments((prev) => {
          const next = new Map(prev)
          next.delete(tempId)
          return next
        })
      }
    } catch (e) {
      console.error('Clipboard paste failed:', e)
    }
  }

  const handleDeleteAttachment = async (att: Attachment) => {
    setAttachContextMenu(null)

    // If synced, delete from Git first
    if (att.syncStatus === 'synced') {
      try {
        const { getActiveProvider } = await import('@/lib/sync')
        const activeProvider = await getActiveProvider()
        if (activeProvider) {
          const { provider, info } = activeProvider
          const path = `attachments/${att.filename}`
          const sha = await provider.getFileSha(info.owner, info.repo, path)
          if (sha) {
            await provider.deleteFile(
              info.owner,
              info.repo,
              path,
              sha,
              `Mindless: delete attachment ${att.originalFilename}`,
            )
          }
        }
      } catch (syncErr) {
        console.error('Failed to delete attachment from Git:', syncErr)
      }
    }

    // Delete DB entry
    try {
      await deleteAttachmentMutation.mutateAsync(att.id)
    } catch (err) {
      console.error('Failed to delete attachment:', err)
    }

    // Clean up state
    setUploadingAttachments((prev) => {
      const next = new Map(prev)
      next.delete(att.id)
      return next
    })
    setImageUrls((prev) => {
      const next = { ...prev }
      delete next[att.id]
      return next
    })
  }

  const handleRetryUpload = async (att: Attachment) => {
    setAttachContextMenu(null)

    // Try to get localPath from DB if not on the object
    let localPath = att.localPath
    if (!localPath) {
      try {
        const api = await import('@/lib/api')
        const fresh = await api.getAttachmentById(att.id)
        localPath = fresh.localPath
      } catch {}
    }

    if (!localPath) {
      // No cached file found - show error
      setUploadingAttachments((prev) => {
        const next = new Map(prev)
        next.set(att.id, { attachment: att, error: t('tasks.attachment_cache_not_found'), status: 'failed' })
        return next
      })
      return
    }

    // Update status to syncing
    setUploadingAttachments((prev) => {
      const next = new Map(prev)
      next.set(att.id, { attachment: { ...att, localPath }, status: 'syncing' })
      return next
    })

    try {
      const { getActiveProvider } = await import('@/lib/sync')
      const api = await import('@/lib/api')
      const activeProvider = await getActiveProvider()
      if (!activeProvider) {
        setUploadingAttachments((prev) => {
          const next = new Map(prev)
          next.delete(att.id)
          return next
        })
        return
      }

      const { provider, info } = activeProvider
      const bytes = await api.readFileBytes(localPath)

      const chunks: string[] = []
      for (let i = 0; i < bytes.length; i += 8192) {
        chunks.push(String.fromCharCode(...bytes.slice(i, i + 8192)))
      }
      const base64Content = btoa(chunks.join(''))
      const uploadTimeout = 30000
      await Promise.race([
        provider.uploadBinaryFile(
          info.owner,
          info.repo,
          `attachments/${att.filename}`,
          base64Content,
          `Mindless: add attachment ${att.originalFilename}`,
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), uploadTimeout)),
      ])

      const uploadedPath = `attachments/${att.filename}`
      const rawUrl = getAttachmentRawUrl(att.filename)
      await api.updateAttachmentSyncStatus({
        id: att.id,
        rawUrl: rawUrl || undefined,
        syncProvider: info.provider,
        syncStatus: 'synced',
        uploadedTo: uploadedPath,
      })

      queryClient.invalidateQueries({ queryKey: ['attachments', activeTask.id] })

      setUploadingAttachments((prev) => {
        const next = new Map(prev)
        next.set(att.id, { attachment: { ...att, localPath }, status: 'synced' })
        return next
      })

      if (isImageFile(att.originalFilename)) {
        const dataUrl = await api.readImageDataUrl(localPath)
        setImageUrls((prev) => ({ ...prev, [att.id]: dataUrl }))
      }

      setTimeout(() => {
        setUploadingAttachments((prev) => {
          const next = new Map(prev)
          next.delete(att.id)
          return next
        })
      }, 500)
    } catch (syncErr) {
      console.error('Failed to retry sync attachment:', syncErr)
      const api = await import('@/lib/api')
      const syncProvider = localStorage.getItem('mindless-sync-provider') || undefined
      await api.updateAttachmentSyncStatus({
        id: att.id,
        syncError: syncErr instanceof Error ? syncErr.message : 'Unknown error',
        syncProvider: syncProvider,
        syncStatus: 'failed',
      })

      queryClient.invalidateQueries({ queryKey: ['attachments', activeTask.id] })

      setUploadingAttachments((prev) => {
        const next = new Map(prev)
        next.set(att.id, {
          attachment: { ...att, localPath },
          error: syncErr instanceof Error ? syncErr.message : 'Unknown error',
          status: 'failed',
        })
        return next
      })
    }
  }

  const getAttachmentRawUrl = (filename: string) => {
    const syncProvider = localStorage.getItem('mindless-sync-provider')
    if (!syncProvider) return null

    const syncUrl = localStorage.getItem(`mindless-sync-url-${syncProvider}`)
    if (!syncUrl) return null

    const match = syncUrl.trim().match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/)?$/)
    if (!match) return null

    const domain = match[1]
    const owner = match[2]
    const repo = match[3]

    if (domain === 'github.com') {
      return `https://raw.githubusercontent.com/${owner}/${repo}/main/attachments/${filename}`
    } else if (domain === 'gitlab.com' || domain.includes('gitlab.')) {
      return `https://${domain}/${owner}/${repo}/-/raw/main/attachments/${filename}`
    } else if (domain === 'gitee.com') {
      return `https://${domain}/${owner}/${repo}/raw/main/attachments/${filename}`
    }

    return null
  }

  const handleCopyAttachmentLink = (att: Attachment) => {
    const rawUrl = getAttachmentRawUrl(att.filename)
    if (rawUrl) {
      navigator.clipboard.writeText(rawUrl)
    }
    setAttachContextMenu(null)
  }

  const handleDownloadAttachment = (att: Attachment) => {
    const rawUrl = getAttachmentRawUrl(att.filename)
    if (rawUrl) {
      window.open(rawUrl, '_blank')
    }
    setAttachContextMenu(null)
  }

  const handleAttachmentContextMenu = (e: React.MouseEvent, att: Attachment) => {
    e.preventDefault()
    e.stopPropagation()
    setAttachContextMenu({ att, x: e.clientX, y: e.clientY })
  }

  const subtaskTree = useMemo(() => buildSubtaskTree(activeSubtasks), [activeSubtasks])

  // Calculate progress
  const progress = useMemo(() => calcFullProgress(activeSubtasks, steps), [activeSubtasks, steps])

  // Auto-complete task when all subtasks and steps are done
  const autoCompletedRef = useRef(false)
  useEffect(() => {
    if (!progress || progress.total === 0) {
      return
    }
    if (progress.completed === progress.total && !activeTask.isCompleted) {
      if (!autoCompletedRef.current) {
        autoCompletedRef.current = true
        onUpdateTask({ isCompleted: true })
      }
    } else {
      autoCompletedRef.current = false
    }
  }, [progress, activeTask.isCompleted, onUpdateTask])

  // Parse task's tag_ids (comma-separated string)
  const taskTagIds: string[] = useMemo(() => {
    if (!activeTask.tagIds || activeTask.tagIds.length === 0) {
      return []
    }
    return activeTask.tagIds.split(',').filter(Boolean)
  }, [activeTask.tagIds])

  const handleAddSubtask = (title: string, parentSubtaskId?: string) => {
    const level = parentSubtaskId ? (activeSubtasks.find((s) => s.id === parentSubtaskId)?.level ?? 0) + 1 : 0
    createSubtask.mutate({ level, parentSubtaskId, taskId: activeTask.id, title })
  }

  const handleToggleSubtask = (id: string) => {
    const subtask = activeSubtasks.find((s) => s.id === id)
    if (subtask) {
      const newCompleted = !subtask.isCompleted
      updateSubtask.mutate({ id, isCompleted: newCompleted, taskId: activeTask.id })
      const descendants = getDescendantIds(activeSubtasks, id)
      for (const descId of descendants) {
        const desc = activeSubtasks.find((s) => s.id === descId)
        if (desc && desc.isCompleted !== newCompleted) {
          updateSubtask.mutate({ id: descId, isCompleted: newCompleted, taskId: activeTask.id })
        }
      }
    }
  }

  const handleDeleteSubtask = (id: string) => {
    deleteSubtask.mutate({ id, taskId: activeTask.id })
  }

  const handleUpdateSubtaskTitle = (id: string, title: string) => {
    updateSubtask.mutate({ id, taskId: activeTask.id, title })
  }

  const handleAddStep = (description: string) => {
    createStep.mutate({ description, taskId: activeTask.id })
  }

  const handleInsertStepAt = (description: string, afterStepId: string | null, beforeStepId: string | null) => {
    createStep.mutate(
      { description, taskId: activeTask.id },
      {
        onSuccess: (newStep) => {
          if (!newStep) return
          const ids = steps.map((s) => s.id)
          if (afterStepId) {
            const idx = ids.indexOf(afterStepId)
            if (idx !== -1) ids.splice(idx + 1, 0, newStep.id)
            else ids.push(newStep.id)
          } else if (beforeStepId) {
            const idx = ids.indexOf(beforeStepId)
            if (idx !== -1) ids.splice(idx, 0, newStep.id)
            else ids.unshift(newStep.id)
          } else {
            ids.push(newStep.id)
          }
          const items = ids.map((id, i) => ({ id, sortOrder: i }))
          reorderSteps.mutate(items)
        },
      },
    )
  }

  const handleToggleStep = (id: string) => {
    const step = steps.find((s: StepType) => s.id === id)
    if (step) {
      updateStep.mutate({ id, isCompleted: !step.isCompleted, taskId: activeTask.id })
    }
  }

  const handleDeleteStep = (id: string) => {
    deleteStep.mutate({ id, taskId: activeTask.id })
  }

  const handleUpdateStepDescription = (id: string, description: string) => {
    updateStep.mutate({ description, id, taskId: activeTask.id })
  }

  const handleUpdateStepDueDate = (id: string, dueDate?: string) => {
    updateStep.mutate({ dueDate, id, taskId: activeTask.id })
  }

  const handleUpdateStepDueTime = (id: string, dueTime?: string) => {
    updateStep.mutate({ dueTime, id, taskId: activeTask.id })
  }

  const handleToggleTag = (tagId: string) => {
    const currentIds = taskTagIds.includes(tagId) ? taskTagIds.filter((id) => id !== tagId) : [...taskTagIds, tagId]
    onUpdateTask({ tagIds: currentIds.join(',') })
  }

  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [localDesc, setLocalDesc] = useState(activeTask.description || '')

  // Sync local description only when switching tasks
  useEffect(() => {
    setLocalDesc(activeTask.description || '')
  }, [activeTask.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for date picker overlay results
  useEffect(() => {
    const unlisten = listen<{
      type: string
      date?: string
      time?: string
      startDate?: string
      startTime?: string
      endDate?: string
      endTime?: string
      isAllDay?: boolean
    }>('date-range-picker-overlay:result', (e) => {
      if (inlineDateOpenedRef?.current) {
        return
      }
      const p = e.payload
      if (p.type === 'single') {
        onUpdateTask({ dueDate: p.date ?? '', dueTime: p.time ?? '' })
      } else {
        onUpdateTask({
          dueDate: p.startDate ?? '',
          dueTime: p.startTime ?? '',
          endDate: p.endDate ?? '',
          endTime: p.endTime ?? '',
        })
      }
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [onUpdateTask, inlineDateOpenedRef])

  // Debounced save description
  const descTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const handleDescChange = (value: string) => {
    setLocalDesc(value)
    clearTimeout(descTimerRef.current)
    descTimerRef.current = setTimeout(() => {
      onUpdateTask({ description: value })
    }, 500)
  }

  return (
    <div
      ref={panelRef}
      className="relative flex flex-col h-full border-l border-theme-200 dark:border-theme-700"
      style={{ backgroundColor: 'var(--theme-bg-2)' }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-theme-100/80 dark:bg-theme-800/80 border-2 border-dashed border-theme-400 dark:border-theme-500 rounded-lg m-2 pointer-events-none">
          <span className="text-sm text-theme-500 dark:text-theme-400">{t('tasks.drop_to_upload')}</span>
        </div>
      )}
      {/* Date button above header */}
      <div className="px-4 pt-2 pb-2">
        <div className="relative flex" data-date-picker>
          <button
            className={`flex items-center gap-2 px-2 rounded-md text-sm transition-colors ${
              activeTask.dueDate
                ? 'bg-theme-100 dark:bg-theme-800 text-theme-600 dark:text-theme-100'
                : 'text-theme-200 dark:text-theme-700 hover:bg-theme-100 dark:hover:bg-theme-700'
            }`}
            onClick={async (e) => {
              const rect = await getScreenRect(e.currentTarget)
              await showOverlay(DATE_RANGE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
                anchorH: rect.height,
                anchorX: rect.x,
                anchorY: rect.y,
                date: activeTask.dueDate || undefined,
                endDate: activeTask.endDate || undefined,
                endTime: activeTask.endTime || undefined,
                mode: activeTask.endDate ? 'range' : 'single',
                startDate: activeTask.dueDate || undefined,
                startTime: activeTask.dueTime || undefined,
                time: activeTask.dueTime || undefined,
              })
            }}
            type="button"
          >
            <Calendar className="w-4 h-4 flex-shrink-0" strokeWidth={`2`} />
            <span className="truncate">
              {activeTask.dueDate
                ? activeTask.endDate
                  ? `${activeTask.dueDate}${activeTask.dueTime ? ` ${activeTask.dueTime}` : ''} → ${
                      activeTask.endDate
                    }${activeTask.endTime ? ` ${activeTask.endTime}` : ''}`
                  : `${activeTask.dueDate}${activeTask.dueTime ? ` ${activeTask.dueTime}` : ''}`
                : t('tasks.date_placeholder')}
            </span>
          </button>
          <div className="grow" data-tauri-drag-region></div>
          {/* Section toggle drawer */}
          <div className="relative flex-shrink-0 flex items-center gap-0.5">
            {[
              { icon: ListIcon, key: 'steps', label: t('tasks.steps.title') },
              { icon: Table2, key: 'subtasks', label: t('tasks.subtasks.title') },
              { icon: Paperclip, key: 'attachments', label: t('tasks.attachments') },
              { icon: File, key: 'notes', label: t('media.linkedNotes') },
              { icon: Contact, key: 'persons', label: t('notes.linked_persons') },
              { icon: Film, key: 'media', label: t('notes.linked_media') },
            ].map(({ key, icon: Icon, label }) => (
              <button
                className={`relative group p-1 rounded transition-colors ${
                  visibleSections[key]
                    ? 'bg-theme-100 dark:bg-theme-800 text-theme-600 dark:text-theme-100'
                    : 'text-theme-200 dark:text-theme-700 hover:bg-theme-100 dark:hover:bg-theme-700'
                }`}
                key={key}
                onClick={() => toggleSection(key)}
                type="button"
              >
                <Icon
                  className="w-4 h-4"
                  style={{
                    strokeWidth: '1.5px',
                  }}
                />
                <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-theme-900 dark:bg-theme-100 text-white dark:text-theme-900 text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Header */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2">
          <input
            className="text-lg font-semibold text-theme-900 dark:text-theme-100 bg-transparent border-none outline-none flex-1 min-w-0 truncate rounded"
            onBlur={handleTitleBlur}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            ref={titleInputRef}
            type="text"
            value={editTitle}
          />
          <div
            className="relative flex-shrink-0"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setShowPriorityPicker(false)
              }
            }}
            tabIndex={-1}
          >
            <button
              className="p-1 rounded-lg hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
              onClick={() => setShowPriorityPicker(!showPriorityPicker)}
              title={t('tasks.priority.label')}
              type="button"
            >
              <Flag className="w-4 h-4" style={{ color: PRIORITY_COLORS[activeTask.priority] || undefined }} />
            </button>
            {showPriorityPicker && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-theme-800 rounded-lg shadow-xl border border-theme-200 dark:border-theme-700 z-50 py-1 w-32">
                {[0, 3, 6, 9].map((p) => (
                  <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                    key={p}
                    onClick={() => {
                      onUpdateTask({ priority: p })
                      setShowPriorityPicker(false)
                    }}
                    type="button"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PRIORITY_COLORS[p] }}
                    />
                    <span className="text-theme-700 dark:text-theme-300">
                      {t(`tasks.priority.${{ 0: 'none', 3: 'low', 6: 'medium', 9: 'high' }[p]}`)}
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
            className="flex items-center gap-1 text-xs text-theme-500 dark:text-theme-400 hover:text-theme-600 dark:hover:text-theme-400 transition-colors mt-1"
            onClick={onSubtaskBack}
            type="button"
          >
            <ChevronRight className="w-3 h-3 rotate-180 flex-shrink-0" />
            <span className="truncate">{task.title}</span>
          </button>
        )}
      </div>

      {/* Progress bar - tightly below header */}
      {progress && (
        <div className="group relative px-4 pb-2">
          <div className="w-full h-[2px] bg-theme-200 dark:bg-theme-800">
            <div
              className={`h-full transition-all duration-300 ${
                progress.completed === progress.total ? 'bg-theme-300 dark:bg-theme-700' : 'dark:bg-theme-700 bg-theme-300'
              }`}
              style={{
                width: `${(progress.completed / progress.total) * 100}%`,
              }}
            />
         </div>
          <div className="absolute left-1/2 -translate-x-1/2 -top-7 hidden group-hover:block bg-theme-900 dark:bg-theme-100 text-white dark:text-theme-900 text-xs px-2 py-0.5 rounded whitespace-nowrap">
            {Math.round((progress.completed / progress.total) * 100)}%
          </div>
        </div>
      )}

      {/* Detail Content */}
      <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">
        {/* Description */}
        <MilkdownEditor markdown={localDesc} onChange={handleDescChange} placeholder="写下任务详情..." />

        {/* Tags */}
        <TagCombobox
          allTags={allTags}
          onCreateTag={(name) => {
            createTag.mutate(
              { name },
              {
                onSuccess: (newTag) => {
                  const currentIds = [...taskTagIds, newTag.id]
                  onUpdateTask({ tagIds: currentIds.join(',') })
                },
              },
            )
          }}
          onToggle={handleToggleTag}
          selectedIds={taskTagIds}
        />

        {/* Steps */}
        {visibleSections.steps && (
          <div className="pt-4">
            <StepList
              onAdd={handleAddStep}
              onDelete={handleDeleteStep}
              onInsertAt={handleInsertStepAt}
              onReorder={(items) => reorderSteps.mutate(items)}
              onToggle={handleToggleStep}
              onUpdateDescription={handleUpdateStepDescription}
              onUpdateDueDate={handleUpdateStepDueDate}
              onUpdateDueTime={handleUpdateStepDueTime}
              steps={steps}
              taskDueDate={activeTask.dueDate}
            />
          </div>
        )}

        {/* Subtasks */}
        {visibleSections.subtasks && (
          <div className="border-t border-theme-200 dark:border-theme-600 pt-4">
            <SubtaskList
              onAdd={handleAddSubtask}
              onDelete={handleDeleteSubtask}
              onReorder={(items) => reorderSubtasks.mutate(items)}
              onSubtaskClick={onSubtaskClick}
              onToggle={handleToggleSubtask}
              onUpdateTitle={handleUpdateSubtaskTitle}
              subtasks={subtaskTree}
            />
          </div>
        )}

        {/* Attachments */}
        {visibleSections.attachments && (
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-theme-800 dark:text-theme-200">{t('tasks.attachments')}</h3>
              <div className="flex items-center gap-1">
                <button
                  className="text-xs text-theme-800 dark:text-theme-200 transition-colors"
                  onClick={handleClipboardPaste}
                  type="button"
                  title={t('tasks.clipboard_paste')}
                >
                  <Clipboard className="w-4 h-4" />
                </button>
                <button
                  className="text-xs text-theme-800 dark:text-theme-200 transition-colors"
                  onClick={handleAddAttachment}
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {attachments.length === 0 && uploadingAttachments.size === 0 ? (
              <p className="text-xs text-theme-400 dark:text-theme-500 italic">{t('tasks.no_attachments')}</p>
            ) : (
              (() => {
                // Merge server attachments with uploading attachments
                const allAttachments = [
                  ...attachments,
                  ...Array.from(uploadingAttachments.values())
                    .filter((ua) => !attachments.some((a) => a.id === ua.attachment.id))
                    .map((ua) => ua.attachment),
                ]

                const imageAttachments = allAttachments.filter(
                  (a) => isImageFile(a.originalFilename) && imageUrls[a.id],
                )
                const fileAttachments = allAttachments.filter(
                  (a) => !isImageFile(a.originalFilename) || !imageUrls[a.id],
                )

                const getAttachmentStatus = (att: Attachment) => {
                  const uploading = uploadingAttachments.get(att.id)
                  if (uploading) return uploading.status
                  if (att.syncStatus === 'syncing') return 'syncing'
                  if (att.syncStatus === 'failed') return 'failed'
                  return 'normal'
                }

                return (
                  <>
                    {imageAttachments.length > 0 && (
                      <div className="grid grid-cols-5 gap-2 mb-2">
                        {imageAttachments.map((att) => {
                          const status = getAttachmentStatus(att)
                          return (
                            <div
                              className="relative group aspect-square"
                              key={att.id}
                              onContextMenu={(e) => handleAttachmentContextMenu(e, att)}
                            >
                              {status === 'uploading' || status === 'syncing' ? (
                                <div className="w-full h-full rounded-sm border border-theme-100 flex items-center justify-center bg-theme-50">
                                  <RefreshCw className="w-6 h-6 text-theme-400 animate-spin" />
                                </div>
                              ) : status === 'failed' ? (
                                <div className="w-full h-full rounded-sm border border-red-200 flex items-center justify-center bg-red-50 relative">
                                  <AlertCircle className="w-6 h-6 text-red-400" />
                                  {uploadingAttachments.get(att.id)?.error && (
                                    <span className="absolute -bottom-5 left-0 right-0 text-[10px] text-red-400 text-center truncate px-0.5">
                                      {uploadingAttachments.get(att.id)?.error}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <img
                                  alt={att.originalFilename}
                                  className="w-full h-full rounded-sm border border-theme-100 object-cover cursor-pointer"
                                  onClick={() => setPreviewImage(imageUrls[att.id])}
                                  src={imageUrls[att.id]}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {fileAttachments.length > 0 && (
                      <div className="space-y-0.5">
                        {fileAttachments.map((att) => {
                          const status = getAttachmentStatus(att)
                          const uploading = uploadingAttachments.get(att.id)
                          return (
                            <div
                              className="cursor-pointer flex items-center gap-2 group px-1 py-0.5 bg-theme-50 rounded hover:bg-theme-100 dark:hover:bg-theme-800"
                              key={att.id}
                              onContextMenu={(e) => handleAttachmentContextMenu(e, att)}
                            >
                              {status === 'uploading' || status === 'syncing' ? (
                                <RefreshCw className="w-4 h-4 text-theme-400 dark:text-theme-500 flex-shrink-0 animate-spin" />
                              ) : status === 'failed' ? (
                                <AlertCircle className="w-4 h-4 text-red-400 dark:text-red-500 flex-shrink-0" />
                              ) : (
                                <File className="w-4 h-4 text-theme-400 dark:text-theme-500 flex-shrink-0" />
                              )}
                              <span className="text-sm text-theme-700 dark:text-theme-300 truncate">
                                {att.originalFilename}
                              </span>
                              {status === 'failed' && (uploading?.error || att.syncError) && (
                                <span className="text-xs text-red-400 dark:text-red-500 truncate">
                                  {uploading?.error || att.syncError}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )
              })()
            )}
          </div>
        )}

        {/* Linked Items */}
        <div className="pt-4 space-y-3">
          {/* Linked Notes */}
          {visibleSections.notes && (
            <div>
              <div className="relative flex">
                <h3 className="flex-1 text-xs font-medium text-theme-500 dark:text-theme-400 mb-1">
                  {t('media.linkedNotes')}
                </h3>
                <LinkedItemSelector
                  items={allNotes.map((n) => ({ id: n.id, title: n.title }))}
                  onChange={(ids) => {
                    const added = ids.find((id) => !linkedNoteIds.includes(id))
                    if (added) handleLinkItem('note', added)
                  }}
                  placeholder={t('tasks.search_placeholder')}
                  value={linkedNoteIds}
                />
              </div>
              {linkedNotes.length > 0 && (
                <div className="mt-1 space-y-1">
                  {linkedNotes.map((note) => {
                    const linkItem = linkedItemsData.find((li) => li.linkedType === 'note' && li.linkedId === note.id)
                    return (
                      <div className="flex items-center gap-2 group text-sm" key={note.id}>
                        <span className="flex-1 text-theme-700 dark:text-theme-300 truncate">{note.title}</span>
                        {linkItem && (
                          <button
                            className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-theme-400 flex-shrink-0"
                            onClick={() => handleUnlinkItem(linkItem.id)}
                            type="button"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Linked Persons */}
          {visibleSections.persons && (
            <div>
              <div className="flex">
                <h3 className="flex-1 text-xs font-medium text-theme-500 dark:text-theme-400 mb-1">
                  {t('notes.linked_persons')}
                </h3>
                <LinkedItemSelector
                  items={allPersons.map((p) => ({ id: p.id, title: p.name }))}
                  onChange={(ids) => {
                    const added = ids.find((id) => !linkedPersonIds.includes(id))
                    if (added) handleLinkItem('person', added)
                  }}
                  placeholder={t('people.search_placeholder')}
                  value={linkedPersonIds}
                />
              </div>
              {linkedPersons.length > 0 && (
                <div className="mt-1 flex flex-row gap-2">
                  {linkedPersons.map((person) => {
                    const linkItem = linkedItemsData.find(
                      (li) => li.linkedType === 'person' && li.linkedId === person.id,
                    )
                    return (
                      <div className="relative group flex flex-col items-center gap-1 p-2" key={person.id}>
                        {linkItem && (
                          <button
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 hover:text-red-500 text-theme-400"
                            onClick={() => handleUnlinkItem(linkItem.id)}
                            type="button"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {person.avatar ? (
                          <AvatarImage seed={person.avatar} size={32} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-theme-200 dark:bg-theme-600 flex items-center justify-center text-xs text-theme-500 dark:text-theme-400">
                            {person.name[0]}
                          </div>
                        )}
                        <span className="text-xs text-theme-700 dark:text-theme-300 truncate w-full text-center">
                          {person.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Linked Media */}
          {visibleSections.media && (
            <div>
              <div className="flex">
                <h3 className="flex-1 text-xs font-medium text-theme-500 dark:text-theme-400 mb-1">
                  {t('notes.linked_media')}
                </h3>
                <LinkedItemSelector
                  items={mediaItemsData.map((m) => ({ id: m.id, title: m.title }))}
                  onChange={(ids) => {
                    const added = ids.find((id) => !linkedMediaIds.includes(id))
                    if (added) handleLinkItem('media', added)
                  }}
                  placeholder={t('media.placeholder.search')}
                  value={linkedMediaIds}
                />
              </div>
              {linkedMediaItems.length > 0 && (
                <div className="mt-1 flex flex-row gap-2">
                  {linkedMediaItems.map((media) => {
                    const linkItem = linkedItemsData.find((li) => li.linkedType === 'media' && li.linkedId === media.id)
                    return (
                      <div className="relative group flex flex-col overflow-hidden" key={media.id}>
                        {linkItem && (
                          <button
                            className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 hover:text-red-500 text-white drop-shadow"
                            onClick={() => handleUnlinkItem(linkItem.id)}
                            type="button"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {media.cover ? (
                          <img alt={media.title} className="w-14 aspect-[2/3] object-cover" src={media.cover} />
                        ) : (
                          <div className="w-14 aspect-[2/3] bg-theme-200 dark:bg-theme-700 flex items-center justify-center text-theme-400 dark:text-theme-500">
                            <BookOpen className="w-5 h-5" />
                          </div>
                        )}
                        <div className="p-1.5">
                          <p className="text-xs text-theme-700 dark:text-theme-300 truncate">{media.title}</p>
                          {media.year && <p className="text-[10px] text-theme-400 dark:text-theme-500">{media.year}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-theme-900"
          onMouseDown={() => setPreviewImage(null)}
        >
          <img alt="Preview" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" src={previewImage} />
        </div>
      )}

      {attachContextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onMouseDown={() => {
              setAttachContextMenu(null)
              setAttachContextMenuFlipY(false)
            }}
          />
          <div
            className="fixed z-50 bg-white dark:bg-theme-800 rounded-lg shadow-xl border border-theme-200 dark:border-theme-700 py-1 min-w-[160px]"
            ref={attachContextMenuRef}
            style={{
              left: attachContextMenu.x,
              ...(attachContextMenuFlipY
                ? { bottom: window.innerHeight - attachContextMenu.y }
                : { top: attachContextMenu.y }),
            }}
          >
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
              onClick={() => handleCopyAttachmentLink(attachContextMenu.att)}
              type="button"
            >
              {t('tasks.copy_link')}
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
              onClick={() => handleDownloadAttachment(attachContextMenu.att)}
              type="button"
            >
              {t('tasks.download')}
            </button>
            {(attachContextMenu.att.syncStatus === 'failed' ||
              uploadingAttachments.get(attachContextMenu.att.id)?.status === 'failed') && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                onClick={() => handleRetryUpload(attachContextMenu.att)}
                type="button"
              >
                {t('tasks.re_upload')}
              </button>
            )}
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
              onClick={() => handleDeleteAttachment(attachContextMenu.att)}
              type="button"
            >
              {t('tasks.delete_attachment')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ==================== Task Row ====================
function TaskRow({
  task,
  isSelected,
  onSelect,
  onToggle,
  onContextMenu,
  progressStyle = 'bar',
}: {
  task: Task
  isSelected: boolean
  onSelect: () => void
  onToggle: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  progressStyle?: 'bar' | 'circle' | 'pie'
}) {
  const { t } = useTranslation('common')
  const { data: allLists = [] } = useLists()
  const { data: taskSteps = [] } = useSteps(task.id)
  const rowProgress = useMemo(() => calcStepsProgress(taskSteps), [taskSteps])
  const listColor = useMemo(() => {
    if (!task.listId) return undefined
    return allLists.find((l) => l.id === task.listId)?.color
  }, [allLists, task.listId])

  const percent = rowProgress ? Math.round((rowProgress.completed / rowProgress.total) * 100) : 0
  const isComplete = rowProgress && rowProgress.completed === rowProgress.total

  const renderProgress = () => {
    if (!rowProgress || rowProgress.total === 0) {
      return null
    }

    if (progressStyle === 'circle') {
      const r = 7
      const circumference = 2 * Math.PI * r
      const offset = circumference - (percent / 100) * circumference
      return (
        <svg className="flex-shrink-0" height="18" width="18">
          <title>progress circle</title>
          <circle
            className="text-theme-200 dark:text-theme-600"
            cx="9"
            cy="9"
            fill="none"
            r={r}
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            className="transition-all"
            cx="9"
            cy="9"
            fill="none"
            r={r}
            stroke={isComplete ? 'var(--theme-color)' : 'var(--theme-bg-70)'}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="2"
            transform="rotate(-90 9 9)"
          />
        </svg>
      )
    }

    if (progressStyle === 'pie') {
      const r = 7
      const cx = 9,
        cy = 9
      if (percent >= 100) {
        return (
          <svg className="flex-shrink-0" height="18" width="18">
            <title>progress pie</title>
            <circle cx={cx} cy={cy} fill="var(--theme-color)" r={r} />
          </svg>
        )
      }
      if (percent <= 0) {
        return (
          <svg className="flex-shrink-0" height="18" width="18">
            <title>progress bar</title>
            <circle
              className="text-theme-200 dark:text-theme-600"
              cx={cx}
              cy={cy}
              fill="none"
              r={r}
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        )
      }
      const angle = (percent / 100) * 360
      const rad = (angle - 90) * (Math.PI / 180)
      const endX = cx + r * Math.cos(rad)
      const endY = cy + r * Math.sin(rad)
      const largeArc = angle > 180 ? 1 : 0
      const pathD = `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${largeArc},1 ${endX},${endY} Z`
      return (
        <svg className="flex-shrink-0" height="18" width="18">
          <title>progress empty</title>
          <circle
            className="text-theme-200 dark:text-theme-600"
            cx={cx}
            cy={cy}
            fill="none"
            r={r}
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d={pathD} fill={isComplete ? 'var(--theme-color)' : 'var(--theme-bg-70)'} />
        </svg>
      )
    }

    // bar (default)
    return (
      <div className="w-10 h-1.5 bg-theme-200 dark:bg-theme-600 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            backgroundColor: isComplete ? 'var(--theme-color)' : 'var(--theme-bg-70)',
            width: `${percent}%`,
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`group flex items-center gap-3 px-2 py-2 rounded-md transition-shadow cursor-pointer ${
        isSelected ? 'bg-theme-200/30 dark:bg-theme-700/30' : ''
      }`}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.(e)
      }}
      onMouseDown={onSelect}
    >
      <CheckNow
        checked={task.isCompleted}
        className="flex-shrink-0"
        color1={listColor || 'var(--theme-color)'}
        color2={task.priority > 0 ? PRIORITY_COLORS[task.priority] : undefined}
        hasSteps={!!(rowProgress && rowProgress.total > 0)}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      />
      <span
        className={`flex-1 truncate text-sm ${
          task.isCompleted ? 'line-through text-theme-700 dark:text-theme-200' : 'text-theme-900 dark:text-theme-100'
        }`}
      >
        {task.title}
      </span>
      {/* Step progress badge */}
      <div
        className="flex items-center gap-1 flex-shrink-0"
        title={`${rowProgress?.completed ?? 0}/${rowProgress?.total ?? 0}`}
      >
        {renderProgress()}
      </div>
      {/* Due date badge */}
      {task.dueDate &&
        (() => {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const due = new Date(`${task.dueDate}T00:00:00`)
          const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          const isOverdue = diffDays < 0
          const absDays = Math.abs(diffDays)
          const unit = t('dashboard.days_left')
          const label = diffDays === 0 ? t('tasks.today') : isOverdue ? `-${absDays}${unit}` : `+${absDays}${unit}`
          return (
            <span className={`text-xs font-medium flex-shrink-0 ${isOverdue ? 'text-red-500 dark:text-red-500' : 'text-green-500 dark:text-green-500'}`}>
              {label}
            </span>
          )
        })()}
    </div>
  )
}

// ==================== Resize Handle ====================
// ==================== Main Page ====================
export default function TasksPage() {
  const { t } = useTranslation('common')
  const { viewMode, filterStatus, selectedListId, setViewMode, setFilterStatus, setSelectedListId } = useViewStore()
  const {
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
  } = useAppStore()
  const saveListSettings = useSaveListSettings()
  const isLoadingSettings = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Apply defaultTaskOpenView on mount
  const defaultAppliedRef = useRef(false)
  useEffect(() => {
    if (defaultAppliedRef.current) return
    const view = useAppStore.getState().defaultTaskOpenView
    if (view === 'today') {
      defaultAppliedRef.current = true
      setSelectedListId('smart:today')
    } else if (view === 'inbox') {
      defaultAppliedRef.current = true
      setSelectedListId('inbox')
    } else {
      defaultAppliedRef.current = true
    }
  }, [selectedListId])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (containerWidth <= 0) return
    const available = containerWidth - groupsPanelWidth - 8
    if (available < 600) {
      setDetailPanelWidth(Math.max(200, Math.min(400, available - 300)))
    } else {
      setDetailPanelWidth((w) => Math.max(300, Math.min(400, w)))
    }
  }, [containerWidth, groupsPanelWidth])

  // Load per-list settings when selectedListId changes
  useEffect(() => {
    if (selectedListId === null) {
      return
    }
    isLoadingSettings.current = true
    import('@/lib/api').then(({ getListSettings }) => {
      getListSettings(selectedListId)
        .then((settings) => {
          console.log('list', settings)
          if (settings) {
            setTaskSortBy(settings.sortBy)
            setTaskSortOrder(settings.sortOrder)
            setTaskGroupBy(settings.groupBy)
            setFilterStatus(settings.filterStatus)
            setViewMode(settings.viewMode)
          }
          // Use setTimeout to ensure stores have been updated before we allow saving
          setTimeout(() => {
            isLoadingSettings.current = false
          }, 0)
        })
        .catch(() => {
          isLoadingSettings.current = false
        })
    })
  }, [selectedListId, setTaskSortBy, setTaskSortOrder, setTaskGroupBy, setFilterStatus, setViewMode])

  // Save current settings to DB when they change
  const persistSettings = useCallback(
    (overrides?: Partial<ListSettings>) => {
      if (isLoadingSettings.current || !selectedListId) {
        return
      }
      const current: ListSettings = {
        filterStatus: overrides?.filterStatus ?? filterStatus,
        groupBy: overrides?.groupBy ?? taskGroupBy,
        listId: selectedListId,
        sortBy: overrides?.sortBy ?? taskSortBy,
        sortOrder: overrides?.sortOrder ?? taskSortOrder,
        viewMode: overrides?.viewMode ?? viewMode,
      }
      saveListSettings.mutate(current)
    },
    [selectedListId, taskSortBy, taskSortOrder, taskGroupBy, filterStatus, viewMode, saveListSettings],
  )

  // Wrapper setters that also persist
  const handleSetViewMode = useCallback(
    (mode: 'list' | 'calendar' | 'kanban' | 'matrix') => {
      setViewMode(mode)
      persistSettings({ viewMode: mode })
    },
    [setViewMode, persistSettings],
  )

  const handleSetFilterStatus = useCallback(
    (status: TaskStatus3) => {
      setFilterStatus(status)
      persistSettings({ filterStatus: status })
    },
    [setFilterStatus, persistSettings],
  )

  const handleSetTaskGroupBy = useCallback(
    (by: string) => {
      setTaskGroupBy(by as GroupBy)
      persistSettings({ groupBy: by as ListSettings['groupBy'] })
    },
    [setTaskGroupBy, persistSettings],
  )

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null)
  const [listsExpanded, setListsExpanded] = useState(true)
  const [advListsExpanded, setAdvListsExpanded] = useState(true)
  const [editingAdvGroup, setEditingAdvGroup] = useState<AdvancedGroup | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(0)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const templateButtonRef = useRef<HTMLButtonElement>(null)
  const [newTaskTagIds, setNewTaskTagIds] = useState<string[]>([])
  const [focusTitleOnMount, setFocusTitleOnMount] = useState(false)
  const tagButtonRef = useRef<HTMLButtonElement>(null)
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => getLocalToday())
  const [newTaskDueTime, setNewTaskDueTime] = useState('')
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  const inlineDateOpenedRef = useRef(false)
  const dateExplicitlySetRef = useRef(false)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'list' | 'advGroup'
    id: string
  } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const [contextMenuFlipY, setContextMenuFlipY] = useState(false)

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) {
      return
    }
    const rect = contextMenuRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - contextMenu.y
    setContextMenuFlipY(rect.height > spaceBelow && contextMenu.y > spaceBelow)
  }, [contextMenu])

  const [taskContextMenu, setTaskContextMenu] = useState<{
    x: number
    y: number
    taskId: string
  } | null>(null)
  const [taskMenuPanel, setTaskMenuPanel] = useState<'parent' | 'subtask' | 'priority' | 'status' | 'list' | null>(null)
  const [taskPanelSearch, setTaskPanelSearch] = useState('')
  const taskMenuRef = useRef<HTMLDivElement>(null)
  const [menuFlipY, setMenuFlipY] = useState(false)

  useLayoutEffect(() => {
    if (!taskContextMenu || !taskMenuRef.current) {
      return
    }
    const rect = taskMenuRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - taskContextMenu.y
    setMenuFlipY(rect.height > spaceBelow && taskContextMenu.y > spaceBelow)
  }, [taskContextMenu, taskMenuPanel])

  const { data: tasks = [], isLoading } = useTasks()
  const { data: allTasksForCount = [] } = useAllTasks()
  const { data: allTags = [] } = useTags()
  const { data: allLists = [] } = useLists()
  const { data: todayAtomTag } = useAtomTag('today')
  const { data: allTemplates = [] } = useTaskTemplates()
  const createTemplate = useCreateTaskTemplate()
  const updateTaskTemplate = useUpdateTaskTemplate()
  const incrementTemplateUsage = useIncrementTemplateUsage()
  const createTask = useCreateTask()
  const createStep = useCreateStep()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTask = useToggleTaskCompletion()
  const completeRecurring = useCompleteRecurringTask()
  const updateSubtask = useUpdateSubtask()
  const createList = useCreateList()
  const updateList = useUpdateList()
  const deleteList = useDeleteList()

  // Adjust detail panel width when window resizes
  useEffect(() => {
    let prevWidth = window.innerWidth

    const handleResize = () => {
      const newWidth = window.innerWidth
      const delta = newWidth - prevWidth
      prevWidth = newWidth

      if (delta !== 0) {
        setDetailPanelWidth((w) => Math.max(300, Math.min(800, w + delta)))
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setDetailPanelWidth])

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleNewTask = () => {
      setEditingTask(null)
      setShowTaskForm(true)
    }
    const handleEscape = () => {
      if (showTaskForm) {
        setShowTaskForm(false)
        setEditingTask(null)
      }
      if (selectedSubtaskId) {
        setSelectedSubtaskId(null)
      } else if (selectedTaskId) {
        setSelectedTaskId(null)
      }
    }

    window.addEventListener('mindless:new-task', handleNewTask)
    window.addEventListener('mindless:escape', handleEscape)

    return () => {
      window.removeEventListener('mindless:new-task', handleNewTask)
      window.removeEventListener('mindless:escape', handleEscape)
    }
  }, [showTaskForm, selectedTaskId, selectedSubtaskId])

  // Listen for tag list picker overlay results
  useEffect(() => {
    const unlisten = listen<{ selectedIds: string[] }>('tag-list-picker-overlay:result', (e) => {
      setNewTaskTagIds(e.payload.selectedIds)
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  // Listen for date picker results for inline form
  useEffect(() => {
    const unlisten = listen<{
      type: string
      date?: string
      time?: string
      startDate?: string
      startTime?: string
    }>('date-range-picker-overlay:result', (e) => {
      if (!inlineDateOpenedRef.current) {
        return
      }
      inlineDateOpenedRef.current = false
      dateExplicitlySetRef.current = true
      const p = e.payload
      if (p.type === 'single') {
        setNewTaskDueDate(p.date || '')
        setNewTaskDueTime(p.time || '')
      } else {
        setNewTaskDueDate(p.startDate || '')
        setNewTaskDueTime(p.startTime || '')
      }
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) || null, [tasks, selectedTaskId])

  // Advanced group matching
  const {
    advancedGroups,
    addAdvancedGroup,
    updateAdvancedGroup,
    deleteAdvancedGroup,
  } = useAppStore()
  const queryClient = useQueryClient()

  // Listen for dialog results from WebviewWindow
  useEffect(() => {
    const unlistenAdvGroup = listen<{ action: string; group?: AdvancedGroup }>('dialog:result', (event) => {
      const { action } = event.payload
      if (action === 'submit' && event.payload.group) {
        const group = event.payload.group
        if (editingAdvGroup) {
          updateAdvancedGroup(group)
        } else {
          addAdvancedGroup(group)
        }
      }
      setEditingAdvGroup(null)
    })

    const unlistList = listen<{ action: string }>('dialog:result', (event) => {
      const { action } = event.payload
      if (action === 'submit' || action === 'delete') {
        queryClient.invalidateQueries({ queryKey: ['lists'] })
      }
    })

    const unlistListOverlay = listen<{
      action: string
      name?: string
      icon?: string
      color?: string
      _source?: string
      _listId?: string
    }>('group-form-overlay:result', (event) => {
      const { action, _source, _listId, name, icon, color } = event.payload
      if (_source !== 'list') return
      if (action === 'submit' && name && icon && color) {
        if (_listId) {
          updateList.mutate({ color, icon, id: _listId, name })
        } else {
          createList.mutate({ color, icon, name })
        }
      } else if (action === 'delete' && _listId) {
        deleteList.mutate(_listId)
      }
      if (action !== 'cancel') {
        queryClient.invalidateQueries({ queryKey: ['lists'] })
      }
    })

    return () => {
      unlistenAdvGroup.then((fn) => fn())
      unlistList.then((fn) => fn())
      unlistListOverlay.then((fn) => fn())
    }
  }, [editingAdvGroup, addAdvancedGroup, updateAdvancedGroup, queryClient])

  const matchAdvancedGroup = useCallback((task: Task, group: AdvancedGroup): boolean => {
    const f = group.filters
    if (f.listIds?.length) {
      const taskListId = task.listId || 'inbox'
      if (!f.listIds.includes(taskListId)) {
        return false
      }
    }
    if (f.tagIds?.length) {
      const taskTagIds = task.tagIds ? task.tagIds.split(',').filter(Boolean) : []
      if (!f.tagIds.some((tid) => taskTagIds.includes(tid))) {
        return false
      }
    }
    if (f.titleRegex) {
      try {
        if (!new RegExp(f.titleRegex).test(task.title)) {
          return false
        }
      } catch {
        return false
      }
    }
    if (f.dateType) {
      const dateVal = f.dateType === 'due' ? task.dueDate : task.createdAt?.split('T')[0]
      if (!dateVal) {
        return false
      }
      if ((f.dateMode || 'absolute') === 'absolute') {
        if (f.dateFrom && dateVal < f.dateFrom) {
          return false
        }
        if (f.dateTo && dateVal > f.dateTo) {
          return false
        }
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const pastDays = f.datePastDays ?? 7
        const futureDays = f.dateFutureDays ?? 7
        const minDate = new Date(today)
        minDate.setDate(minDate.getDate() - pastDays)
        const maxDate = new Date(today)
        maxDate.setDate(maxDate.getDate() + futureDays)
        const minStr = minDate.toISOString().split('T')[0]
        const maxStr = maxDate.toISOString().split('T')[0]
        if (dateVal < minStr || dateVal > maxStr) {
          return false
        }
      }
    }
    if (f.priorities?.length) {
      if (!f.priorities.includes(task.priority)) {
        return false
      }
    }
    return true
  }, [])

  // Filter and search tasks
  const filteredTasksBase = useMemo(
    () =>
      tasks.filter((task) => {
        if (filterStatus === 'active' && task.isCompleted) {
          return false
        }
        if (filterStatus === 'completed' && !task.isCompleted) {
          return false
        }

        // List filtering
        if (selectedListId) {
          const now = new Date()
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
            now.getDate(),
          ).padStart(2, '0')}`

          // Advanced groups
          if (selectedListId.startsWith('adv:')) {
            const groupId = selectedListId.slice(4)
            const group = advancedGroups.find((g) => g.id === groupId)
            if (group && !matchAdvancedGroup(task, group)) {
              return false
            }
          } else if (selectedListId === 'smart:today') {
            const matchesDate = task.dueDate === todayStr
            const matchesRange =
              task.startDate && task.endDate ? task.startDate <= todayStr && task.endDate >= todayStr : false
            const matchesAtomTag = todayAtomTag ? (task.tagIds || '').split(',').includes(todayAtomTag.id) : false
            if (!matchesDate && !matchesRange && !matchesAtomTag) {
              return false
            }
          } else if (selectedListId === 'smart:tomorrow') {
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(
              2,
              '0',
            )}-${String(tomorrow.getDate()).padStart(2, '0')}`
            if (task.dueDate !== tomorrowStr) {
              return false
            }
          } else if (selectedListId === 'smart:recent7days') {
            const next7 = new Date(now)
            next7.setDate(next7.getDate() + 7)
            const next7Str = `${next7.getFullYear()}-${String(next7.getMonth() + 1).padStart(
              2,
              '0',
            )}-${String(next7.getDate()).padStart(2, '0')}`
            if (!task.dueDate || task.dueDate < todayStr || task.dueDate > next7Str) {
              return false
            }
          } else if (selectedListId === 'smart:thisMonth') {
            const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(
              2,
              '0',
            )}-${String(monthEnd.getDate()).padStart(2, '0')}`
            if (!task.dueDate || task.dueDate < monthStart || task.dueDate > monthEndStr) {
              return false
            }
          } else if (selectedListId === 'smart:recent') {
            const recentStart = new Date(now)
            recentStart.setDate(recentStart.getDate() - 30)
            const recentStartStr = `${recentStart.getFullYear()}-${String(recentStart.getMonth() + 1).padStart(
              2,
              '0',
            )}-${String(recentStart.getDate()).padStart(2, '0')}`
            const recentEnd = new Date(now)
            recentEnd.setDate(recentEnd.getDate() + 30)
            const recentEndStr = `${recentEnd.getFullYear()}-${String(recentEnd.getMonth() + 1).padStart(
              2,
              '0',
            )}-${String(recentEnd.getDate()).padStart(2, '0')}`
            if (!task.dueDate || task.dueDate < recentStartStr || task.dueDate > recentEndStr) {
              return false
            }
          } else {
            // Regular list: match listId (inbox = null or 'inbox')
            const taskListId = task.listId || 'inbox'
            if (selectedListId === 'inbox') {
              if (taskListId !== 'inbox') {
                return false
              }
            } else {
              if (task.listId !== selectedListId) {
                return false
              }
            }
          }
        }

        return true
      }),
    [tasks, filterStatus, selectedListId, advancedGroups, matchAdvancedGroup, todayAtomTag],
  )

  // Sort tasks
  const filteredTasks = useMemo(() => {
    const sorted = [...filteredTasksBase].sort((a, b) => {
      let aVal: number | string, bVal: number | string
      switch (taskSortBy) {
        case 'sortOrder':
          aVal = a.sortOrder ?? 0
          bVal = b.sortOrder ?? 0
          break
        case 'dueDate':
          aVal = a.dueDate || ''
          bVal = b.dueDate || ''
          break
        case 'startDate':
          aVal = a.startDate || ''
          bVal = b.startDate || ''
          break
        case 'priority':
          aVal = a.priority
          bVal = b.priority
          break
        case 'createdAt':
          aVal = a.createdAt
          bVal = b.createdAt
          break
      }
      if (aVal < bVal) {
        return taskSortOrder === 'asc' ? -1 : 1
      }
      if (aVal > bVal) {
        return taskSortOrder === 'asc' ? 1 : -1
      }
      // Tiebreaker: sortOrder (manual order)
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    })

    // Group tasks
    if (taskGroupBy === 'priority') {
      const groups: Record<number, typeof sorted> = {}
      sorted.forEach((task) => {
        const priority = task.priority || 0
        if (!groups[priority]) {
          groups[priority] = []
        }
        groups[priority].push(task)
      })
      return Object.entries(groups)
        .sort(([a], [b]) => Number(b) - Number(a))
        .flatMap(([, groupTasks]) => groupTasks)
    }
    if (taskGroupBy === 'list') {
      const groups: Record<string, typeof sorted> = {}
      sorted.forEach((task) => {
        const listId = task.listId || 'inbox'
        if (!groups[listId]) {
          groups[listId] = []
        }
        groups[listId].push(task)
      })
      return Object.values(groups).flat()
    }

    return sorted
  }, [filteredTasksBase, taskSortBy, taskSortOrder, taskGroupBy])

  // Load subtasks for all visible tasks and flatten
  const taskIds = useMemo(() => filteredTasks.map((t) => t.id), [filteredTasks])
  const { data: allSubtasksData } = useAllSubtasks(taskIds)
  const allSubtasks = allSubtasksData ?? []

  // Build flattened list: task followed by its subtasks
  type FlatItem = { type: 'task'; task: Task } | { type: 'subtask'; subtask: Task; parentTask: Task }
  const flatItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = []
    // allSubtasks are direct children of filteredTasks (parent_task_id = task.id)
    const subtasksByTask = new Map<string, Task[]>()
    allSubtasks.forEach((s) => {
      if (s.parentTaskId) {
        const list = subtasksByTask.get(s.parentTaskId) || []
        list.push(s)
        subtasksByTask.set(s.parentTaskId, list)
      }
    })
    filteredTasks.forEach((task) => {
      items.push({ task, type: 'task' })
      const subs = subtasksByTask.get(task.id) || []
      subs.sort((a, b) => a.sortOrder - b.sortOrder)
      const filteredSubs = filterStatus === 'active'
        ? subs.filter((s) => !s.isCompleted)
        : filterStatus === 'completed'
          ? subs.filter((s) => s.isCompleted)
          : subs
      filteredSubs.forEach((sub) => {
        items.push({ parentTask: task, subtask: sub, type: 'subtask' })
      })
    })
    return items
  }, [filteredTasks, allSubtasks, filterStatus])

  const handleAttachmentClick = async () => {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      //   filters: [{ extensions: ['*'], name: 'All Files' }],
      directory: false,
      multiple: false,
    })
    if (!selected) {
      return
    }

    const filePath = typeof selected === 'string' ? selected : selected
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown'

    const bytes = await import('@/lib/api').then((api) => api.readFileBytes(filePath))
    if (bytes.length > 30 * 1024 * 1024) {
      const { message } = await import('@tauri-apps/plugin-dialog')
      await message(t('tasks.attachment_too_large'), { kind: 'error' })
      return
    }

    setPendingAttachments((prev) => [...prev, { fileBytes: bytes, originalFilename: fileName, size: bytes.length }])
  }

  const handleInlineClipboardPaste = async () => {
    try {
      const bytes = await import('@/lib/api').then((a) => a.readClipboardImage())
      if (!bytes) {
        const { message } = await import('@tauri-apps/plugin-dialog')
        await message(t('tasks.clipboard_no_image'), { kind: 'warning' })
        return
      }
      const now = new Date()
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const fileName = `剪贴板-${ts}.png`

      if (bytes.length > 30 * 1024 * 1024) {
        const { message } = await import('@tauri-apps/plugin-dialog')
        await message(t('tasks.attachment_too_large'), { kind: 'error' })
        return
      }

      setPendingAttachments((prev) => [...prev, { fileBytes: bytes, originalFilename: fileName, size: bytes.length }])
    } catch (e) {
      console.error('Clipboard paste failed:', e)
    }
  }

  const handleCreateInline = (onSuccess?: (task: Task) => void) => {
    if (!newTaskTitle.trim()) {
      return
    }
    const currentAttachments = [...pendingAttachments]
    createTask.mutate(
      {
        description: newTaskDescription.trim() || undefined,
        dueDate: newTaskDueDate || undefined,
        dueTime: newTaskDueTime || undefined,
        listId:
          selectedListId && !selectedListId.startsWith('smart:') && !selectedListId.startsWith('adv:')
            ? selectedListId
            : undefined,
        priority: newTaskPriority,
        tagIds: newTaskTagIds.length > 0 ? newTaskTagIds.join(',') : undefined,
        title: newTaskTitle.trim(),
      },
      {
        onSuccess: async (newTask) => {
          setNewTaskTitle('')
          setNewTaskDescription('')
          setNewTaskPriority(0)
          setNewTaskTagIds([])
          setNewTaskDueDate(getLocalToday())
          setNewTaskDueTime('')
          setPendingAttachments([])
          dateExplicitlySetRef.current = false

          if (newTask && currentAttachments.length > 0) {
            const bytesToBase64 = (bytes: number[]) => {
              const chunks: string[] = []
              for (let i = 0; i < bytes.length; i += 8192) {
                chunks.push(String.fromCharCode(...bytes.slice(i, i + 8192)))
              }
              return btoa(chunks.join(''))
            }
            const api = await import('@/lib/api')
            const { getActiveProvider } = await import('@/lib/sync')
            const activeProvider = await getActiveProvider()

            for (const att of currentAttachments) {
              try {
                const attachment = await api.createAttachment({
                  fileBytes: att.fileBytes,
                  originalFilename: att.originalFilename,
                  taskId: newTask.id,
                })

                if (activeProvider) {
                  const { provider, info } = activeProvider
                  await api.updateAttachmentSyncStatus({
                    id: attachment.id,
                    syncProvider: info.provider,
                    syncStatus: 'syncing',
                  })

                  try {
                    const base64Content = bytesToBase64(att.fileBytes)
                    const path = `attachments/${attachment.filename}`
                    await provider.uploadBinaryFile(
                      info.owner,
                      info.repo,
                      path,
                      base64Content,
                      `Mindless: add attachment ${attachment.originalFilename}`,
                    )

                    const syncUrl = localStorage.getItem(`mindless-sync-url-${info.provider}`)
                    let rawUrl: string | null = null
                    if (syncUrl) {
                      const m = syncUrl.trim().match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/)?$/)
                      if (m) {
                        const domain = m[1]
                        const owner = m[2]
                        const repo = m[3]
                        if (domain === 'github.com') {
                          rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/attachments/${attachment.filename}`
                        } else if (domain === 'gitlab.com' || domain.includes('gitlab.')) {
                          rawUrl = `https://${domain}/${owner}/${repo}/-/raw/main/attachments/${attachment.filename}`
                        } else if (domain === 'gitee.com') {
                          rawUrl = `https://${domain}/${owner}/${repo}/raw/main/attachments/${attachment.filename}`
                        }
                      }
                    }
                    await api.updateAttachmentSyncStatus({
                      id: attachment.id,
                      rawUrl: rawUrl || undefined,
                      syncProvider: info.provider,
                      syncStatus: 'synced',
                      uploadedTo: path,
                    })
                  } catch (syncErr) {
                    console.error(`Failed to sync attachment "${att.originalFilename}":`, syncErr)
                    await api.updateAttachmentSyncStatus({
                      id: attachment.id,
                      syncError: syncErr instanceof Error ? syncErr.message : 'Unknown error',
                      syncProvider: info.provider,
                      syncStatus: 'failed',
                    })
                  }
                }
              } catch (err) {
                console.error(`Failed to create attachment "${att.originalFilename}":`, err)
              }
            }
          }

          if (newTask && onSuccess) {
            onSuccess(newTask)
          }
        },
      },
    )
  }

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskPriority(0)
      setPendingAttachments([])
    }
  }

  const closeForm = () => {
    setShowTaskForm(false)
    setEditingTask(null)
  }

  const handleCreateTask = (taskData: {
    title: string
    description?: string
    priority: Priority
    dueDate?: string
    dueTime?: string
    endDate?: string
    endTime?: string
    startDate?: string
    listId?: string
    recurrenceRule?: string
    recurrenceEndDate?: string
  }) => {
    createTask.mutate(taskData, { onSuccess: closeForm })
  }

  const handleUpdateTask = (taskData: {
    title: string
    description?: string
    priority: Priority
    dueDate?: string
    dueTime?: string
    endDate?: string
    endTime?: string
    startDate?: string
    listId?: string
    recurrenceRule?: string
    recurrenceEndDate?: string
  }) => {
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, ...taskData }, { onSuccess: closeForm })
    }
  }

  const handleToggleTask = (id: string, isCompleted: boolean) => {
    const task = tasks.find((t) => t.id === id)
    // If completing a recurring task, generate the next occurrence
    if (!isCompleted && task?.recurrenceRule) {
      completeRecurring.mutate(id)
    } else {
      toggleTask.mutate({ id, isCompleted: !isCompleted })
    }
  }

  const handleDeleteTask = (id: string) => {
    if (!window.confirm(t('tasks.delete_confirm'))) {
      return
    }
    deleteTask.mutate(id)
    if (selectedTaskId === id) {
      setSelectedTaskId(null)
    }
  }

  const handleToggleTodayTag = useCallback(
    (taskId: string) => {
      if (!todayAtomTag) {
        return
      }
      const task = tasks.find((t) => t.id === taskId)
      if (!task) {
        return
      }
      const currentIds = task.tagIds ? task.tagIds.split(',').filter(Boolean) : []
      const hasToday = currentIds.includes(todayAtomTag.id)
      const newIds = hasToday ? currentIds.filter((id) => id !== todayAtomTag.id) : [...currentIds, todayAtomTag.id]
      updateTask.mutate({ id: taskId, tagIds: newIds.join(',') })
    },
    [todayAtomTag, tasks, updateTask],
  )

  const handleUpdateTaskField = useCallback(
    // biome-lint-ignore: noExplictAny
    (params: any) => {
      const targetId = selectedSubtaskId || selectedTask?.id
      if (targetId) {
        updateTask.mutate({ id: targetId, ...params })
      }
    },
    [selectedSubtaskId, selectedTask?.id, updateTask],
  )

  const handleUpdateTaskInline = useCallback(
    (id: string, params: any) => {
      updateTask.mutate({ id, ...params })
    },
    [updateTask],
  )

  // Task groups (smart lists + user lists)
  const SMART_LISTS = [
    { iconKey: 'inbox', id: 'inbox', labelKey: 'lists.inbox', required: true },
    { iconKey: 'calendar', id: 'smart:today', labelKey: 'lists.today', required: true },
    { iconKey: 'clock', id: 'smart:tomorrow', labelKey: 'lists.tomorrow', required: false },
    { iconKey: 'recent7days', id: 'smart:recent7days', labelKey: 'lists.next_7_days', required: false },
    { iconKey: 'thisMonth', id: 'smart:thisMonth', labelKey: 'lists.this_month', required: false },
    { iconKey: 'recent', id: 'smart:recent', labelKey: 'lists.recent', required: true },
  ] as const

  const GROUP_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    calendar: Calendar,
    clock: Clock,
    inbox: Inbox,
    recent: Clock,
    recent7days: Clock,
    thisMonth: Calendar,
  }

  const visibleSmartLists = SMART_LISTS

  const seedIds = new Set(['inbox', 'today', 'tomorrow', 'next7days', 'thismonth', 'recent'])
  const pinnedLists = useMemo(
    () => allLists.filter((l) => !seedIds.has(l.id) && l.isArchived !== true && l.isPinned),
    [allLists],
  )
  const pinnedAdvGroups = useMemo(() => advancedGroups.filter((g) => g.isPinned), [advancedGroups])
  const userLists = useMemo(
    () =>
      allLists
        .filter((l) => !seedIds.has(l.id) && l.isArchived !== true)
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) {
            return -1
          }
          if (!a.isPinned && b.isPinned) {
            return 1
          }
          return a.sortOrder - b.sortOrder
        }),
    [allLists],
  )

  const listTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const now = new Date()
    const todayAtomTagId = todayAtomTag?.id
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`

    // Tomorrow
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(
      tomorrow.getDate(),
    ).padStart(2, '0')}`

    // Next 7 days
    const next7 = new Date(now)
    next7.setDate(next7.getDate() + 7)
    const next7Str = `${next7.getFullYear()}-${String(next7.getMonth() + 1).padStart(2, '0')}-${String(
      next7.getDate(),
    ).padStart(2, '0')}`

    // This month (natural month)
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(
      monthEnd.getDate(),
    ).padStart(2, '0')}`

    // Recent (±30 days)
    const recentStart = new Date(now)
    recentStart.setDate(recentStart.getDate() - 30)
    const recentStartStr = `${recentStart.getFullYear()}-${String(recentStart.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(recentStart.getDate()).padStart(2, '0')}`
    const recentEnd = new Date(now)
    recentEnd.setDate(recentEnd.getDate() + 30)
    const recentEndStr = `${recentEnd.getFullYear()}-${String(recentEnd.getMonth() + 1).padStart(2, '0')}-${String(
      recentEnd.getDate(),
    ).padStart(2, '0')}`

    allTasksForCount.forEach((task) => {
      if (task.isCompleted) return
      const lid = task.listId || 'inbox'
      counts[lid] = (counts[lid] || 0) + 1
      if (
        task.dueDate === todayStr ||
        (task.startDate && task.endDate && task.startDate <= todayStr && task.endDate >= todayStr) ||
        (todayAtomTagId && (task.tagIds || '').split(',').includes(todayAtomTagId))
      ) {
        counts['smart:today'] = (counts['smart:today'] || 0) + 1
      }
      if (task.dueDate === tomorrowStr) {
        counts['smart:tomorrow'] = (counts['smart:tomorrow'] || 0) + 1
      }
      if (task.dueDate && task.dueDate >= todayStr && task.dueDate <= next7Str) {
        counts['smart:recent7days'] = (counts['smart:recent7days'] || 0) + 1
      }
      if (task.dueDate && task.dueDate >= monthStart && task.dueDate <= monthEndStr) {
        counts['smart:thisMonth'] = (counts['smart:thisMonth'] || 0) + 1
      }
      if (task.dueDate && task.dueDate >= recentStartStr && task.dueDate <= recentEndStr) {
        counts['smart:recent'] = (counts['smart:recent'] || 0) + 1
      }
    })
    return counts
  }, [allTasksForCount, todayAtomTag])

  // Advanced group task counts
  const advGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    advancedGroups.forEach((group) => {
      counts[group.id] = allTasksForCount.filter((task) => !task.isCompleted && matchAdvancedGroup(task, group)).length
    })
    return counts
  }, [allTasksForCount, advancedGroups, matchAdvancedGroup])

  const handleAdvGroupClick = (groupId: string) => {
    setSelectedListId(selectedListId === `adv:${groupId}` ? null : `adv:${groupId}`)
  }

  const handleEditAdvGroup = async (e: React.MouseEvent, group: AdvancedGroup) => {
    e.stopPropagation()
    setEditingAdvGroup(group)
    try {
      const existingWindow = await WebviewWindow.getByLabel('advanced-group-form')
      if (existingWindow) {
        await existingWindow.setFocus()
        return
      }
    } catch {}

    new WebviewWindow('advanced-group-form', {
      alwaysOnTop: true,
      decorations: false,
      height: 600,
      resizable: false,
      title: t('advanced_groups.edit'),
      transparent: true,
      url: `/dialog/advanced-group-form?groupId=${encodeURIComponent(group.id)}`,
      width: 420,
      // shadow: true,
    })
  }

  const handleContextMenu = (e: React.MouseEvent, type: 'list' | 'advGroup', id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ id, type, x: e.clientX, y: e.clientY })
  }

  const handlePinList = (listId: string) => {
    const list = allLists.find((l) => l.id === listId)
    if (list) {
      updateList.mutate({ id: listId, isPinned: !list.isPinned })
    }
    setContextMenu(null)
  }

  const handleArchiveList = (listId: string) => {
    const list = allLists.find((l) => l.id === listId)
    if (list) {
      updateList.mutate({ id: listId, isArchived: !list.isArchived })
    }
    setContextMenu(null)
  }

  const handleDeleteList = (listId: string) => {
    deleteList.mutate(listId)
    setContextMenu(null)
  }

  const handlePinAdvGroup = (groupId: string) => {
    const group = advancedGroups.find((g) => g.id === groupId)
    if (group) {
      updateAdvancedGroup({ ...group, isPinned: !group.isPinned })
    }
    setContextMenu(null)
  }

  const handleDeleteAdvGroup = (groupId: string) => {
    deleteAdvancedGroup(groupId)
    setContextMenu(null)
  }

  const handleListClick = (listId: string) => {
    setSelectedListId(selectedListId === listId ? null : listId)
  }

  const handleCreateList = async (e?: React.MouseEvent) => {
    const el = e?.currentTarget as HTMLElement | undefined
    const rect = el ? await getScreenRect(el) : null
    await showOverlay(GROUP_FORM_LABEL, rect?.x ?? 0, rect?.y ?? 0, {
      _source: 'list',
      anchorH: rect?.height ?? 0,
      anchorX: rect?.x ?? 0,
      anchorY: rect?.y ?? 0,
      color: '#3B82F6',
      icon: '📁',
      isEditing: false,
      name: '',
      showDelete: false,
    })
  }

  const handleEditList = async (e: React.MouseEvent, list: List) => {
    e.stopPropagation()
    const rect = await getScreenRect(e.currentTarget as HTMLElement)
    await showOverlay(GROUP_FORM_LABEL, rect.x, rect.y + rect.height + 4, {
      _listId: list.id,
      _source: 'list',
      anchorH: rect.height,
      anchorX: rect.x,
      anchorY: rect.y,
      color: list.color || '#3B82F6',
      icon: resolveIcon(list.icon),
      isEditing: true,
      name: list.name,
      showDelete: true,
    })
  }

  const getGroupIcon = (iconKey: string) => {
    const Icon = GROUP_ICON_MAP[iconKey] || Inbox
    return <Icon className="w-3.5 h-3.5" />
  }

  // Compute header title based on selected list
  const headerTitle = useMemo(() => {
    if (!selectedListId) {
      return t('navigation.tasks')
    }
    if (selectedListId.startsWith('adv:')) {
      const groupId = selectedListId.slice(4)
      const group = advancedGroups.find((g) => g.id === groupId)
      return group?.name || t('navigation.tasks')
    }
    if (selectedListId === 'smart:today') {
      return t('lists.today')
    }
    if (selectedListId === 'smart:tomorrow') {
      return t('lists.tomorrow')
    }
    if (selectedListId === 'smart:recent7days') {
      return t('lists.next_7_days')
    }
    if (selectedListId === 'smart:thisMonth') {
      return t('lists.this_month')
    }
    if (selectedListId === 'smart:recent') {
      return t('lists.recent')
    }
    if (selectedListId === 'inbox') {
      return t('lists.inbox')
    }
    const list = allLists.find((l) => l.id === selectedListId)
    return list?.name || t('navigation.tasks')
  }, [selectedListId, allLists, advancedGroups, t])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-theme-500 dark:text-theme-800">{t('common.loading')}</div>
      </div>
    )
  }
  return (
    <div className="flex-1 flex overflow-hidden" ref={containerRef}>
      {/* Task Groups Panel */}
      <div
        className="border-r bg-theme-300/30 dark:bg-theme-600/30 border-theme-200 dark:border-theme-900 flex flex-col overflow-hidden"
        style={{
          flexShrink: 0,
          maxWidth: 315,
          minWidth: 215,
          width: groupsPanelWidth,
        }}
      >
        {/* Pinned items - icon only */}
        {(pinnedLists.length > 0 || pinnedAdvGroups.length > 0) && (
          <div className="px-2 pt-2 pb-1">
            <div className="flex flex-wrap gap-1">
              {pinnedLists.map((list) => {
                const isActive = selectedListId === list.id
                return (
                  <div className="relative group" key={list.id}>
                    <button
                      className={`border text-sm p-1 rounded-md transition-colors ${
                        isActive
                          ? 'border-theme-300 bg-theme-100 dark:bg-theme-200/30 dark:border-theme-400'
                          : 'border-transparent hover:bg-black/5 dark:hover:bg-theme-200/30 dark:hover:border-theme-600'
                      }`}
                      onClick={() => handleListClick(list.id)}
                      onContextMenu={(e) => handleContextMenu(e, 'list', list.id)}
                      style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                      title={list.name}
                      type="button"
                    >
                      {resolveIcon(list.icon)}
                    </button>
                  </div>
                )
              })}
              {pinnedAdvGroups.map((group) => {
                const isActive = selectedListId === `adv:${group.id}`
                return (
                  <div className="relative group" key={group.id}>
                    <button
                      className={`border text-sm p-1 rounded-md transition-colors ${
                        isActive
                          ? 'border-theme-300 bg-theme-100 dark:bg-theme-200/30 dark:border-theme-400'
                          : 'border-transparent hover:bg-black/5 dark:hover:bg-theme-200/30 dark:hover:border-theme-600'
                      }`}
                      onClick={() => handleAdvGroupClick(group.id)}
                      onContextMenu={(e) => handleContextMenu(e, 'advGroup', group.id)}
                      style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                      title={group.name}
                      type="button"
                    >
                      {resolveIcon(group.icon)}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Smart lists - fixed at top */}
        <div className="px-2 pt-2 pb-1">
          <div className="space-y-px">
            {visibleSmartLists.map((smartList) => {
              const isActive = selectedListId === smartList.id
              const count = listTaskCounts[smartList.id] || 0

              return (
                <div className="relative group" key={smartList.id}>
                  <button
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors text-left text-sm ${
                      isActive
                        ? 'bg-theme-700/30 dark:bg-theme-200/30'
                        : 'text-theme-700 dark:text-theme-300 hover:bg-theme-700/20 dark:hover:bg-theme-200/20'
                    }`}
                    onClick={() => handleListClick(smartList.id)}
                    style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                    type="button"
                  >
                    {getGroupIcon(smartList.iconKey)}
                    <span className="flex-1 truncate">{t(smartList.labelKey)}</span>
                    {count > 0 && <span className="text-xs text-theme-600 dark:text-theme-400">{count}</span>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Separator line */}
          <hr className="mt-2 border-theme-200 dark:border-theme-800"/>
        </div>

        {/* Advanced groups */}
        <div className="overflow-auto px-2 py-2">
          {/* Section header */}
          <div className="flex items-center justify-between mb-1 px-1.5 rounded-md dark:hover:text-theme-200 invisible hover:visible">
            <button
              className="flex items-center gap-1 -ms-3 text-xs font-semibold text-theme-700 dark:text-theme-300 tracking-wider hover:text-theme-700 dark:hover:text-theme-200 transition-colors"
              onClick={() => setAdvListsExpanded(!advListsExpanded)}
              type="button"
            >
              {advListsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <p className='visible'>{t('advanced_groups.title')}</p>
            </button>
            <div className="flex items-center gap-0.5">
              <button
                className="p-0.5 rounded hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors transition-150"
                onClick={async () => {
                  setEditingAdvGroup(null)
                  try {
                    const existingWindow = await WebviewWindow.getByLabel('advanced-group-form')
                    if (existingWindow) {
                      await existingWindow.setFocus()
                      return
                    }
                  } catch {}

                  new WebviewWindow('advanced-group-form', {
                    alwaysOnTop: true,
                    center: true,
                    decorations: false,
                    height: 700,
                    resizable: false,
                    title: t('advanced_groups.create'),
                    transparent: true,
                    url: '/dialog/advanced-group-form',
                    width: 520,
                    // shadow: true,
                  })
                }}
                title={t('lists.create_list')}
                type="button"
              >
                <Plus className="w-3.5 h-3.5 text-theme-700 dark:text-theme-500" />
              </button>
            </div>
          </div>
          {advListsExpanded && (
            <div className="space-y-px">
              {[...advancedGroups]
                .sort((a, b) => {
                  if (a.isPinned && !b.isPinned) {
                    return -1
                  }
                  if (!a.isPinned && b.isPinned) {
                    return 1
                  }
                  return 0
                })
                .map((group) => {
                  const isActive = selectedListId === `adv:${group.id}`
                  const count = advGroupCounts[group.id] || 0

                  return (
                    <div className="relative group" key={group.id}>
                      <button
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors text-left group/item text-sm ${
                          isActive
                            ? 'bg-black/10 dark:bg-white/15'
                            : 'text-theme-700 dark:text-theme-300 hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                        onClick={() => handleAdvGroupClick(group.id)}
                        onContextMenu={(e) => handleContextMenu(e, 'advGroup', group.id)}
                        style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                        type="button"
                      >
                        <span className="flex-shrink-0 text-sm">{resolveIcon(group.icon)}</span>
                        <span className="flex-1 truncate">{group.name}</span>
                        {count > 0 && (
                          <span className="text-xs text-theme-400 dark:text-theme-500 group-hover/item:hidden">
                            {count}
                          </span>
                        )}
                        <span
                          className="hidden group-hover/item:block p-0.5 rounded hover:bg-theme-200 dark:hover:bg-theme-600"
                          onMouseDown={(e) => handleEditAdvGroup(e, group)}
                        >
                          <Pencil className="w-3 h-3 text-theme-400 dark:text-theme-500" />
                        </span>
                      </button>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Scrollable: groups */}
        <div className="overflow-auto px-2 py-2">
          {/* Section header */}
          <div className="flex items-center justify-between mb-1 px-1.5 invisible hover:visible">
            <button
              className="flex items-center gap-1 -ms-3 text-xs font-semibold text-theme-700 dark:text-theme-300 uppercase tracking-wider hover:text-theme-700 dark:hover:text-theme-200 transition-colors"
              onClick={() => setListsExpanded(!listsExpanded)}
              type="button"
            >
              {listsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <p className='visible'>{t('lists.title')}</p>
            </button>
            <div className="flex items-center gap-0.5">
              <button
                className="p-0.5 rounded hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                onClick={handleCreateList}
                title={t('lists.create_list')}
                type="button"
              >
                <Plus className="w-3.5 h-3.5 text-theme-400 dark:text-theme-500" />
              </button>
            </div>
          </div>

          {listsExpanded && (
            <div className="space-y-px">
              {/* User lists */}
              {userLists.map((list) => {
                const isActive = selectedListId === list.id
                const count = listTaskCounts[list.id] || 0

                return (
                  <div className="relative group" key={list.id}>
                    <button
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left group/item text-sm ${
                        isActive
                          ? 'bg-white/30 dark:bg-black/30'
                          : 'text-theme-700 dark:text-theme-300 hover:bg-white/30 dark:hover:bg-black/30'
                      }`}
                      onContextMenu={(e) => handleContextMenu(e, 'list', list.id)}
                      onMouseDown={() => handleListClick(list.id)}
                      style={isActive ? { color: 'var(--theme-text-700)' } : {}}
                      type="button"
                    >
                      <span className="flex-shrink-0 text-sm">{resolveIcon(list.icon)}</span>
                      <span className="flex-1 truncate">{list.name}</span>
                      {count > 0 && (
                        <span className="text-xs text-theme-400 dark:text-theme-500 group-hover/item:hidden">
                          {count}
                        </span>
                      )}
                      <span
                        className="hidden group-hover/item:block p-0.5 rounded hover:bg-theme-200 dark:hover:bg-theme-600"
                        onMouseDown={(e) => handleEditList(e, list)}
                      >
                        <Pencil className="w-3 h-3 text-theme-400 dark:text-theme-500" />
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resize handle: groups <-> list */}
      <ResizeHandle onResize={(delta) => setGroupsPanelWidth((w) => Math.max(215, Math.min(315, w + delta)))} />

      {/* Task List Panel */}
      <div
        className={`flex flex-col overflow-hidden ${viewMode === 'list' ? 'min-w-[300px] max-w-[400px]' : 'flex-1 min-w-0'}`}
        style={{ backgroundColor: 'var(--theme-bg-2)', ...(viewMode === 'list' ? { width: detailPanelWidth } : {}) }}
      >
        {/* Header */}
        <div className="px-2 py-1">
          <div className="flex items-center justify-between" data-tauri-drag-region>
            <h1 className="text-lg font-bold text-theme-900 dark:text-theme-200">{headerTitle}</h1>
            <div className="flex items-center gap-2">
              <div
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setShowSettings(false)
                  }
                }}
                tabIndex={-1}
              >
                <button
                  className={`p-2 rounded-lg transition-colors hover:bg-theme-100`}
                  onClick={() => setShowSettings(!showSettings)}
                  title={t('tasks.settings')}
                  type="button"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Settings popup */}
                {showSettings && (
                  <div
                    className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-theme-800 rounded-lg shadow-xl border border-theme-200 dark:border-theme-700 z-50 p-4 space-y-4"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {/* View mode */}
                    <div>
                      <div className="text-xs font-semibold text-theme-500 dark:text-theme-400 uppercase tracking-wider mb-1.5 block">
                        {t('tasks.settings_view')}
                      </div>
                      <div className="flex gap-1">
                        {Object.entries(VIEW_MODES).map(([key, label]) => (
                          <button
                            className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors ${
                              viewMode === key
                                ? 'bg-theme-500 text-white'
                                : 'bg-theme-100 dark:bg-theme-700 text-theme-700 dark:text-theme-300 hover:bg-theme-200 dark:hover:bg-theme-600'
                            }`}
                            key={key}
                            onClick={() => {
                              handleSetViewMode(key as keyof typeof VIEW_MODES)
                              setShowSettings(false)
                            }}
                            type="button"
                          >
                            {t(label)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status filter */}
                    <div>
                      <div className="text-xs font-semibold text-theme-500 dark:text-theme-400 uppercase tracking-wider mb-1.5 block">
                        {t('tasks.settings_status')}
                      </div>
                      <div className="flex gap-1">
                        {[
                          { label: t('tasks.status.all'), value: 'all' },
                          { label: t('tasks.status.active'), value: 'active' },
                          { label: t('tasks.status.completed'), value: 'completed' },
                        ].map((opt) => (
                          <button
                            className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors ${
                              filterStatus === opt.value
                                ? 'bg-theme-500 text-white'
                                : 'bg-theme-100 dark:bg-theme-700 text-theme-700 dark:text-theme-300 hover:bg-theme-200 dark:hover:bg-theme-600'
                            }`}
                            key={opt.value}
                            onClick={() => handleSetFilterStatus(opt.value as TaskStatus3)}
                            type="button"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort */}
                    <div>
                      <div className="text-xs font-semibold text-theme-500 dark:text-theme-400 uppercase tracking-wider mb-1.5 block">
                        {t('tasks.settings_sort')}
                      </div>
                      <TaskSortControls
                        onChange={(sortBy, sortOrder) => {
                          setTaskSortBy(sortBy as SortBy)
                          setTaskSortOrder(sortOrder)
                          persistSettings({
                            sortBy: sortBy as ListSettings['sortBy'],
                            sortOrder,
                          })
                        }}
                      />
                    </div>

                    {/* Group */}
                    <div>
                      <div className="text-xs font-semibold text-theme-500 dark:text-theme-400 uppercase tracking-wider mb-1.5 block">
                        {t('tasks.settings_group')}
                      </div>
                      <TaskGroupControls onChange={(groupBy) => handleSetTaskGroupBy(groupBy)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Task content area */}
        {viewMode === 'calendar' ? (
          <CalendarView
            allTags={allTags}
            onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
            onToggleTask={handleToggleTask}
            selectedTaskId={selectedTaskId}
            tasks={filteredTasks}
          />
        ) : viewMode === 'kanban' ? (
          <KanbanView
            allTags={allTags}
            onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
            onToggleTask={handleToggleTask}
            onUpdateTask={handleUpdateTaskInline}
            selectedTaskId={selectedTaskId}
            tasks={filteredTasks}
          />
        ) : viewMode === 'matrix' ? (
          <EisenhowerMatrixView
            allTags={allTags}
            onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
            onToggleTask={handleToggleTask}
            onUpdateTask={handleUpdateTaskInline}
            selectedTaskId={selectedTaskId}
            tasks={filteredTasks}
          />
        ) : (
          <div className="flex-1 overflow-auto p-1">
            {/* Inline new task form */}
            <div className="mb-1 bg-theme-100/30 dark:bg-theme-800/30 rounded-lg shadow-sm border border-theme-200 dark:border-theme-800">
              <input
                className="w-full px-4 py-3 text-sm text-theme-900 dark:text-theme-100 bg-transparent focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleInlineKeyDown}
                placeholder={t('tasks.inline_placeholder')}
                type="text"
                value={newTaskTitle}
              />
              <div className="flex items-center justify-between px-1 py-1.5">
                <div className="flex items-center gap-1">
                  {/* Priority */}
                  <div className="relative">
                    <button
                      className={`p-1.5 rounded transition-colors ${
                        newTaskPriority > 0
                          ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500'
                      }`}
                      onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                      title={t('tasks.priority.label')}
                      type="button"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                    {showPriorityPicker && (
                      <div className="absolute bottom-full left-0 mb-1 bg-white dark:bg-theme-800 rounded-lg shadow-lg border border-theme-200 dark:border-theme-700 p-1.5 flex gap-1 z-50">
                        {[0, 1, 2, 3].map((p) => (
                          <button
                            className={`px-2 py-1 rounded text-xs transition-colors ${
                              newTaskPriority === p
                                ? 'bg-theme-500 text-white'
                                : 'hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-600 dark:text-theme-400'
                            }`}
                            key={p}
                            onClick={() => {
                              setNewTaskPriority(p as Priority)
                              setShowPriorityPicker(false)
                            }}
                            type="button"
                          >
                            {t(`tasks.priority.${['none', 'low', 'medium', 'high'][p]}`)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Tags */}
                  <div className="relative">
                    <button
                      className={`p-1.5 rounded transition-colors ${
                        newTaskTagIds.length > 0
                          ? 'text-theme-500 bg-theme-50 dark:bg-theme-900/20'
                          : 'hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500'
                      }`}
                      onClick={async () => {
                        if (tagButtonRef.current) {
                          const rect = await getScreenRect(tagButtonRef.current)
                          await showOverlay(TAG_LIST_PICKER_LABEL, rect.x, rect.y, {
                            anchorH: rect.height,
                            anchorX: rect.x,
                            anchorY: rect.y,
                            selectedIds: newTaskTagIds,
                            tags: allTags,
                          })
                        }
                      }}
                      ref={tagButtonRef}
                      title={t('tasks.tags.title')}
                      type="button"
                    >
                      <TagIconLucide className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Date */}
                  <button
                    className={`flex items-center gap-1 p-1.5 rounded transition-colors ${
                      dateExplicitlySetRef.current
                        ? 'text-theme-500 bg-theme-50 dark:bg-theme-900/20'
                        : 'hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500'
                    }`}
                    onClick={async () => {
                      inlineDateOpenedRef.current = true
                      if (dateButtonRef.current) {
                        const rect = await getScreenRect(dateButtonRef.current)
                        await showOverlay(DATE_RANGE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
                          anchorH: rect.height,
                          anchorX: rect.x,
                          anchorY: rect.y,
                          date: newTaskDueDate || undefined,
                          mode: 'single',
                          startDate: newTaskDueDate || undefined,
                          startTime: newTaskDueTime || undefined,
                          time: newTaskDueTime || undefined,
                        })
                      }
                    }}
                    ref={dateButtonRef}
                    title={t('tasks.date_placeholder')}
                    type="button"
                  >
                    <Calendar className="w-4 h-4" />
                    {dateExplicitlySetRef.current && (
                      <span className="text-xs">
                        {newTaskDueDate}
                        {newTaskDueTime ? ` ${newTaskDueTime}` : ''}
                      </span>
                    )}
                  </button>
                  {/* Clipboard Paste */}
                  <button
                    className="p-1.5 rounded transition-colors hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500"
                    onClick={handleInlineClipboardPaste}
                    title={t('tasks.clipboard_paste')}
                    type="button"
                  >
                    <Clipboard className="w-4 h-4" />
                  </button>
                  {/* Attachment */}
                  <button
                    className={`flex items-center gap-1 p-1.5 rounded transition-colors ${
                      pendingAttachments.length > 0
                        ? 'text-theme-500 bg-theme-50 dark:bg-theme-900/20'
                        : 'hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500'
                    }`}
                    onClick={handleAttachmentClick}
                    title={t('tasks.attachment')}
                    type="button"
                  >
                    <Paperclip className="w-4 h-4" />
                    {pendingAttachments.length > 0 && <span className="text-xs">{pendingAttachments.length}</span>}
                  </button>
                  {/* Template */}
                  <div className="relative">
                    <button
                      className="p-1.5 rounded transition-colors hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500"
                      onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                      ref={templateButtonRef}
                      title={t('tasks.template')}
                      type="button"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </button>
                    {showTemplatePicker && allTemplates.length > 0 &&
                      createPortal(
                        <div
                          className="bg-white dark:bg-theme-800 rounded-lg shadow-lg border border-theme-200 dark:border-theme-700 py-1 min-w-[180px] max-h-[120px] overflow-y-auto"
                          style={{
                            position: 'fixed',
                            left: templateButtonRef.current?.getBoundingClientRect().left ?? 0,
                            top: (templateButtonRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                            zIndex: 99999,
                          }}
                        >
                          {allTemplates.map((template) => (
                            <button
                              key={template.id}
                              className="w-full text-left px-3 py-1.5 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors truncate"
                              onClick={() => {
                                createTask.mutate(
                                  {
                                    title: template.title || template.name,
                                    description: template.description || undefined,
                                    tagIds: template.tagIds || undefined,
                                    priority: 0,
                                    dueDate: newTaskDueDate || undefined,
                                    dueTime: newTaskDueTime || undefined,
                                    listId:
                                      selectedListId &&
                                      !selectedListId.startsWith('smart:') &&
                                      !selectedListId.startsWith('adv:')
                                        ? selectedListId
                                        : undefined,
                                  },
                                  {
                                    onSuccess: (newTask) => {
                                      if (newTask) {
                                        if (template.steps) {
                                          try {
                                            const stepDescriptions: string[] = JSON.parse(template.steps)
                                            for (const desc of stepDescriptions) {
                                              if (desc && desc.trim()) {
                                                createStep.mutate({ taskId: newTask.id, description: desc })
                                              }
                                            }
                                          } catch {}
                                        }
                                        setSelectedTaskId(newTask.id)
                                        setFocusTitleOnMount(true)
                                      }
                                    },
                                  },
                                )
                                incrementTemplateUsage.mutate(template.id)
                                setShowTemplatePicker(false)
                              }}
                              type="button"
                            >
                              {template.name}
                            </button>
                          ))}
                        </div>,
                        document.body,
                      )}
                  </div>
                </div>
                <button
                  className="p-1.5 rounded transition-colors hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500"
                  onClick={() => handleCreateInline((task) => setSelectedTaskId(task.id))}
                  title={t('tasks.add')}
                  type="button"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {pendingAttachments.length > 0 && (
                <div className="flex gap-1 flex-col px-2 pb-1.5 w-full">
                  {pendingAttachments.map((att, idx) => (
                    <span
                      className="inline-flex items-center gap-1 text-xs bg-theme-50 dark:bg-theme-900/30 text-theme-600 dark:text-theme-400 px-2 py-0.5 rounded"
                      key={`${idx}`}
                    >
                      {att.originalFilename}
                      <button
                        className="hover:text-red-500"
                        onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        type="button"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-theme-500 dark:text-theme-400">
                <p className="text-lg">{t('tasks.no_tasks')}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {flatItems.map((item) => {
                  const isSubtask = item.type === 'subtask'
                  const displayTask = isSubtask
                    ? {
                        ...item.subtask,
                        createdAt: item.subtask.createdAt || '',
                        description: '',
                        groupBy: 'none' as const,
                        priority: 0 as Priority,
                        sortBy: 'sortOrder' as const,
                        sortOrder: item.subtask.sortOrder,
                        updatedAt: item.subtask.updatedAt || '',
                      }
                    : item.task

                  return (
                    <TaskRow
                      isSelected={
                        isSubtask
                          ? selectedSubtaskId === displayTask.id
                          : selectedTaskId === displayTask.id && !selectedSubtaskId
                      }
                      key={displayTask.id}
                      onContextMenu={(e) => {
                        setTaskContextMenu({ taskId: displayTask.id, x: e.clientX, y: e.clientY })
                        setTaskMenuPanel(null)
                      }}
                      onSelect={() => {
                        if (isSubtask) {
                          setSelectedTaskId(item.parentTask.id)
                          setSelectedSubtaskId(item.subtask.id)
                        } else {
                          setSelectedTaskId(selectedTaskId === item.task.id ? null : item.task.id)
                          setSelectedSubtaskId(null)
                        }
                      }}
                      onToggle={() => {
                        if (isSubtask) {
                          updateSubtask.mutate({
                            id: item.subtask.id,
                            isCompleted: !item.subtask.isCompleted,
                            taskId: item.parentTask.id,
                          })
                        } else {
                          handleToggleTask(item.task.id, item.task.isCompleted)
                        }
                      }}
                      progressStyle="circle"
                      task={displayTask as Task}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {viewMode === 'list' && (
        <>
          {/* Resize handle: list <-> detail */}
          <ResizeHandle
            onResize={(delta) => {
              setDetailPanelWidth((w) => Math.max(300, Math.min(400, w + delta)))
            }}
          />

          {/* Task Detail Panel */}
          <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--theme-bg-2)' }}>
            {selectedTask ? (
              <TaskDetailPanel
                allTags={allTags}
                focusTitleOnMount={focusTitleOnMount}
                inlineDateOpenedRef={inlineDateOpenedRef}
                onClose={() => {
                  setSelectedTaskId(null)
                  setSelectedSubtaskId(null)
                }}
                onDelete={() => handleDeleteTask(selectedSubtaskId || selectedTask.id)}
                onFocusTitleDone={() => setFocusTitleOnMount(false)}
                onSubtaskBack={() => setSelectedSubtaskId(null)}
                onSubtaskClick={(id) => setSelectedSubtaskId(id)}
                onUpdateTask={handleUpdateTaskField}
                selectedSubtaskId={selectedSubtaskId}
                task={selectedTask}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-theme-400 dark:text-theme-500">
                <p className="text-sm">{t('tasks.select_task')}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Task Form Dialog */}
      <TaskForm
        isOpen={showTaskForm}
        onClose={() => {
          setShowTaskForm(false)
          setEditingTask(null)
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
      />

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onMouseDown={() => {
              setContextMenu(null)
              setContextMenuFlipY(false)
            }}
          />
          <div
            className="fixed z-50 bg-white dark:bg-theme-800 rounded-lg shadow-xl border border-theme-200 dark:border-theme-700 py-1 min-w-[160px]"
            ref={contextMenuRef}
            style={{
              left: contextMenu.x,
              ...(contextMenuFlipY ? { bottom: window.innerHeight - contextMenu.y } : { top: contextMenu.y }),
            }}
          >
            {contextMenu.type === 'list' ? (
              <>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                  onClick={() => {
                    const list = allLists.find((l) => l.id === contextMenu.id)
                    if (list) {
                      handleEditList({ stopPropagation: () => {} } as React.MouseEvent, list)
                    }
                    setContextMenu(null)
                  }}
                  type="button"
                >
                  <Pencil className="w-4 h-4" />
                  {t('common.edit')}
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                  onClick={() => handlePinList(contextMenu.id)}
                  type="button"
                >
                  <Pin className="w-4 h-4" />
                  {allLists.find((l) => l.id === contextMenu.id)?.isPinned ? t('lists.unpin') : t('lists.pin')}
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                  onClick={() => handleArchiveList(contextMenu.id)}
                  type="button"
                >
                  <Archive className="w-4 h-4" />
                  {allLists.find((l) => l.id === contextMenu.id)?.isArchived
                    ? t('lists.unarchive')
                    : t('lists.archive')}
                </button>
                <div className="border-t border-theme-200 dark:border-theme-700 my-1" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  onClick={() => handleDeleteList(contextMenu.id)}
                  type="button"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('common.delete')}
                </button>
              </>
            ) : (
              <>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                  onClick={() => {
                    const group = advancedGroups.find((g) => g.id === contextMenu.id)
                    if (group) {
                      handleEditAdvGroup({ stopPropagation: () => {} } as React.MouseEvent, group)
                    }
                    setContextMenu(null)
                  }}
                  type="button"
                >
                  <Pencil className="w-4 h-4" />
                  {t('common.edit')}
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                  onClick={() => handlePinAdvGroup(contextMenu.id)}
                  type="button"
                >
                  <Pin className="w-4 h-4" />
                  {advancedGroups.find((g) => g.id === contextMenu.id)?.isPinned ? t('lists.unpin') : t('lists.pin')}
                </button>
                <div className="border-t border-theme-200 dark:border-theme-700 my-1" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  onClick={() => handleDeleteAdvGroup(contextMenu.id)}
                  type="button"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('common.delete')}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Task Context Menu */}
      {taskContextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onMouseDown={() => {
              setTaskContextMenu(null)
              setTaskMenuPanel(null)
              setMenuFlipY(false)
            }}
          />
          <div
            className="fixed z-50 flex"
            ref={taskMenuRef}
            style={{
              left: taskContextMenu.x,
              ...(menuFlipY ? { bottom: window.innerHeight - taskContextMenu.y } : { top: taskContextMenu.y }),
            }}
          >
            {/* Main menu */}
            <div className="bg-white dark:bg-theme-800 rounded-lg shadow-2xl border border-theme-300 dark:border-theme-600 py-1 min-w-[180px]">
              {/* 1. 今天 */}
              {todayAtomTag &&
                (() => {
                  const task = tasks.find((t) => t.id === taskContextMenu.taskId)
                  if (!task) {
                    return null
                  }
                  const hasToday = task.tagIds?.split(',').includes(todayAtomTag.id)
                  const now = new Date()
                  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                  const matchesDate = task.dueDate === todayStr
                  const matchesRange =
                    task.startDate && task.endDate ? task.startDate <= todayStr && task.endDate >= todayStr : false
                  if (!hasToday && (matchesDate || matchesRange)) {
                    return null
                  }
                  return (
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                      onClick={() => {
                        handleToggleTodayTag(taskContextMenu.taskId)
                        setTaskContextMenu(null)
                      }}
                      type="button"
                    >
                      <Sun className="w-4 h-4" />
                      {hasToday ? t('tasks.context.remove_today') : t('tasks.context.add_today')}
                    </button>
                  )
                })()}

              {/* 2. 指定优先级 */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                onClick={() => {
                  setTaskMenuPanel(taskMenuPanel === 'priority' ? null : 'priority')
                }}
                type="button"
              >
                <Flag className="w-4 h-4" />
                {t('tasks.context.set_priority')}
                <ChevronRight className="w-3 h-3 ml-auto" />
              </button>

              {/* 3. 指定日期 */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                onClick={async () => {
                  const task = tasks.find((t) => t.id === taskContextMenu.taskId)
                  setTaskContextMenu(null)
                  setTaskMenuPanel(null)
                  const btn = document.querySelector(`[data-task-row="${taskContextMenu.taskId}"]`) as HTMLElement
                  const rect = btn
                    ? await getScreenRect(btn)
                    : { height: 0, x: taskContextMenu.x, y: taskContextMenu.y }
                  await showOverlay(DATE_RANGE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
                    anchorH: rect.height,
                    anchorX: rect.x,
                    anchorY: rect.y,
                    date: task?.dueDate || undefined,
                    mode: 'single',
                    startDate: task?.dueDate || undefined,
                    startTime: task?.dueTime || undefined,
                    time: task?.dueTime || undefined,
                  })
                  // Listen for result once
                  const unlisten = listen<{
                    type: string
                    date?: string
                    time?: string
                    startDate?: string
                    startTime?: string
                  }>('date-range-picker-overlay:result', (e) => {
                    const p = e.payload
                    if (p.type === 'single') {
                      updateTask.mutate({
                        dueDate: p.date ?? '',
                        dueTime: p.time ?? '',
                        id: taskContextMenu.taskId,
                      })
                    } else {
                      updateTask.mutate({
                        dueDate: p.startDate ?? '',
                        dueTime: p.startTime ?? '',
                        id: taskContextMenu.taskId,
                      })
                    }
                    unlisten.then((fn) => fn())
                  })
                }}
                type="button"
              >
                <Calendar className="w-4 h-4" />
                {t('tasks.context.set_date')}
              </button>

              {/* 4. 指定任务状态 */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                onClick={() => {
                  setTaskMenuPanel(taskMenuPanel === 'status' ? null : 'status')
                }}
                type="button"
              >
                <Columns className="w-4 h-4" />
                {t('tasks.context.set_status')}
                <ChevronRight className="w-3 h-3 ml-auto" />
              </button>

              {/* 5. 关联主任务 */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                onClick={() => {
                  setTaskMenuPanel(taskMenuPanel === 'parent' ? null : 'parent')
                  setTaskPanelSearch('')
                }}
                type="button"
              >
                <CornerUpLeft className="w-4 h-4" />
                {t('tasks.context.link_parent')}
                <ChevronRight className="w-3 h-3 ml-auto" />
              </button>

              {/* 6. 关联子任务 */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                onClick={() => {
                  setTaskMenuPanel(taskMenuPanel === 'subtask' ? null : 'subtask')
                  setTaskPanelSearch('')
                }}
                type="button"
              >
                <CornerDownRight className="w-4 h-4" />
                {t('tasks.context.link_subtask')}
                <ChevronRight className="w-3 h-3 ml-auto" />
              </button>

              {/* 7. 指定任务组 */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                onClick={() => {
                  setTaskMenuPanel(taskMenuPanel === 'list' ? null : 'list')
                  setTaskPanelSearch('')
                }}
                type="button"
              >
                <Inbox className="w-4 h-4" />
                {t('tasks.context.set_list')}
                <ChevronRight className="w-3 h-3 ml-auto" />
              </button>

              <div className="border-t border-theme-200 dark:border-theme-700 my-1" />

              {/* 8. 保存为模板 */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                onClick={async () => {
                  const task = tasks.find((tk) => tk.id === taskContextMenu.taskId)
                  if (task) {
                    let stepsJson: string | undefined
                    try {
                      const { getSteps } = await import('@/lib/api')
                      const taskSteps = await getSteps(task.id)
                      if (taskSteps && taskSteps.length > 0) {
                        stepsJson = JSON.stringify(taskSteps.map((s) => s.description))
                      }
                    } catch {}
                    const existing = allTemplates.find((tpl) => tpl.name === task.title)
                    if (existing) {
                      if (!window.confirm(t('template_mgmt.overwrite_confirm', { name: task.title }))) {
                        setTaskContextMenu(null)
                        setTaskMenuPanel(null)
                        return
                      }
                      updateTaskTemplate.mutate({
                        description: task.description || undefined,
                        id: existing.id,
                        steps: stepsJson,
                        tagIds: task.tagIds || undefined,
                        title: task.title,
                      })
                    } else {
                      createTemplate.mutate({
                        description: task.description || undefined,
                        name: task.title,
                        title: task.title,
                        steps: stepsJson,
                        tagIds: task.tagIds || undefined,
                      })
                    }
                  }
                  setTaskContextMenu(null)
                  setTaskMenuPanel(null)
                }}
                type="button"
              >
                <ClipboardCheck className="w-4 h-4" />
                {t('tasks.save_as_template')}
              </button>

              {/* 9. 删除 */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                onClick={() => {
                  handleDeleteTask(taskContextMenu.taskId)
                  setTaskContextMenu(null)
                  setTaskMenuPanel(null)
                }}
                type="button"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </button>
            </div>

            {/* Side panel */}
            {taskMenuPanel &&
              (() => {
                const currentTask = tasks.find((t) => t.id === taskContextMenu.taskId)

                // Priority panel
                if (taskMenuPanel === 'priority') {
                  const priorities = [
                    { color: '#9CA3AF', label: t('tasks.priority.none'), value: 0 },
                    { color: '#3B82F6', label: t('tasks.priority.low'), value: 3 },
                    { color: '#F59E0B', label: t('tasks.priority.medium'), value: 6 },
                    { color: '#EF4444', label: t('tasks.priority.high'), value: 9 },
                  ]
                  return (
                    <div className="bg-white dark:bg-theme-800 rounded-lg shadow-2xl border border-theme-200 dark:border-theme-700 py-1 w-[180px] ml-0.5">
                      {priorities.map((p) => (
                        <button
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                            currentTask?.priority === p.value
                              ? 'bg-theme-100 dark:bg-theme-700 font-medium'
                              : 'text-theme-700 dark:text-theme-300 hover:bg-theme-50 dark:hover:bg-theme-700'
                          }`}
                          key={p.value}
                          onClick={() => {
                            updateTask.mutate({ id: taskContextMenu.taskId, priority: p.value })
                            setTaskContextMenu(null)
                            setTaskMenuPanel(null)
                          }}
                          type="button"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.label}
                          {currentTask?.priority === p.value && <span className="ml-auto text-xs">✓</span>}
                        </button>
                      ))}
                    </div>
                  )
                }

                // Status panel
                if (taskMenuPanel === 'status') {
                  const statuses: { key: TaskStatus; color: string }[] = [
                    { color: '#9CA3AF', key: 'pending' },
                    { color: '#3B82F6', key: 'in_progress' },
                    { color: '#F59E0B', key: 'today' },
                    { color: '#10B981', key: 'completed' },
                    { color: '#6B7280', key: 'closed' },
                  ]
                  return (
                    <div className="bg-white dark:bg-theme-800 rounded-lg shadow-2xl border border-theme-200 dark:border-theme-700 py-1 w-[180px] ml-0.5">
                      {statuses.map((s) => (
                        <button
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                            (currentTask?.status || 'pending') === s.key
                              ? 'bg-theme-100 dark:bg-theme-700 font-medium'
                              : 'text-theme-700 dark:text-theme-300 hover:bg-theme-50 dark:hover:bg-theme-700'
                          }`}
                          key={s.key}
                          onClick={() => {
                            updateTask.mutate({ id: taskContextMenu.taskId, status: s.key })
                            setTaskContextMenu(null)
                            setTaskMenuPanel(null)
                          }}
                          type="button"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          {t(`tasks.status.${s.key}`)}
                          {(currentTask?.status || 'pending') === s.key && <span className="ml-auto text-xs">✓</span>}
                        </button>
                      ))}
                    </div>
                  )
                }

                // List panel
                if (taskMenuPanel === 'list') {
                  const lists = allLists.filter(
                    (l) =>
                      !['inbox', 'today', 'tomorrow', 'next7days', 'thismonth', 'recent', 'eisenhower'].includes(l.id),
                  )
                  const q = taskPanelSearch.toLowerCase().trim()
                  const filteredLists = q ? lists.filter((l) => l.name.toLowerCase().includes(q)) : lists
                  return (
                    <div className="bg-white dark:bg-theme-800 rounded-lg shadow-2xl border border-theme-200 dark:border-theme-700 py-1 w-[220px] ml-0.5">
                      <div className="px-2 pb-1">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-theme-400" />
                          <input
                            className="w-full pl-7 pr-2 py-1 text-xs bg-theme-50 dark:bg-theme-700 border border-theme-200 dark:border-theme-600 rounded focus:outline-none focus:ring-1 focus:ring-theme-500 text-theme-900 dark:text-theme-100"
                            onChange={(e) => setTaskPanelSearch(e.target.value)}
                            placeholder={t('tasks.search_placeholder')}
                            type="text"
                            value={taskPanelSearch}
                          />
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-auto">
                        <button
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                            !currentTask?.listId
                              ? 'bg-theme-100 dark:bg-theme-700 font-medium'
                              : 'text-theme-700 dark:text-theme-300 hover:bg-theme-50 dark:hover:bg-theme-700'
                          }`}
                          onClick={() => {
                            updateTask.mutate({ id: taskContextMenu.taskId, listId: undefined })
                            setTaskContextMenu(null)
                            setTaskMenuPanel(null)
                          }}
                          type="button"
                        >
                          <Inbox className="w-3.5 h-3.5" />
                          {t('lists.inbox')}
                          {!currentTask?.listId && <span className="ml-auto text-xs">✓</span>}
                        </button>
                        {filteredLists.map((l) => (
                          <button
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left truncate transition-colors ${
                              currentTask?.listId === l.id
                                ? 'bg-theme-100 dark:bg-theme-700 font-medium'
                                : 'text-theme-700 dark:text-theme-300 hover:bg-theme-50 dark:hover:bg-theme-700'
                            }`}
                            key={l.id}
                            onClick={() => {
                              updateTask.mutate({ id: taskContextMenu.taskId, listId: l.id })
                              setTaskContextMenu(null)
                              setTaskMenuPanel(null)
                            }}
                            type="button"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: l.color || '#3B82F6' }}
                            />
                            <span className="truncate">{l.name}</span>
                            {currentTask?.listId === l.id && <span className="ml-auto text-xs flex-shrink-0">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                }

                // Parent/subtask panel
                const incompleteTasks = tasks.filter((tk) => !tk.isCompleted && tk.id !== taskContextMenu.taskId)
                const q = taskPanelSearch.toLowerCase().trim()
                const filtered = q
                  ? incompleteTasks.filter((tk) => tk.title.toLowerCase().includes(q))
                  : incompleteTasks

                return (
                  <div className="bg-white dark:bg-theme-800 rounded-lg shadow-2xl border border-theme-200 dark:border-theme-700 py-1 w-[220px] ml-0.5">
                    <div className="px-2 pb-1">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-theme-400" />
                        <input
                          className="w-full pl-7 pr-2 py-1 text-xs bg-theme-50 dark:bg-theme-700 border border-theme-200 dark:border-theme-600 rounded focus:outline-none focus:ring-1 focus:ring-theme-500 text-theme-900 dark:text-theme-100"
                          onChange={(e) => setTaskPanelSearch(e.target.value)}
                          placeholder={t('tasks.search_placeholder')}
                          type="text"
                          value={taskPanelSearch}
                        />
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-auto">
                      {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-theme-400">{t('tasks.context.no_candidates')}</div>
                      ) : (
                        filtered.map((tk) => {
                          const isLinked =
                            taskMenuPanel === 'parent'
                              ? currentTask?.parentTaskId === tk.id
                              : tk.parentTaskId === taskContextMenu.taskId
                          return (
                            <button
                              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left truncate transition-colors ${
                                isLinked
                                  ? 'bg-theme-50 dark:bg-theme-900/20 font-medium'
                                  : 'text-theme-700 dark:text-theme-300 hover:bg-theme-50 dark:hover:bg-theme-700'
                              }`}
                              key={tk.id}
                              onClick={() => {
                                if (taskMenuPanel === 'parent') {
                                  updateTask.mutate({ id: taskContextMenu.taskId, level: 1, parentTaskId: tk.id })
                                } else {
                                  updateTask.mutate({ id: tk.id, level: 1, parentTaskId: taskContextMenu.taskId })
                                }
                                setTaskContextMenu(null)
                                setTaskMenuPanel(null)
                              }}
                              type="button"
                            >
                              <span className="truncate">{tk.title}</span>
                              {isLinked && <span className="ml-auto text-xs flex-shrink-0 text-theme-500">✓</span>}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })()}
          </div>
        </>
      )}
    </div>
  )
}

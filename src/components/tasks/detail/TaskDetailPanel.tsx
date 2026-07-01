import { useAppStore } from '&/useAppStore'
import { useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'
import {
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronRight,
  Clipboard,
  Contact,
  File,
  Film,
  Flag,
  List as ListIcon,
  Paperclip,
  Plus,
  RefreshCw,
  Table2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { useTranslation } from 'react-i18next'
import { DATE_RANGE_PICKER_LABEL, showOverlay } from '@/lib/overlayManager'
import { getPriorityOptions } from '@/lib/priorityOptions'
import { getScreenRect } from '@/lib/screenRect'
import { useMediaItems } from '@/queries/useMediaQueries'
import { useAllNotes } from '@/queries/useNoteQueries'
import { useAllPersons } from '@/queries/usePersonQueries'
import {
  useAttachments,
  useCreateAttachment,
  useCreateStep,
  useCreateSubtask,
  useCreateTag,
  useDeleteAttachment,
  useDeleteStep,
  useDeleteSubtask,
  useLinkTaskItem,
  useReorderSteps,
  useReorderSubtasks,
  useSteps,
  useSubtasks,
  useTaskLinkedItems,
  useUnlinkTaskItem,
  useUpdateStep,
  useUpdateSubtask,
} from '@/queries/useTaskQueries'
import type { Attachment } from '@/types/attachment'
import type { Step as StepType, Task } from '@/types/task'
import type { Tag } from '@/types/tag'
import MilkdownEditor from '%/MilkdownEditor'
import LinkedItemSelector from '%/media/LinkedItemSelector'
import { AvatarImage } from '%/people/AvatarImage'
import TagCombobox from '%/TagCombobox'
import OxygenNotIncludedPriorityPicker from '%/tasks/controls/OxygenNotIncludedPriorityPicker'
import StepList from '%/tasks/StepList'
import SubtaskList from '%/tasks/SubtaskList'

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
export default function TaskDetailPanel({
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
  // biome-ignore lint:noExplicitAny
  onUpdateTask: (params: any) => void
  onSubtaskClick?: (id: string) => void
  onSubtaskBack?: () => void
  inlineDateOpenedRef?: React.RefObject<boolean>
  focusTitleOnMount?: boolean
  onFocusTitleDone?: () => void
}) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const priorityMode = useAppStore((s) => s.priorityMode)
  const priorityOptions = useMemo(() => getPriorityOptions(priorityMode, t), [priorityMode, t])

  // When a subtask is selected, treat it as the active task
  const { data: flatSubtasks = [] } = useSubtasks(task.id)
  const selectedSubtask = useMemo(() => {
    if (!selectedSubtaskId) {
      return null
    }
    return flatSubtasks.find((s) => s.id === selectedSubtaskId) || null
  }, [flatSubtasks, selectedSubtaskId])

  const activeTask = selectedSubtask || task
  const activePriorityColor = priorityOptions.find((option) => option.value === activeTask.priority)?.color
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

  const toggleSection = useCallback(
    (key: string) => {
      setVisibleSections((prev) => {
        const next = { ...prev, [key]: !prev[key] }
        onUpdateTask({ visibleSections: JSON.stringify(next) })
        return next
      })
    },
    [onUpdateTask],
  )
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const defaultTaskSections = useAppStore((s) => s.defaultTaskSections)
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>(() => {
    if (task.visibleSections) {
      try {
        return JSON.parse(task.visibleSections)
      } catch {}
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
          const inPanel =
            position.x >= rect.left && position.x <= rect.right && position.y >= rect.top && position.y <= rect.bottom
          if (inPanel && paths.length > 0) {
            const filePath = paths[0]
            const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown'
            import('@/lib/api')
              .then((api) => api.readFileBytes(filePath))
              .then((bytes) => {
                uploadAttachmentBytes(fileName, bytes)
              })
          }
        } else {
          setIsDragging(false)
        }
      })
    }
    setup()
    return () => {
      unlistenRef.current?.()
    }
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

  // Calculate progress
  const progress = useMemo(() => calcFullProgress(activeSubtasks, steps), [activeSubtasks, steps])

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
      updateSubtask.mutate({ id, isCompleted: !subtask.isCompleted, taskId: activeTask.id })
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
      _source?: string
      type: string
      date?: string
      time?: string
      startDate?: string
      startTime?: string
      endDate?: string
      endTime?: string
      isAllDay?: boolean
    }>('date-range-picker-overlay:result', (e) => {
      if (e.payload._source) {
        return
      }
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
            <Calendar className="w-4 h-4 shrink-0" strokeWidth={`2`} />
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
          <div className="relative shrink-0 flex items-center gap-0.5">
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
            className="relative shrink-0"
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
              <Flag className="w-4 h-4" style={{ color: activePriorityColor?.bg }} />
            </button>
            {showPriorityPicker && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-theme-800 rounded-lg shadow-xl border border-theme-200 dark:border-theme-700 z-50 py-1 max-h-64 overflow-y-auto">
                {priorityMode === 'OxygenNotIncluded' ? (
                  <OxygenNotIncludedPriorityPicker
                    onSelect={(priority) => {
                      onUpdateTask({ priority })
                      setShowPriorityPicker(false)
                    }}
                    options={priorityOptions}
                    selectedPriority={activeTask.priority}
                  />
                ) : (
                  <div className="w-32">
                    {priorityOptions.map((p) => (
                      <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
                        key={p.value}
                        onClick={() => {
                          onUpdateTask({ priority: p.value })
                          setShowPriorityPicker(false)
                        }}
                        type="button"
                      >
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color.bg }} />
                        <span className="text-theme-700 dark:text-theme-300">{p.label}</span>
                      </button>
                    ))}
                  </div>
                )}
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
            <ChevronRight className="w-3 h-3 rotate-180 shrink-0" />
            <span className="truncate">{task.title}</span>
          </button>
        )}
      </div>

      {/* Progress bar - tightly below header */}
      {progress && (
        <div className="group relative px-4 pb-2">
          <div className="w-full h-0.5 bg-theme-200 dark:bg-theme-800">
            <div
              className={`h-full transition-all duration-300 ${
                progress.completed === progress.total
                  ? 'bg-theme-300 dark:bg-theme-700'
                  : 'dark:bg-theme-700 bg-theme-300'
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
              subtasks={activeSubtasks}
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
                                  onMouseDown={() => setPreviewImage(imageUrls[att.id])}
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
                                <RefreshCw className="w-4 h-4 text-theme-400 dark:text-theme-500 shrink-0 animate-spin" />
                              ) : status === 'failed' ? (
                                <AlertCircle className="w-4 h-4 text-red-400 dark:text-red-500 shrink-0" />
                              ) : (
                                <File className="w-4 h-4 text-theme-400 dark:text-theme-500 shrink-0" />
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
                            className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-theme-400 shrink-0"
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
                          <img alt={media.title} className="w-14 aspect-2/3 object-cover" src={media.cover} />
                        ) : (
                          <div className="w-14 aspect-2/3 bg-theme-200 dark:bg-theme-700 flex items-center justify-center text-theme-400 dark:text-theme-500">
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
            className="fixed z-50 bg-white dark:bg-theme-800 rounded-lg shadow-xl border border-theme-200 dark:border-theme-700 py-1 min-w-40"
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

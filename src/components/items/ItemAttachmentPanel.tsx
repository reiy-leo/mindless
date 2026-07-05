import { Image, Paperclip, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as api from '@/lib/api'
import { getActiveProvider } from '@/lib/sync'
import { useOwnerAttachments } from '@/queries/useItemQueries'
import { useCreateAttachment, useDeleteAttachment } from '@/queries/useTaskQueries'
import type { Attachment } from '@/types/attachment'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']

function isImageFile(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return IMAGE_EXTENSIONS.includes(ext)
}

function bytesToBase64(bytes: number[]) {
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += 8192) {
    chunks.push(String.fromCharCode(...bytes.slice(i, i + 8192)))
  }
  return btoa(chunks.join(''))
}

export default function ItemAttachmentPanel({ itemId }: { itemId: string }) {
  const { t } = useTranslation('common')
  const { data: attachments = [] } = useOwnerAttachments('item', itemId)
  const createAttachment = useCreateAttachment()
  const deleteAttachment = useDeleteAttachment()
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ;(async () => {
      for (const attachment of attachments) {
        if (!isImageFile(attachment.originalFilename) || !attachment.localPath || imageUrls[attachment.id]) continue
        try {
          const dataUrl = await api.readImageDataUrl(attachment.localPath)
          setImageUrls((prev) => ({ ...prev, [attachment.id]: dataUrl }))
        } catch {}
      }
    })()
  }, [attachments, imageUrls])

  const uploadBytes = async (originalFilename: string, fileBytes: number[]) => {
    if (fileBytes.length > 30 * 1024 * 1024) {
      const { message } = await import('@tauri-apps/plugin-dialog')
      await message(t('tasks.attachment_too_large'), { kind: 'error' })
      return
    }
    const attachment = await createAttachment.mutateAsync({
      fileBytes,
      originalFilename,
      ownerId: itemId,
      ownerType: 'item',
    })
    const activeProvider = await getActiveProvider()
    if (!activeProvider) return
    const { provider, info } = activeProvider
    try {
      await api.updateAttachmentSyncStatus({ id: attachment.id, syncProvider: info.provider, syncStatus: 'syncing' })
      await provider.uploadBinaryFile(
        info.owner,
        info.repo,
        `attachments/${attachment.filename}`,
        bytesToBase64(fileBytes),
        `Mindless: add attachment ${attachment.originalFilename}`,
      )
      await api.updateAttachmentSyncStatus({
        id: attachment.id,
        syncProvider: info.provider,
        syncStatus: 'synced',
        uploadedTo: `attachments/${attachment.filename}`,
      })
    } catch (err) {
      await api.updateAttachmentSyncStatus({
        id: attachment.id,
        syncError: err instanceof Error ? err.message : 'Unknown error',
        syncProvider: info.provider,
        syncStatus: 'failed',
      })
    }
  }

  const addFile = async () => {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({ multiple: false })
    if (!selected || Array.isArray(selected)) return
    const originalFilename = selected.split('/').pop() || selected.split('\\').pop() || 'unknown'
    await uploadBytes(originalFilename, await api.readFileBytes(selected))
  }

  const pasteImage = async () => {
    const bytes = await api.readClipboardImage()
    if (!bytes) return
    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    await uploadBytes(`剪贴板-${stamp}.png`, bytes)
  }

  const removeAttachment = async (attachment: Attachment) => {
    await deleteAttachment.mutateAsync(attachment.id)
    setImageUrls((prev) => {
      const next = { ...prev }
      delete next[attachment.id]
      return next
    })
  }

  return (
    <div
      ref={panelRef}
      className={`rounded-md border border-dashed p-3 ${dragging ? 'border-theme-500 bg-theme-50 dark:bg-theme-900/20' : 'border-gray-200 dark:border-gray-700'}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (event) => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files[0]
        if (!file) return
        await uploadBytes(file.name, Array.from(new Uint8Array(await file.arrayBuffer())))
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <Paperclip className="h-4 w-4" />
          {t('items.fields.attachments')}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={pasteImage} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800" title={t('items.actions.paste_image')}>
            <Image className="h-4 w-4" />
          </button>
          <button type="button" onClick={addFile} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800" title={t('items.actions.add_attachment')}>
            <Upload className="h-4 w-4" />
          </button>
        </div>
      </div>
      {attachments.length === 0 ? (
        <div className="py-4 text-center text-xs text-gray-400">{t('items.empty.attachments')}</div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center gap-2 rounded border border-gray-100 px-2 py-1.5 text-xs dark:border-gray-800">
              {imageUrls[attachment.id] ? (
                <button type="button" onClick={() => setPreviewImage(imageUrls[attachment.id])}>
                  <img src={imageUrls[attachment.id]} alt={attachment.originalFilename} className="h-8 w-8 rounded object-cover" />
                </button>
              ) : (
                <Paperclip className="h-4 w-4 text-gray-400" />
              )}
              <span className="min-w-0 flex-1 truncate">{attachment.originalFilename}</span>
              {attachment.syncStatus === 'syncing' && <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />}
              <button type="button" onClick={() => removeAttachment(attachment)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {previewImage && (
        <button type="button" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="preview" className="max-h-full max-w-full rounded bg-white object-contain" />
        </button>
      )}
    </div>
  )
}

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  DocumentIcon, ServerIcon, WindowIcon,
} from '@heroicons/react/24/outline';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAllAttachments, useUpdateAttachmentFilename, useDeleteAttachmentLocalCache } from '@/queries/useTaskQueries';
import type { Attachment } from '@/types/attachment';
import OverlayWebviewWindow from '@/components/OverlayWebviewWindow';
import { parseRepoUrl, createOctokit, getFileSha } from '@/lib/syncService';
import * as api from '@/lib/api';

// ==================== Context Menu ====================

function CacheContextMenu({
  x, y, attachment, onClose, onDeleteCache, onFetchFromGithub,
}: {
  x: number;
  y: number;
  attachment: Attachment;
  onClose: () => void;
  onDeleteCache: (att: Attachment) => void;
  onFetchFromGithub: (att: Attachment) => void;
}) {
  const { t } = useTranslation('common');
  const ref = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ left: x, top: y });

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const left = x + rect.width > window.innerWidth ? x - rect.width : x;
      const top = y + rect.height > window.innerHeight ? y - rect.height : y;
      setAdjustedPos({ left: Math.max(0, left), top: Math.max(0, top) });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[140px]"
      style={{ left: adjustedPos.left, top: adjustedPos.top }}
    >
      {attachment.localPath && (
        <button
          onClick={() => { onDeleteCache(attachment); onClose(); }}
          className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 flex items-center gap-2"
        >
          {t('attachment_mgmt.delete_cache')}
        </button>
      )}
      <button
        onClick={() => { onFetchFromGithub(attachment); onClose(); }}
        className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
      >
        {t('attachment_mgmt.fetch_from_github')}
      </button>
    </div>
  );
}

// ==================== Attachment Row ====================

function AttachmentRow({
  attachment,
  githubExists,
  githubChecking,
  onContextMenu,
  onRename,
}: {
  attachment: Attachment;
  githubExists: boolean | null;
  githubChecking: boolean;
  onContextMenu: (e: React.MouseEvent, att: Attachment) => void;
  onRename: (id: string, newName: string) => void;
}) {
  const { t } = useTranslation('common');
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const hasCache = attachment.localPath !== null;

  const handleDoubleClick = () => {
    setEditValue(attachment.originalFilename);
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== attachment.originalFilename) {
      onRename(attachment.id, trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 group">
      <DocumentIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <span
            className="text-xs text-gray-800 dark:text-gray-200 truncate block cursor-default"
            onDoubleClick={handleDoubleClick}
            title={attachment.originalFilename}
          >
            {attachment.originalFilename}
          </span>
        )}
      </div>

      <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 w-32 text-right">
        {hasCache ? t('attachment_mgmt.last_fetched') : t('attachment_mgmt.added')}
        {' '}
        {attachment.addedDatetime}
      </span>

      <div
        className="flex-shrink-0 cursor-pointer"
        title={hasCache ? t('attachment_mgmt.has_cache') : t('attachment_mgmt.no_cache')}
        onContextMenu={(e) => onContextMenu(e, attachment)}
      >
        <ServerIcon
          className={`w-4 h-4 ${hasCache ? 'text-theme-500' : 'text-gray-300 dark:text-gray-600'}`}
          strokeWidth={2}
        />
      </div>

      <div
        className="flex-shrink-0"
        title={
          githubChecking
            ? '...'
            : githubExists
              ? t('attachment_mgmt.on_github')
              : t('attachment_mgmt.not_on_github')
        }
      >
        {githubChecking ? (
          <div className="w-4 h-4 border border-gray-300 border-t-theme-500 rounded-full animate-spin" />
        ) : (
          <WindowIcon
            className={`w-4 h-4 ${githubExists ? 'text-theme-500' : 'text-gray-300 dark:text-gray-600'}`}
            strokeWidth={2}
          />
        )}
      </div>
    </div>
  );
}

// ==================== Main Page ====================

export default function AttachmentManagementDialogPage() {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const { data: attachments = [], isLoading } = useAllAttachments();
  const updateFilename = useUpdateAttachmentFilename();
  const deleteLocalCache = useDeleteAttachmentLocalCache();

  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; att: Attachment } | null>(null);
  const [githubStatus, setGithubStatus] = useState<Map<string, boolean>>(new Map());
  const [githubChecking, setGithubChecking] = useState<Map<string, boolean>>(new Map());

  const filteredAttachments = useMemo(() => {
    if (!searchQuery.trim()) return attachments;
    const q = searchQuery.toLowerCase();
    return attachments.filter((att) => att.originalFilename.toLowerCase().includes(q));
  }, [attachments, searchQuery]);

  useEffect(() => {
    if (attachments.length === 0) return;

    const syncUrl = localStorage.getItem('mindless-sync-url');
    if (!syncUrl) return;

    const info = parseRepoUrl(syncUrl);
    if (!info) return;

    let cancelled = false;

    (async () => {
      const pat = await api.loadPat(info!.domain);
      if (!pat || cancelled) return;

      const octokit = createOctokit(pat, info!.domain);

      setGithubChecking(new Map(attachments.map((a) => [a.id, true])));

      const BATCH_SIZE = 5;
      for (let i = 0; i < attachments.length; i += BATCH_SIZE) {
        if (cancelled) break;
        const batch = attachments.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (att) => {
            const sha = await getFileSha(octokit, info!.owner, info!.repo, `attachments/${att.filename}`);
            return { id: att.id, exists: !!sha };
          })
        );
        if (cancelled) break;

        setGithubStatus((prev) => {
          const next = new Map(prev);
          for (const r of results) {
            if (r.status === 'fulfilled') {
              next.set(r.value.id, r.value.exists);
            }
          }
          return next;
        });
        setGithubChecking((prev) => {
          const next = new Map(prev);
          for (const att of batch) {
            next.set(att.id, false);
          }
          return next;
        });
      }
    })();

    return () => { cancelled = true; };
  }, [attachments]);

  const handleContextMenu = useCallback((e: React.MouseEvent, att: Attachment) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, att });
  }, []);

  const handleDeleteCache = useCallback((att: Attachment) => {
    deleteLocalCache.mutate(att.id);
  }, [deleteLocalCache]);

  const handleFetchFromGithub = useCallback(async (att: Attachment) => {
    const syncUrl = localStorage.getItem('mindless-sync-url');
    if (!syncUrl) return;

    const info = parseRepoUrl(syncUrl);
    if (!info) return;

    const pat = await api.loadPat(info.domain);
    if (!pat) return;

    try {
      const octokit = createOctokit(pat, info.domain);
      const res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: info.owner,
        repo: info.repo,
        path: `attachments/${att.filename}`,
      });
      if (!Array.isArray(res.data) && res.data.type === 'file' && 'content' in res.data) {
        const fileContent = (res.data as { content?: string }).content;
        if (fileContent) {
          const bytes = Uint8Array.from(atob(fileContent), (c) => c.charCodeAt(0));
          await api.cacheAttachmentImage({
            fileBytes: Array.from(bytes),
            filename: att.filename,
            id: att.id,
          });
          queryClient.invalidateQueries({ queryKey: ['all-attachments'] });
        }
      }
    } catch (err) {
      console.error('Failed to fetch attachment from GitHub:', err);
    }
  }, [queryClient]);

  const handleRename = useCallback((id: string, newName: string) => {
    updateFilename.mutate({ id, originalFilename: newName });
  }, [updateFilename]);

  if (isLoading) {
    return (
      <OverlayWebviewWindow closable={false}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        </div>
      </OverlayWebviewWindow>
    );
  }

  return (
    <OverlayWebviewWindow closable={false}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div data-tauri-drag-region className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className='flex items-center gap-1.5 h-8' aria-label='window-controls'>
              <button
                onClick={() => getCurrentWindow().close()}
                className="w-3 h-3 rounded-full bg-[#898989] hover:bg-[#FF3B30] transition-colors group relative"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-2.5 h-2.5 m-auto opacity-0 group-hover:opacity-100">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              type="text"
              placeholder={t('attachment_mgmt.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Attachment list */}
        <div className="flex-1 overflow-auto">
          {filteredAttachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 px-3">
              <DocumentIcon className="w-8 h-8 mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-center">
                {searchQuery ? t('common.empty') : t('attachment_mgmt.no_attachments')}
              </p>
            </div>
          ) : (
            <div>
              {filteredAttachments.map((att) => (
                <AttachmentRow
                  key={att.id}
                  attachment={att}
                  githubExists={githubStatus.get(att.id) ?? null}
                  githubChecking={githubChecking.get(att.id) ?? false}
                  onContextMenu={handleContextMenu}
                  onRename={handleRename}
                />
              ))}
            </div>
          )}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <CacheContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            attachment={contextMenu.att}
            onClose={() => setContextMenu(null)}
            onDeleteCache={handleDeleteCache}
            onFetchFromGithub={handleFetchFromGithub}
          />
        )}
      </div>
    </OverlayWebviewWindow>
  );
}

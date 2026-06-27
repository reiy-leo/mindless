import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Phone, Mail, User, ExternalLink, Check } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import DropdownWithCustom from './DropdownWithCustom';
import type { PhoneEntry, EmailEntry } from '@/types/person';

type EntryType = 'phone' | 'email' | 'other_name' | 'watch_link';

interface PhoneEmailListEditorProps {
  type: EntryType;
  entries: PhoneEntry[] | EmailEntry[];
  onChange: (entries: PhoneEntry[] | EmailEntry[]) => void;
  showAddForm?: boolean;
  setShowAddForm?: (show: boolean) => void;
  labelPresets?: string[];
  displayMode?: 'list' | 'grid';
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function PhoneEmailListEditor({ type, entries, onChange, showAddForm: externalShow, setShowAddForm: externalSetShow, labelPresets, displayMode = 'list' }: PhoneEmailListEditorProps) {
  const [internalShow, setInternalShow] = useState(false);
  const showAddForm = externalShow ?? internalShow;
  const setShowAddForm = externalSetShow ?? setInternalShow;
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newNote, setNewNote] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

  const Icon = type === 'phone' ? Phone : type === 'email' ? Mail : User;
  const placeholder = type === 'phone' ? '输入手机号' : type === 'email' ? '输入邮箱地址' : type === 'watch_link' ? '输入观看链接' : '输入别名或昵称';

  const defaultLabel = type === 'phone' ? '手机' : type === 'email' ? '邮箱' : type === 'watch_link' ? '在线观看' : '别名';
  const currentLabel = newLabel || defaultLabel;

  useEffect(() => {
    if (showAddForm && valueInputRef.current) {
      valueInputRef.current.focus();
    }
  }, [showAddForm]);

  useEffect(() => {
    if (!showAddForm) {
      setNewLabel('');
      setNewNote('');
    }
  }, [showAddForm]);

  const handleAdd = () => {
    if (!newValue.trim()) return;
    
    const newEntry = {
      id: generateId(),
      label: currentLabel,
      value: newValue.trim(),
      note: newNote.trim(),
    };

    onChange([...entries, newEntry as any]);
    setNewValue('');
    setNewLabel('');
    setNewNote('');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setShowAddForm(false);
      setNewValue('');
      setNewLabel('');
      setNewNote('');
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      await openUrl(url);
    } catch (e) {
      console.error('Failed to open link:', e);
      window.open(url, '_blank');
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const isLinkType = type === 'watch_link';
  const showLabelSelect = type === 'other_name' && labelPresets && labelPresets.length > 0;

  return (
    <div className="space-y-2">
      {showAddForm && (
        <div className="flex items-center gap-2">
          <input
            ref={valueInputRef}
            type={type === 'email' ? 'email' : type === 'watch_link' ? 'url' : type === 'other_name' ? 'text' : 'tel'}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {showLabelSelect ? (
            <DropdownWithCustom
              value={newLabel}
              onChange={setNewLabel}
              presets={labelPresets!}
              placeholder="选择标签"
              openUpward={true}
              className="flex-1"
            />
          ) : (
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="备注（可选）"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newValue.trim()}
            className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {displayMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded group"
            >
              {isLinkType ? (
                <button
                  type="button"
                  onClick={() => handleOpenLink(entry.value)}
                  className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex-1 truncate flex items-center gap-1 text-left min-w-0"
                >
                  {entry.note || entry.value}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </button>
              ) : type === 'other_name' ? (
                <button
                  type="button"
                  onClick={() => handleCopy(entry.id, entry.value)}
                  className="text-sm text-gray-900 dark:text-gray-100 hover:text-blue-500 dark:hover:text-blue-400 flex-1 truncate text-left min-w-0 flex items-center gap-1"
                >
                  {entry.value}
                  {copiedId === entry.id ? (
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : null}
                </button>
              ) : (
                <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 truncate min-w-0">
                  {entry.value}
                </span>
              )}
              {!isLinkType && entry.label && entry.label !== defaultLabel && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {entry.label}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(entry.id)}
                className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="flex items-center gap-2 group">
            <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            {isLinkType ? (
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                {entry.note && (
                  <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                    {entry.note}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenLink(entry.value)}
                  className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 truncate flex items-center gap-0.5 flex-shrink-0"
                >
                  {entry.note ? '链接' : entry.value}
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 truncate">
                {entry.value}
              </span>
            )}
            {!isLinkType && entry.label && entry.label !== defaultLabel && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                {entry.label}
              </span>
            )}
            {!isLinkType && entry.label === defaultLabel && entry.note && (
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                ({entry.note})
              </span>
            )}
            <button
              type="button"
              onClick={() => handleDelete(entry.id)}
              className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { PlusIcon, TrashIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import type { PhoneEntry, EmailEntry } from '@/types/person';

type EntryType = 'phone' | 'email' | 'other_name';

interface PhoneEmailListEditorProps {
  type: EntryType;
  entries: PhoneEntry[] | EmailEntry[];
  onChange: (entries: PhoneEntry[] | EmailEntry[]) => void;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function PhoneEmailListEditor({ type, entries, onChange }: PhoneEmailListEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newNote, setNewNote] = useState('');
  const valueInputRef = useRef<HTMLInputElement>(null);

  const Icon = type === 'phone' ? PhoneIcon : EnvelopeIcon;
  const placeholder = type === 'phone' ? '输入手机号' : type === 'email' ? '输入邮箱地址' : '输入别名或昵称';

  useEffect(() => {
    if (showAddForm && valueInputRef.current) {
      valueInputRef.current.focus();
    }
  }, [showAddForm]);

  const handleAdd = () => {
    if (!newValue.trim()) return;
    
    const newEntry = {
      id: generateId(),
      label: type === 'phone' ? '手机' : type === 'email' ? '邮箱' : '别名',
      value: newValue.trim(),
      note: newNote.trim(),
    };

    onChange([...entries, newEntry as any]);
    setNewValue('');
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
      setNewNote('');
    }
  };

  return (
    <div className="space-y-2">
      {/* 已添加的条目列表 */}
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center gap-2 group">
          <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 truncate">
            {entry.value}
          </span>
          {entry.note && (
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
              ({entry.note})
            </span>
          )}
          <button
            onClick={() => handleDelete(entry.id)}
            className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {/* 添加表单 */}
      {showAddForm ? (
        <div className="flex items-center gap-2">
          <input
            ref={valueInputRef}
            type={type === 'email' ? 'email' : 'tel'}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="备注（可选）"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={!newValue.trim()}
            className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          添加{type === 'phone' ? '手机号' : type === 'email' ? '邮箱' : '别名'}
        </button>
      )}
    </div>
  );
}

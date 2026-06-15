import { useState, useRef, useEffect } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SimpleListEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  showAddForm?: boolean;
  setShowAddForm?: (show: boolean) => void;
}

export default function SimpleListEditor({ items, onChange, placeholder = '输入内容', showAddForm: externalShow, setShowAddForm: externalSetShow }: SimpleListEditorProps) {
  const [internalShow, setInternalShow] = useState(false);
  const showAddForm = externalShow ?? internalShow;
  const setShowAddForm = externalSetShow ?? setInternalShow;
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddForm && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAddForm]);

  const handleAdd = () => {
    if (!value.trim()) return;
    onChange([...items, value.trim()]);
    setValue('');
    setShowAddForm(false);
  };

  const handleDelete = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setShowAddForm(false);
      setValue('');
    }
  };

  return (
    <div className="space-y-2">
      {/* 添加输入框 */}
      {showAddForm && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={!value.trim()}
            className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 已添加的条目列表 */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded group"
            >
              {item}
              <button
                onClick={() => handleDelete(index)}
                className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

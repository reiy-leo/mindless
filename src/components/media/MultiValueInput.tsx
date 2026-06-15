import { useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface MultiValueInputProps {
  value: { name: string; label?: string }[];
  onChange: (value: { name: string; label?: string }[]) => void;
  placeholder?: string;
  showLabel?: boolean;
}

export default function MultiValueInput({
  value,
  onChange,
  placeholder = 'Add item',
  showLabel = false,
}: MultiValueInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [inputLabel, setInputLabel] = useState('');

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    onChange([...value, { name: inputValue, label: inputLabel || undefined }]);
    setInputValue('');
    setInputLabel('');
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {showLabel && (
          <input
            type="text"
            value={inputLabel}
            onChange={(e) => setInputLabel(e.target.value)}
            placeholder="Label"
            className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
          />
        )}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-2 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1">
        {value.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded"
          >
            {showLabel && item.label && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.label}:
              </span>
            )}
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
              {item.name}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

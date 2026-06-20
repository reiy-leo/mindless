import { useState, useEffect, useRef } from 'react';
import EmojiPickerButton from '@/components/EmojiPickerButton';
import Tw22ColorPickerButton from '@/components/Tw22ColorPickerButton';

interface GroupFormPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  triggerRect: DOMRect | null;
  name: string;
  onNameChange: (name: string) => void;
  icon: string;
  onIconChange: (icon: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  namePlaceholder?: string;
  isEditing?: boolean;
  children?: React.ReactNode;
}

export default function GroupFormPopup({
  isOpen,
  onClose,
  onSubmit,
  triggerRect,
  name,
  onNameChange,
  icon,
  onIconChange,
  color,
  onColorChange,
  namePlaceholder = '',
  isEditing = false,
  children,
}: GroupFormPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen || !triggerRect || !popupRef.current) return;

    const popupRect = popupRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 4;
    const popupW = popupRect.width || 280;
    const popupH = popupRect.height || 300;

    let top: number;
    let left: number;

    // Try right side, tightly attached
    if (triggerRect.right + gap + popupW <= vw) {
      left = triggerRect.right + gap;
      top = Math.max(gap, Math.min(triggerRect.top, vh - popupH - gap));
    }
    // Try below, tightly attached
    else if (triggerRect.bottom + gap + popupH <= vh) {
      top = triggerRect.bottom + gap;
      left = Math.max(gap, Math.min(triggerRect.left, vw - popupW - gap));
    }
    // Try above, tightly attached
    else if (triggerRect.top - gap - popupH >= 0) {
      top = triggerRect.top - gap - popupH;
      left = Math.max(gap, Math.min(triggerRect.left, vw - popupW - gap));
    }
    // Fallback: below with whatever space
    else {
      top = triggerRect.bottom + gap;
      left = Math.max(gap, Math.min(triggerRect.left, vw - popupW - gap));
    }

    setPosition({ top, left });
  }, [isOpen, triggerRect]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
      style={{ top: position.top, left: position.left, width: 280 }}
      onKeyDown={handleKeyDown}
    >
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!name.trim()}
            className="px-2.5 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isEditing ? 'Save' : 'Create'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <EmojiPickerButton value={icon} onChange={onIconChange} />
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={namePlaceholder}
            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </div>

        <div>
          <Tw22ColorPickerButton value={color} onChange={onColorChange} />
        </div>

        {children}
      </div>
    </div>
  );
}

import { useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { safeUnlisten } from '@/lib/safeUnlisten';
import { EMOJI_PICKER_LABEL, showOverlay } from '@/lib/overlayManager';
import { getScreenRect } from '@/lib/screenRect';

interface EmojiPickerButtonProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export default function EmojiPickerButton({ value, onChange, className = '' }: EmojiPickerButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const unlisten = listen<{ emoji: string }>('emoji-picker:result', (event) => {
      onChange(event.payload.emoji);
    });
    return safeUnlisten(unlisten);
  }, [onChange]);

  const handleClick = useCallback(async () => {
    window.setTimeout(async () => {
      if (!buttonRef.current) return;

      try {
        const currentWin = getCurrentWindow();
        const currentWinLabel = currentWin.label;

        const rect = await getScreenRect(buttonRef.current);
        const isDark = document.documentElement.classList.contains('dark');
        await showOverlay(EMOJI_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
          anchorH: rect.height,
          anchorX: rect.x,
          anchorY: rect.y,
          parentLabel: currentWinLabel,
          theme: isDark ? 'dark' : 'light',
        });
      } catch (err) {
        console.error('Failed to open emoji picker:', err);
      }
    }, 0);
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        void handleClick();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        void handleClick();
      }}
      className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${className}`}
    >
      {value}
    </button>
  );
}

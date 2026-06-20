import { useEffect, useCallback, useRef } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition } from '@tauri-apps/api/dpi';

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
    return () => {
      unlisten.then(fn => fn());
    };
  }, [onChange]);

  const handleClick = useCallback(async () => {
    if (!buttonRef.current) return;

    try {
      const currentWin = getCurrentWindow();
      const currentWinLabel = currentWin.label;

      const rect = buttonRef.current.getBoundingClientRect();
      const winPos = await currentWin.outerPosition();
      const scaleFactor = await currentWin.scaleFactor();

      const logicalWinX = winPos.x / scaleFactor;
      const logicalWinY = winPos.y / scaleFactor;

      const anchorX = logicalWinX + rect.left;
      const anchorY = logicalWinY + rect.top;
      const anchorH = rect.height;

      const pickerWidth = 270;
      const pickerHeight = 380;

      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;

      let finalY = anchorY + anchorH + 4;
      if (finalY + pickerHeight > screenHeight) {
        finalY = anchorY - pickerHeight - 4;
      }
      if (finalY < 0) finalY = 4;

      let finalX = anchorX;
      if (finalX + pickerWidth > screenWidth) {
        finalX = screenWidth - pickerWidth - 8;
      }
      if (finalX < 0) finalX = 8;

      let win = await WebviewWindow.getByLabel('emoji-picker');

      if (!win) {
        win = new WebviewWindow('emoji-picker', {
          url: `/dialog/emoji-picker?parentLabel=${currentWinLabel}`,
          title: '',
          width: pickerWidth,
          height: pickerHeight,
          x: Math.round(finalX),
          y: Math.round(finalY),
          maximizable: false,
          minimizable: false,
          closable: false,
          resizable: false,
          decorations: true,
          hiddenTitle: true,
          titleBarStyle: "overlay",
          alwaysOnTop: true,
          parent: currentWin,
        });

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Window creation timeout')), 5000);
          win!.once('tauri://created', () => {
            clearTimeout(timeout);
            resolve();
          });
          win!.once('tauri://error', (e) => {
            clearTimeout(timeout);
            reject(e);
          });
        });

        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        await win.setPosition(new LogicalPosition(Math.round(finalX), Math.round(finalY)));
      }

      const isDark = document.documentElement.classList.contains('dark');
      await emit('emoji-picker:show', { theme: isDark ? 'dark' : 'light' });
      await win.show();
      await win.setFocus();
    } catch (err) {
      console.error('Failed to open emoji picker:', err);
    }
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${className}`}
    >
      {value}
    </button>
  );
}

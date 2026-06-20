import { useEffect, useState } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import OverlayWebviewWindow from '@/components/OverlayWebviewWindow';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

export default function EmojiPickerDialogPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [parentLabel, setParentLabel] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const parent = params.get('parentLabel');
    setParentLabel(parent);

    document.documentElement.style.setProperty('background-color', 'transparent', 'important');
    document.body.style.setProperty('background-color', 'transparent', 'important');
  }, []);

  useEffect(() => {
    const unlisten = listen<{ theme: 'light' | 'dark' }>('emoji-picker:show', (event) => {
      if (event.payload.theme) {
        setTheme(event.payload.theme);
      }
    });
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleClose = async () => {
    const win = getCurrentWindow();
    await win.hide();

    if (parentLabel) {
      try {
        const parentWin = await WebviewWindow.getByLabel(parentLabel);
        if (parentWin) {
          await parentWin.setFocus();
        }
      } catch (err) {
        console.error('Failed to focus parent window:', err);
      }
    }
  };

  const handleEmojiClick = async (emojiData: EmojiClickData) => {
    await emit('emoji-picker:result', {
      emoji: emojiData.emoji,
    });
    await handleClose();
  };

  return (
    <OverlayWebviewWindow>
      <div
        className="w-full h-full flex items-center justify-center"
        onClick={async (e) => {
          if (e.target === e.currentTarget) {
            await handleClose();
          }
        }}
      >
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          width={350}
          height={400}
          theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
          skinTonesDisabled
          searchDisabled={false}
          previewConfig={{ showPreview: false }}
        />
      </div>
    </OverlayWebviewWindow>
  );
}

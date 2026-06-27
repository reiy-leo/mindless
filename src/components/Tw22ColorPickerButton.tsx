import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { showOverlay, TW22_COLOR_PICKER_LABEL } from "@/lib/overlayManager";

interface Tw22ColorPickerButtonProps {
  value: string;
  isBadge?: Boolean;
  onChange: (hex: string) => void;
  className?: string;
}

export default function Tw22ColorPickerButton({ isBadge = false, value, onChange, className = "" }: Tw22ColorPickerButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openingRef = useRef(false);

  useEffect(() => {
    const unlisten = listen<{ hex: string }>('tw22-color-picker-overlay:result', (e) => {
      onChange(e.payload.hex);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [onChange]);

  const handleClick = async () => {
    if (!buttonRef.current) return;
    openingRef.current = true;

    const rect = buttonRef.current.getBoundingClientRect();
    const win = getCurrentWindow();
    const winPos = await win.outerPosition();
    const scaleFactor = await win.scaleFactor();
    const anchorX = winPos.x / scaleFactor + rect.left;
    const anchorY = winPos.y / scaleFactor + rect.top;

    await showOverlay(TW22_COLOR_PICKER_LABEL, anchorX, anchorY + rect.height + 4, {
      value,
      anchorX,
      anchorY,
      anchorH: rect.height,
    });

    setTimeout(() => { openingRef.current = false; }, 500);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      className={`border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400 transition-colors ${isBadge ? 'w-3 h-3 rounded-full border-2' : 'w-8 h-8 rounded-lg border-2'} ${className}`}
      style={{ backgroundColor: value }}
    />
  );
}

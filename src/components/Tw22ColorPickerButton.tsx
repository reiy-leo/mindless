import { useState, useRef, useEffect } from "react";
import Tw22ColorPicker from "./Tw22ColorPicker";

interface Tw22ColorPickerButtonProps {
  value: string;
  isBadge: Boolean;
  onChange: (hex: string) => void;
  className?: string;
}

export default function Tw22ColorPickerButton({ isBadge = false, value, onChange, className = "" }: Tw22ColorPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={` border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400 transition-colors ${isBadge ? 'w-3 h-3 rounded-full border-2': 'w-8 h-8 rounded-lg border-2'}`}
        style={{ backgroundColor: value }}
      />
      {open && (
        <div className="absolute z-50 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3">
          <Tw22ColorPicker
            value={value}
            onChange={(hex) => { onChange(hex); setOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { showOverlay, GROUP_FORM_LABEL } from '@/lib/overlayManager';
import { safeUnlisten } from '@/lib/safeUnlisten';

interface GroupFormPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (result: { name: string; icon: string; color: string }) => void;
  onDelete?: () => void;
  triggerRect: DOMRect | null;
  name: string;
  icon: string;
  color: string;
  namePlaceholder?: string;
  isEditing?: boolean;
  showDelete?: boolean;
}

export default function GroupFormPopup({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  triggerRect,
  name,
  icon,
  color,
  namePlaceholder = '',
  isEditing = false,
  showDelete = false,
}: GroupFormPopupProps) {
  const shownRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !triggerRect) return;

    const show = async () => {
      const win = getCurrentWindow();
      const winPos = await win.outerPosition();
      const scaleFactor = await win.scaleFactor();
      const logicalWinX = winPos.x / scaleFactor;
      const logicalWinY = winPos.y / scaleFactor;

      const anchorX = logicalWinX + triggerRect.left;
      const anchorY = logicalWinY + triggerRect.top;

      await showOverlay(GROUP_FORM_LABEL, anchorX, anchorY + triggerRect.height + 4, {
        name,
        icon,
        color,
        namePlaceholder,
        isEditing,
        showDelete,
        anchorX,
        anchorY: anchorY,
        anchorH: triggerRect.height,
      });
      shownRef.current = true;
    };

    show();
  }, [isOpen, triggerRect]);

  useEffect(() => {
    if (!isOpen) return;

    const unlisten = listen<{ action: string; name?: string; icon?: string; color?: string }>(
      'group-form-overlay:result',
      (e) => {
        if (e.payload.action === 'submit' && e.payload.name && e.payload.icon && e.payload.color) {
          onSubmit({ name: e.payload.name, icon: e.payload.icon, color: e.payload.color });
        } else if (e.payload.action === 'delete' && onDelete) {
          onDelete();
        } else {
          onClose();
        }
        shownRef.current = false;
      }
    );

    return safeUnlisten(unlisten);
  }, [isOpen, onSubmit, onClose]);

  return null;
}

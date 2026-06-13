import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition } from '@tauri-apps/api/dpi';

/**
 * Calculates and sets the window position based on anchor element screen coordinates.
 * If there's not enough space below, positions above the anchor.
 */
export function useDialogPosition() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const anchorX = params.get('anchorX');
    const anchorY = params.get('anchorY');
    const anchorH = params.get('anchorH');
    const winW = params.get('winW');
    const winH = params.get('winH');

    if (!anchorX || !anchorY || !anchorH || !winW || !winH) return;

    // These are already screen coordinates (converted in parent)
    const ax = parseFloat(anchorX);
    const ay = parseFloat(anchorY);
    const ah = parseFloat(anchorH);
    const ww = parseFloat(winW);
    const wh = parseFloat(winH);

    // Screen dimensions
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    // Try below first (anchor bottom + small gap)
    let finalY = ay + ah + 4;

    // If not enough space below, show above
    if (finalY + wh > screenHeight) {
      finalY = ay - wh - 4;
    }

    // If still off screen (above), clamp to top
    if (finalY < 0) finalY = 4;

    // X: align with anchor left edge
    let finalX = ax;
    // Ensure doesn't go off right edge
    if (finalX + ww > screenWidth) {
      finalX = screenWidth - ww - 8;
    }
    // Ensure doesn't go off left edge
    if (finalX < 0) finalX = 8;

    const win = getCurrentWindow();
    win.setPosition(new LogicalPosition(Math.round(finalX), Math.round(finalY)));
  }, []);
}

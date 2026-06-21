import { getCurrentWindow } from '@tauri-apps/api/window';

export async function getScreenRect(el: HTMLElement): Promise<{ x: number; y: number; width: number; height: number }> {
    const rect = el.getBoundingClientRect();
    const win = getCurrentWindow();
    const winPos = await win.outerPosition();
    const scaleFactor = await win.scaleFactor();

    const logicalWinX = winPos.x / scaleFactor;
    const logicalWinY = winPos.y / scaleFactor;

    return {
        x: logicalWinX + rect.left,
        y: logicalWinY + rect.top,
        width: rect.width,
        height: rect.height,
    };
}

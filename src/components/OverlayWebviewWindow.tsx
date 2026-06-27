import { type ReactNode } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface OverlayWebviewWindowProps {
  closable?: Boolean;
  overlay?: Boolean;
  children: ReactNode;
}

export default function OverlayWebviewWindow({ closable = false, overlay = false, children }: OverlayWebviewWindowProps) {
  const handleClose = async () => {
    const win = getCurrentWindow();
    if (overlay) {
      await win.hide();
    } else {
      await win.close();
    }
  };

  return (
    <div className="h-screen w-screen bg-transparent">
      <div className="h-full w-full bg-white">

        {closable && (
          <div data-tauri-drag-region className='p-3 flex items-center gap-1.5 h-8' aria-label='window-controls'>
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-[#898989] hover:bg-[#FF3B30] transition-colors group relative"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-2.5 h-2.5 m-auto opacity-0 group-hover:opacity-100">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          )
        }

        <div className="h-full w-full overflow-hidden">
        {children}
        </div>
      </div>
    </div>
  );
}

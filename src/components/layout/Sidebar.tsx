import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  BookmarkIcon,
  CheckSquareIcon,
  CogIcon,
  Film,
  HomeIcon,
  PaperclipIcon,
  HourglassIcon,
  RepeatIcon,
  StickyNote,
  UsersIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { useViewStore } from '@/stores/useViewStore'

const isMac = navigator.userAgent.includes('Mac')

const navItems = [
  { icon: HomeIcon, labelKey: 'navigation.home', path: '/' },
  { icon: CheckSquareIcon, labelKey: 'navigation.tasks', path: '/tasks' },
  { icon: RepeatIcon, labelKey: 'navigation.habits', path: '/habits' },
  { icon: HourglassIcon, labelKey: 'navigation.countdowns', path: '/countdowns' },
  { icon: StickyNote, labelKey: 'navigation.notes', path: '/notes' },
  { icon: UsersIcon, labelKey: 'navigation.people', path: '/people' },
  { icon: Film, labelKey: 'navigation.media', path: '/media' },
  { path: null },
  { icon: BookmarkIcon, labelKey: 'navigation.tags', path: '/tags' },
  { icon: PaperclipIcon, labelKey: 'navigation.attachments', path: '/attachments' },
  { icon: CogIcon, labelKey: 'navigation.settings', path: '/settings' },
]

export default function Sidebar() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const { selectedListId, setSelectedListId } = useViewStore()
  const sidebarMode = useAppStore((s) => s.sidebarMode)

  const handleOpenTagManagement = async () => {
    console.log('handleOpenTagManagement called')

    try {
      const existingWindow = await WebviewWindow.getByLabel('tag-management')
      console.log('existingWindow:', existingWindow)
      if (existingWindow) {
        await existingWindow.setFocus()
        return
      }
    } catch (err) {
      console.log('getByLabel error (expected if window does not exist):', err)
    }

    console.log('Creating new tag-management window')
    const mainWindow = getCurrentWindow()
    const win = new WebviewWindow('tag-management', {
      alwaysOnTop: true,
      closable: false,
      decorations: true,
      height: 640,
      hiddenTitle: true,
      maximizable: false,
      minimizable: false,
      parent: mainWindow,
      resizable: false,
      title: '',
      // transparent: true,
      titleBarStyle: 'overlay',
      url: '/dialog/tag-management',
      width: 640,
    })
    win.once('tauri://error', (e) => {
      console.error('Failed to create tag-management window:', e)
    })

    win.once('tauri://focus', async () => {
      await win.setShadow(true)
      console.log('Tag management window focused')
    })

    win.once('tauri://error', (e) => {
      console.error('Failed to create tag-picker window:', e)
    })

    win.once('tauri://created', () => {
      console.log('Tag picker window created successfully')
    })
  }

  const handleOpenAttachmentManagement = async () => {
    try {
      const existingWindow = await WebviewWindow.getByLabel('attachment-management')
      if (existingWindow) {
        await existingWindow.setFocus()
        return
      }
    } catch {}

    try {
      const mainWindow = getCurrentWindow()
      const win = new WebviewWindow('attachment-management', {
        alwaysOnTop: true,
        closable: false,
        decorations: true,
        height: 560,
        hiddenTitle: true,
        maximizable: false,
        minimizable: false,
        parent: mainWindow,
        resizable: false,
        title: '',
        titleBarStyle: 'overlay',
        url: '/dialog/attachment-management',
        width: 720,
      })
      win.once('tauri://error', (e) => {
        console.error('Failed to create attachment-management window:', e)
      })
      win.once('tauri://focus', async () => {
        await win.setShadow(true)
      })
    } catch (err) {
      console.error('Error creating attachment-management window:', err)
    }
  }

  const handleOpenSettings = async () => {
    try {
      const existingWindow = await WebviewWindow.getByLabel('settings')
      if (existingWindow) {
        await existingWindow.setFocus()
        return
      }
    } catch {}

    try {
      const mainWindow = getCurrentWindow()
      const mainPos = await mainWindow.outerPosition()
      const mainSize = await mainWindow.outerSize()
      const scaleFactor = await mainWindow.scaleFactor()

      const logicalX = mainPos.x / scaleFactor
      const logicalY = mainPos.y / scaleFactor
      const logicalW = mainSize.width / scaleFactor
      const logicalH = mainSize.height / scaleFactor

      const winWidth = 800
      const winHeight = 600
      const x = Math.round(logicalX + (logicalW - winWidth) / 2)
      const y = Math.round(logicalY + (logicalH - winHeight) / 2)

      const win = new WebviewWindow('settings', {
        closable: false,
        decorations: true,
        height: winHeight,
        hiddenTitle: true,
        maximizable: false,
        minimizable: false,
        parent: mainWindow,
        resizable: false,
        title: '',
        titleBarStyle: 'overlay',
        url: '/dialog/settings',
        width: winWidth,
        x,
        y,
        // shadow: true
      })
      win.once('tauri://error', (e) => {
        console.error('Failed to create settings window:', e)
      })
    } catch (err) {
      console.error('Error creating settings window:', err)
    }
  }

  return (
    <div
      className="w-[70px] border-r border-white/10 flex flex-col pb-2 text-white"
      style={{
        background: 'linear-gradient(to top, color-mix(in srgb, var(--theme-color) 50%, white), var(--theme-bg-70))',
      }}
    >
      {isMac && <div className="h-8" data-tauri-drag-region />}
      <nav className="flex flex-col px-1.5 space-y-2 flex-1" style={{ position: 'relative', zIndex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.path === '/tasks' ? location.pathname === '/tasks' : location.pathname === item.path && !selectedListId

          if (item.path === null) {
            return <div className="flex-1" data-tauri-drag-region key="spacer"></div>
          }

          if (!Icon) {
            return null
          }

          const showIcon = sidebarMode === 'icon' || sidebarMode === 'both'
          const showText = sidebarMode === 'text' || sidebarMode === 'both'

          const buttonClass = `flex items-center justify-center gap-1 rounded-lg transition-colors text-sm text-white cursor-pointer aspect-square ${isActive ? 'bg-white/25' : 'hover:bg-white/15'}`

          if (item.path === '/tags') {
            return (
              <button
                type="button"
                className={buttonClass}
                key={item.path}
                onClick={handleOpenTagManagement}
                style={{
                  color: isActive ? `hsl(from var(--theme-color) h s 80)` : `hsl(from var(--theme-color) h s 30)`,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {showIcon && <Icon className="w-5 h-5" />}
                {showText && (
                  <p
                    className={sidebarMode === 'both' ? 'text-[10px]' : sidebarMode === 'text' ? 'text-lg' : 'text-xs'}
                  >
                    {t(item.labelKey)}
                  </p>
                )}
              </button>
            )
          }

          if (item.path === '/attachments') {
            return (
              <button
                type="button"
                className={buttonClass}
                key={item.path}
                onClick={handleOpenAttachmentManagement}
                style={{
                  color: isActive ? `hsl(from var(--theme-color) h s 80)` : `hsl(from var(--theme-color) h s 30)`,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {showIcon && <Icon className="w-5 h-5" />}
                {showText && (
                  <p
                    className={sidebarMode === 'both' ? 'text-[10px]' : sidebarMode === 'text' ? 'text-lg' : 'text-xs'}
                  >
                    {t(item.labelKey)}
                  </p>
                )}
              </button>
            )
          }

          if (item.path === '/settings') {
            return (
              <button
                type="button"
                className={buttonClass}
                key={item.path}
                onClick={handleOpenSettings}
                style={{
                  color: isActive
                    ? `hsl(from var(--theme-color) h s calc(l + 60))`
                    : `hsl(from var(--theme-color) h s calc(l - 20))`,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {showIcon && <Icon className="w-5 h-5" />}
                {showText && (
                  <p
                    className={sidebarMode === 'both' ? 'text-[10px]' : sidebarMode === 'text' ? 'text-lg' : 'text-xs'}
                  >
                    {t(item.labelKey)}
                  </p>
                )}
              </button>
            )
          }

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={buttonClass}
              key={item.path}
              onClick={() => {
                if (item.path !== '/tasks') {
                  setSelectedListId(null)
                }
              }}
              style={{
                color: isActive ? `hsl(from var(--theme-color) h s 150%)` : `hsl(from var(--theme-color) h s 30)`,
              }}
              to={item.path}
            >
              {showIcon && <Icon className="w-5 h-5" />}
              {showText && (
                <p className={sidebarMode === 'both' ? 'text-[10px]' : sidebarMode === 'text' ? 'text-lg' : 'text-xs'}>
                  {t(item.labelKey)}
                </p>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

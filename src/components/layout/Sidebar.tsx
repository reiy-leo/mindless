import { useQueryClient } from '@tanstack/react-query'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  BookmarkIcon,
  CheckSquareIcon,
  ClipboardListIcon,
  CogIcon,
  Film,
  HomeIcon,
  HourglassIcon,
  PaperclipIcon,
  RepeatIcon,
  StickyNote,
  UsersIcon,
} from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'

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
  { icon: ClipboardListIcon, labelKey: 'navigation.templates', path: '/templates' },
  { icon: PaperclipIcon, labelKey: 'navigation.attachments', path: '/attachments' },
  { icon: CogIcon, labelKey: 'navigation.settings', path: '/settings' },
]

export default function Sidebar() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const queryClient = useQueryClient()
  const sidebarMode = useAppStore((s) => s.sidebarMode)

  const tagWinRef = useRef<WebviewWindow | null>(null)
  const templateWinRef = useRef<WebviewWindow | null>(null)
  const attachmentWinRef = useRef<WebviewWindow | null>(null)
  const settingsWinRef = useRef<WebviewWindow | null>(null)

  const handleOpenTagManagement = async () => {
    if (tagWinRef.current) {
      try {
        await tagWinRef.current.setFocus()
        return
      } catch {
        tagWinRef.current = null
      }
    }

    try {
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
        titleBarStyle: 'overlay',
        url: '/dialog/tag-management',
        width: 640,
      })
      tagWinRef.current = win
      win.once('tauri://error', () => {
        tagWinRef.current = null
      })
      win.once('tauri://destroyed', () => {
        tagWinRef.current = null
      })
    } catch (err) {
      console.error('Error creating tag-management window:', err)
    }
  }

  const handleOpenTemplateManagement = async () => {
    if (templateWinRef.current) {
      try {
        await templateWinRef.current.setFocus()
        return
      } catch {
        templateWinRef.current = null
      }
    }

    try {
      const mainWindow = getCurrentWindow()
      const win = new WebviewWindow('task-template-management', {
        alwaysOnTop: true,
        closable: false,
        decorations: true,
        height: 500,
        hiddenTitle: true,
        maximizable: false,
        minimizable: false,
        parent: mainWindow,
        resizable: false,
        title: '',
        titleBarStyle: 'overlay',
        url: '/dialog/task-template-management',
        width: 640,
      })
      templateWinRef.current = win
      win.once('tauri://error', () => {
        templateWinRef.current = null
      })
      win.once('tauri://destroyed', () => {
        templateWinRef.current = null
        queryClient.invalidateQueries({ queryKey: ['task-templates'] })
      })
    } catch (err) {
      console.error('Error creating task-template-management window:', err)
    }
  }

  const handleOpenAttachmentManagement = async () => {
    if (attachmentWinRef.current) {
      try {
        await attachmentWinRef.current.setFocus()
        return
      } catch {
        attachmentWinRef.current = null
      }
    }

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
      attachmentWinRef.current = win
      win.once('tauri://error', () => {
        attachmentWinRef.current = null
      })
      win.once('tauri://destroyed', () => {
        attachmentWinRef.current = null
      })
    } catch (err) {
      console.error('Error creating attachment-management window:', err)
    }
  }

  const handleOpenSettings = async () => {
    if (settingsWinRef.current) {
      try {
        await settingsWinRef.current.setFocus()
        return
      } catch {
        settingsWinRef.current = null
      }
    }

    const existing = await WebviewWindow.getByLabel('settings').catch(() => null)
    if (existing) {
      settingsWinRef.current = existing
      await existing.setFocus().catch(() => {})
      return
    }

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
      })
      settingsWinRef.current = win
      win
        .once('tauri://error', () => {
          settingsWinRef.current = null
        })
        .catch(() => {})
      win
        .once('tauri://destroyed', () => {
          settingsWinRef.current = null
        })
        .catch(() => {})
    } catch (err) {
      console.error('Error creating settings window:', err)
    }
  }

  return (
    <div
      className="w-17.5 border-r border-white/10 flex flex-col pb-2 text-white bg-theme-sidebar dark:bg-theme-sidebar-dark"
      // style={{
      //   background: 'linear-gradient(to top, color-mix(in srgb, var(--theme-color) 50%, white), var(--theme-bg-70))',
      // }}
    >
      {isMac && <div className="h-8" data-tauri-drag-region />}
      <nav className="flex flex-col px-1.5 space-y-2 flex-1" style={{ position: 'relative', zIndex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          if (item.path === null) {
            return <div className="flex-1" data-tauri-drag-region key="spacer"></div>
          }

          if (!Icon) {
            return null
          }

          const showIcon = sidebarMode === 'icon' || sidebarMode === 'both'
          const showText = sidebarMode === 'text' || sidebarMode === 'both'

          const buttonClass = `flex items-center justify-center gap-1 rounded-lg transition-colors text-sm cursor-pointer py-3 ${isActive ? 'text-theme-50 dark:text-theme-200 bg-theme-200/50 dark:bg-theme-200/50' : 'hover:text-theme-100 hover:bg-theme-200/40 text-theme-700 dark:text-theme-300'}`

          if (item.path === '/tags') {
            return (
              <button
                type="button"
                className={buttonClass}
                key={item.path}
                onClick={handleOpenTagManagement}
                style={{
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

          if (item.path === '/templates') {
            return (
              <button
                type="button"
                className={buttonClass}
                key={item.path}
                onClick={handleOpenTemplateManagement}
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
            <Link aria-current={isActive ? 'page' : undefined} className={buttonClass} key={item.path} to={item.path}>
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

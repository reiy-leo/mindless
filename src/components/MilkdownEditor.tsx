import { EditorView } from '@codemirror/view'
import { Crepe } from '@milkdown/crepe'
import { editorViewCtx } from '@milkdown/kit/core'
import { getMarkdown, replaceAll } from '@milkdown/kit/utils'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

function getSystemTheme(): 'light' | 'dark' {
  const root = document.documentElement
  if (root.classList.contains('dark')) return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const lightVars: Record<string, string> = {
  '--crepe-color-background': '#ffffff',
  '--crepe-color-on-background': '#000000',
  '--crepe-color-surface': '#f7f7f7',
  '--crepe-color-surface-low': '#ededed',
  '--crepe-color-on-surface': '#1c1c1c',
  '--crepe-color-on-surface-variant': '#4d4d4d',
  '--crepe-color-outline': '#a8a8a8',
  '--crepe-color-primary': '#333333',
  '--crepe-color-secondary': '#cfcfcf',
  '--crepe-color-on-secondary': '#000000',
  '--crepe-color-inverse': '#f0f0f0',
  '--crepe-color-on-inverse': '#1a1a1a',
  '--crepe-color-inline-code': '#ba1a1a',
  '--crepe-color-error': '#ba1a1a',
  '--crepe-color-hover': '#e0e0e0',
  '--crepe-color-selected': '#d5d5d5',
  '--crepe-color-inline-area': '#cacaca',
}

const darkVars: Record<string, string> = {
  '--crepe-color-background': '#14120e',
  '--crepe-color-on-background': '#ede0d4',
  '--crepe-color-surface': '#18120b',
  '--crepe-color-surface-low': '#201b13',
  '--crepe-color-on-surface': '#ede0d4',
  '--crepe-color-on-surface-variant': '#d3c4b4',
  '--crepe-color-outline': '#a89a8c',
  '--crepe-color-primary': '#ede0d4',
  '--crepe-color-secondary': '#524439',
  '--crepe-color-on-secondary': '#ede0d4',
  '--crepe-color-inverse': '#362f27',
  '--crepe-color-on-inverse': '#ede0d4',
  '--crepe-color-inline-code': '#ffb4ab',
  '--crepe-color-error': '#ffb4ab',
  '--crepe-color-hover': '#24201a',
  '--crepe-color-selected': '#362f27',
  '--crepe-color-inline-area': '#3d362c',
}

function applyCrepeTheme(isDark: boolean) {
  const root = document.querySelector('.milkdown') as HTMLElement
  if (!root) return
  const vars = isDark ? darkVars : lightVars
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

interface MilkdownEditorInnerProps {
  isDark: boolean
  markdown: string
  onChange: (markdown: string) => void
  placeholder?: string
}

function MilkdownEditorInner({ markdown, onChange, placeholder, isDark }: MilkdownEditorInnerProps) {
  const prevMarkdownRef = useRef<string>(markdown)
  const updatingRef = useRef(false)
  const initializedRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const getRef = useRef<(() => any) | null>(null)

  const triggerChangeRef = useRef(() => {
    if (updatingRef.current) return
    const instance = getRef.current?.()
    if (!instance) return
    const md = instance.action(getMarkdown())
    const trimmedMd = md.trim()
    if (trimmedMd !== prevMarkdownRef.current) {
      prevMarkdownRef.current = trimmedMd
      onChangeRef.current(trimmedMd)
    }
  })

  const { loading, get } = useEditor((root) => {
    return new Crepe({
      defaultValue: markdown,
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: placeholder || '',
        },
        [Crepe.Feature.ImageBlock]: {
          blockUploadButton: '',
          blockUploadPlaceholderText: '',
          inlineUploadButton: '',
          onUpload: async (_) => {
            alert('暂不支持上传本地图片，请使用图片链接。')
            return ''
          },
        },
        [Crepe.Feature.CodeMirror]: {
          copyText: ' ',
          extensions: [
            EditorView.lineWrapping,
            isDark ? githubDark : githubLight,
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                setTimeout(() => triggerChangeRef.current(), 0)
              }
            }),
          ],
          previewOnlyByDefault: true,
        },
      },
      features: {
        [Crepe.Feature.Latex]: true,
        [Crepe.Feature.AI]: false,
      },
      root,
    })
  }, [])

  useEffect(() => {
    getRef.current = get
  }, [get])

  useEffect(() => {
    if (loading) return
    applyCrepeTheme(isDark)
  }, [loading, isDark])

  useEffect(() => {
    if (loading) {
      return
    }
    const instance = get()
    if (!instance) {
      return
    }

    if (!initializedRef.current) {
      initializedRef.current = true
      prevMarkdownRef.current = markdown
      return
    }

    if (markdown === prevMarkdownRef.current) {
      return
    }

    const currentMarkdown = instance.action(getMarkdown())
    if (currentMarkdown === markdown) {
      return
    }

    updatingRef.current = true
    instance.action(replaceAll(markdown, true))
    prevMarkdownRef.current = markdown
    setTimeout(() => {
      updatingRef.current = false
    }, 0)
  }, [markdown, loading, get])

  useEffect(() => {
    if (loading) {
      return
    }
    const instance = get()
    if (!instance) {
      return
    }

    const view = instance.action((ctx) => {
      return ctx.get(editorViewCtx)
    })
    if (!view) {
      return
    }

    const handleInput = () => {
      triggerChangeRef.current()
    }

    const handlePaste = () => {
      setTimeout(() => triggerChangeRef.current(), 50)
    }

    view.dom.addEventListener('input', handleInput)
    view.dom.addEventListener('paste', handlePaste)
    return () => {
      view.dom.removeEventListener('input', handleInput)
      view.dom.removeEventListener('paste', handlePaste)
    }
  }, [loading, get, onChange])

  return <Milkdown />
}

interface MilkdownEditorProps {
  markdown: string
  onChange: (markdown: string) => void
  placeholder?: ReactNode
}

export default function MilkdownEditor({ markdown, onChange, placeholder }: MilkdownEditorProps) {
  const theme = useAppStore((s) => s.theme)
  const [isDark, setIsDark] = useState(() => getSystemTheme() === 'dark')

  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      setIsDark(mq.matches)
      const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      setIsDark(theme === 'dark')
    }
  }, [theme])

  useEffect(() => {
    applyCrepeTheme(isDark)
  }, [isDark])

  return (
    <div className="text-sm">
      <MilkdownProvider key={isDark ? 'dark' : 'light'}>
        <MilkdownEditorInner
          isDark={isDark}
          markdown={markdown}
          onChange={onChange}
          placeholder={typeof placeholder === 'string' ? placeholder : undefined}
        />
      </MilkdownProvider>
    </div>
  )
}

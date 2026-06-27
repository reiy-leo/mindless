import { EditorView } from '@codemirror/view'
import { Crepe } from '@milkdown/crepe'
import { editorViewCtx } from '@milkdown/kit/core'
import { getMarkdown, replaceAll } from '@milkdown/kit/utils'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/stores/useAppStore'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import '@milkdown/crepe/theme/frame-dark.css'


interface MilkdownEditorInnerProps {
  isDark: boolean
  markdown: string
  onChange: (markdown: string) => void
  placeholder?: string
}

function MilkdownEditorInner({ markdown, onChange, placeholder, isDark }: MilkdownEditorInnerProps) {
  const { t } = useTranslation('common')
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
            alert(t('editor.image_upload_not_supported'))
            return ''
          },
        },
        [Crepe.Feature.CodeMirror]: {
          copyText: ' ',
          extensions: [
            EditorView.lineWrapping,
            isDark ? githubDark : githubLight,
            // EditorView.updateListener.of((update) => {
            //   if (update.docChanged) {
            //     setTimeout(() => triggerChangeRef.current(), 0)
            //   }
            // }),
          ],
        },
      },
      features: {
        [Crepe.Feature.Latex]: true,
        [Crepe.Feature.LinkTooltip]: true,
        [Crepe.Feature.AI]: false,
      },
      root,
    })
  }, [])

  useEffect(() => {
    getRef.current = get
  }, [get])

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

    // const handleInput = () => {
    //   triggerChangeRef.current()
    // }

    const handlePaste = () => {
      setTimeout(() => triggerChangeRef.current(), 50)
    }

    const handleBlur = () => {
      view.dispatch(view.state.tr)
    }

    // view.dom.addEventListener('input', handleInput)
    view.dom.addEventListener('paste', handlePaste)
    view.dom.addEventListener('blur', handleBlur)
    return () => {
      // view.dom.removeEventListener('input', handleInput)
      view.dom.removeEventListener('paste', handlePaste)
      view.dom.removeEventListener('blur', handleBlur)
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
  const [isDark, setIsDark] = useState(theme === 'dark')

  useEffect(() => {
    if (theme === 'system') {
      // 这段代码不要动，不是用prefers-color-scheme
      setIsDark(document.documentElement.classList.contains('dark'))
    } else {
      setIsDark(theme === 'dark')
    }
  }, [theme])

  return (
    <div className='text-sm text-theme-900 dark:text-theme-100'>
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

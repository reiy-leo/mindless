import { EditorView } from '@codemirror/view'
import { Crepe } from '@milkdown/crepe'
import { editorViewCtx, schemaCtx } from '@milkdown/kit/core'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import { $inputRule, getMarkdown, replaceAll } from '@milkdown/kit/utils'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/stores/useAppStore'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import '@milkdown/crepe/theme/frame-dark.css'

const linkInputRule = $inputRule((ctx) => {
  const linkMarkType = ctx.get(schemaCtx).marks.link
  return new InputRule(/\[([^\]]+)\]\(([^)]+)\)/, (state, match, start, end) => {
    const [, text, href] = match
    if (!text || !href) return null
    const { tr } = state
    const linkMark = linkMarkType.create({ href, title: null })
    tr.replaceWith(start, end, state.schema.text(text, [linkMark]))
    return tr
  })
})

const highlightInputRule = $inputRule((ctx) => {
  const linkMarkType = ctx.get(schemaCtx).marks.link
  return new InputRule(/::((?!::).)+::/, (state, match, start, end) => {
    const [, text] = match
    if (!text) return null
    const { tr } = state
    tr.addMark(start, end, state.schema.text(text, []))
    const linkMark = linkMarkType.create({ href, title: null })
    tr.replaceWith(start, end, state.schema.text(text, [<span></span>]))
    return tr
  })
})

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
    const crepe = new Crepe({
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
          extensions: [EditorView.lineWrapping, isDark ? githubDark : githubLight],
        },
      },
      features: {
        [Crepe.Feature.Latex]: true,
        [Crepe.Feature.LinkTooltip]: true,
        [Crepe.Feature.AI]: false,
      },
      root,
    })
    crepe.editor.use(linkInputRule)
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, md) => {
        if (updatingRef.current) return
        const trimmed = md.trim()
        if (trimmed !== prevMarkdownRef.current) {
          prevMarkdownRef.current = trimmed
          onChangeRef.current(trimmed)
        }
      })
    })
    return crepe
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

    const handlePaste = () => {
      setTimeout(() => triggerChangeRef.current(), 50)
    }

    const handleBlur = () => {
      view.dispatch(view.state.tr)
    }

    view.dom.addEventListener('paste', handlePaste)
    view.dom.addEventListener('blur', handleBlur)
    return () => {
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
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (theme === 'system') {
      // 这段代码不要动，不是用prefers-color-scheme
      setIsDark(document.documentElement.classList.contains('dark'))
    } else {
      setIsDark(theme === 'dark')
    }
  }, [theme])

  return (
    <div className="text-sm text-theme-900 dark:text-theme-100">
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

import { Crepe } from '@milkdown/crepe'
import { editorViewCtx, schemaCtx } from '@milkdown/kit/core'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import { $inputRule, getMarkdown, replaceAll } from '@milkdown/kit/utils'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useEffect, useRef } from 'react'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import '@milkdown/crepe/theme/frame-dark.css'

const linkInputRule = $inputRule((ctx) => {
  const linkMarkType = ctx.get(schemaCtx).marks.link
  return new InputRule(
    /\[([^\]]+)\]\(([^)]+)\)$/,
    (state, match, start, end) => {
      const [, text, href] = match
      if (!text || !href) return null
      const { tr } = state
      const linkMark = linkMarkType.create({ href, title: null })
      tr.replaceWith(start, end, state.schema.text(text, [linkMark]))
      return tr
    },
  )
})

interface MilkdownStepEditorInnerProps {
  markdown: string
  onBlur?: () => void
  onChange: (markdown: string) => void
  onKeyDown?: (e: KeyboardEvent) => void
  placeholder?: string
}

function MilkdownStepEditorInner({ markdown, onChange, onKeyDown, onBlur, placeholder }: MilkdownStepEditorInnerProps) {
  const prevMarkdownRef = useRef<string>(markdown)
  const updatingRef = useRef(false)
  const initializedRef = useRef(false)

  const { loading, get } = useEditor((root) => {
    const crepe = new Crepe({
      defaultValue: markdown,
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: placeholder || '',
        },
      },
      features: {
        [Crepe.Feature.CodeMirror]: false,
        [Crepe.Feature.ListItem]: false,
        [Crepe.Feature.LinkTooltip]: true,
        [Crepe.Feature.Cursor]: false,
        [Crepe.Feature.ImageBlock]: false,
        [Crepe.Feature.BlockEdit]: false,
        [Crepe.Feature.Toolbar]: true,
        [Crepe.Feature.Table]: false,
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.TopBar]: false,
        [Crepe.Feature.AI]: false,
      },
      root,
    })
    crepe.editor.use(linkInputRule)
    return crepe
  }, [])

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
      if (updatingRef.current) {
        return
      }
      const md = instance.action(getMarkdown())
      const trimmedMd = md.trim()
      if (trimmedMd !== prevMarkdownRef.current) {
        prevMarkdownRef.current = trimmedMd
        onChange(trimmedMd)
      }
    }

    const handleKeyDown = (e: Event) => {
      if (onKeyDown && e instanceof KeyboardEvent) {
        onKeyDown(e)
      }
    }

    const handleBlur = () => {
      if (onBlur) {
        onBlur()
      }
    }

    const handlePaste = () => {
      setTimeout(() => {
        if (updatingRef.current) {
          return
        }
        const md = instance.action(getMarkdown())
        const trimmedMd = md.trim()
        if (trimmedMd !== prevMarkdownRef.current) {
          prevMarkdownRef.current = trimmedMd
          onChange(trimmedMd)
        }
      }, 50)
    }

    view.dom.addEventListener('input', handleInput)
    view.dom.addEventListener('paste', handlePaste)
    view.dom.addEventListener('keydown', handleKeyDown)
    view.dom.addEventListener('blur', handleBlur)

    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      if (link && link.href) {
        e.preventDefault()
        e.stopPropagation()
        try {
          await openUrl(link.href)
        } catch (err) {
          console.error('Failed to open link:', err)
        }
      }
    }
    view.dom.addEventListener('click', handleClick)

    return () => {
      view.dom.removeEventListener('input', handleInput)
      view.dom.removeEventListener('paste', handlePaste)
      view.dom.removeEventListener('keydown', handleKeyDown)
      view.dom.removeEventListener('blur', handleBlur)
      view.dom.removeEventListener('click', handleClick)
    }
  }, [loading, get, onChange, onKeyDown, onBlur])

  return <Milkdown />
}

interface MilkdownStepEditorProps {
  markdown: string
  onBlur?: () => void
  onChange: (markdown: string) => void
  onKeyDown?: (e: KeyboardEvent) => void
  placeholder?: string
}

export default function MilkdownStepEditor({
  markdown,
  onChange,
  onKeyDown,
  onBlur,
  placeholder,
}: MilkdownStepEditorProps) {
  return (
    <div className="text-sm text-theme-800 dark:text-theme-100">
      <MilkdownProvider>
        <MilkdownStepEditorInner
          markdown={markdown}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={placeholder}
        />
      </MilkdownProvider>
    </div>
  )
}

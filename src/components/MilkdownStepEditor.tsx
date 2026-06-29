import { Crepe } from '@milkdown/crepe'
import { editorViewCtx, schemaCtx } from '@milkdown/kit/core'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import { Plugin } from '@milkdown/kit/prose/state'
import { $inputRule, $prose, getMarkdown, replaceAll } from '@milkdown/kit/utils'
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

function sanitizeStepMarkdown(markdown: string) {
  const lines = markdown.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const nextLine = lines[i + 1]
    const withoutImage = line.replace(/!\[[^\]]*]\([^)]*\)/g, '').trim()
    if (!withoutImage) {
      continue
    }
    const atxHeading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/)

    if (atxHeading?.[2]) {
      result.push(atxHeading[2])
      continue
    }

    if (nextLine && /^(=+|-+)\s*$/.test(nextLine) && line.trim()) {
      result.push(line)
      i += 1
      continue
    }

    result.push(withoutImage)
  }

  return result.join('\n')
}

function clipboardHasAsset(event: { clipboardData?: DataTransfer | null }) {
  const data = event.clipboardData
  if (!data) {
    return false
  }

  if (data.files.length > 0) {
    return true
  }

  if ([...data.items].some((item) => item.kind === 'file')) {
    return true
  }

  const html = data.getData('text/html')
  const text = data.getData('text/plain')
  const uri = data.getData('text/uri-list')
  return /<img\b/i.test(html) || /(^|\s)blob:/.test(text) || /(^|\s)blob:/.test(uri) || /!\[[^\]]*]\([^)]*\)/.test(text)
}

const stepEditorRestrictions = $prose(() => {
  return new Plugin({
    filterTransaction: (tr) => {
      if (!tr.docChanged) {
        return true
      }

      let hasHeading = false
      let hasAsset = false
      tr.doc.descendants((node) => {
        if (node.type.name === 'heading') {
          hasHeading = true
          return false
        }
        if (node.type.name === 'image' || node.type.name === 'image-block') {
          hasAsset = true
          return false
        }
        return true
      })

      return !hasHeading && !hasAsset
    },
    props: {
      handlePaste: (_view, event) => {
        if (!(event instanceof ClipboardEvent) || !clipboardHasAsset(event)) {
          return false
        }

        event.preventDefault()
        return true
      },
    },
  })
})

interface MilkdownStepEditorInnerProps {
  markdown: string
  onBlur?: () => void
  onChange: (markdown: string) => void
  onFocus?: () => void
  onKeyDown?: (e: KeyboardEvent) => void
  placeholder?: string
}

function MilkdownStepEditorInner({
  markdown,
  onChange,
  onKeyDown,
  onBlur,
  onFocus,
  placeholder,
}: MilkdownStepEditorInnerProps) {
  const initialMarkdown = sanitizeStepMarkdown(markdown)
  const prevMarkdownRef = useRef<string>(initialMarkdown)
  const updatingRef = useRef(false)
  const initializedRef = useRef(false)

  const { loading, get } = useEditor((root) => {
    const crepe = new Crepe({
      defaultValue: initialMarkdown,
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
    crepe.editor.use(linkInputRule).use(stepEditorRestrictions)
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
    const nextMarkdown = sanitizeStepMarkdown(markdown)

    if (!initializedRef.current) {
      initializedRef.current = true
      prevMarkdownRef.current = nextMarkdown
      return
    }

    if (nextMarkdown === prevMarkdownRef.current) {
      return
    }

    const currentMarkdown = instance.action(getMarkdown())
    if (currentMarkdown === nextMarkdown) {
      return
    }

    updatingRef.current = true
    instance.action(replaceAll(nextMarkdown, true))
    prevMarkdownRef.current = nextMarkdown
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
      const trimmedMd = sanitizeStepMarkdown(md).trim()
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

    const handleFocus = () => {
      onFocus?.()
    }

    const handlePaste = (event: Event) => {
      if (event instanceof ClipboardEvent && clipboardHasAsset(event)) {
        event.preventDefault()
        return
      }

      setTimeout(() => {
        if (updatingRef.current) {
          return
        }
        const md = instance.action(getMarkdown())
        const trimmedMd = sanitizeStepMarkdown(md).trim()
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
    view.dom.addEventListener('focus', handleFocus)

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
      view.dom.removeEventListener('focus', handleFocus)
      view.dom.removeEventListener('click', handleClick)
    }
  }, [loading, get, onChange, onKeyDown, onBlur, onFocus])

  return <Milkdown />
}

interface MilkdownStepEditorProps {
  isToolbarActive?: boolean
  markdown: string
  onBlur?: () => void
  onChange: (markdown: string) => void
  onFocus?: () => void
  onKeyDown?: (e: KeyboardEvent) => void
  placeholder?: string
}

export default function MilkdownStepEditor({
  isToolbarActive = false,
  markdown,
  onChange,
  onFocus,
  onKeyDown,
  onBlur,
  placeholder,
}: MilkdownStepEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  const handlePasteCapture = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!clipboardHasAsset(event)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
  }

  const handleBlur = () => {
    setTimeout(() => {
      if (rootRef.current?.contains(document.activeElement)) {
        return
      }
      onBlur?.()
    }, 0)
  }

  return (
    <div
      className="text-sm text-theme-800 dark:text-theme-100"
      data-step-toolbar-active={isToolbarActive ? 'true' : 'false'}
      onBlurCapture={handleBlur}
      onPasteCapture={handlePasteCapture}
      ref={rootRef}
    >
      <MilkdownProvider>
        <MilkdownStepEditorInner
          markdown={markdown}
          onChange={onChange}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
      </MilkdownProvider>
    </div>
  )
}

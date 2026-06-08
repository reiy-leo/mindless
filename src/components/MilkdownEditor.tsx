import { type ReactNode, useEffect, useRef } from 'react'
import { Crepe } from '@milkdown/crepe'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { getMarkdown, replaceAll } from '@milkdown/kit/utils'
import { editorViewCtx } from '@milkdown/kit/core'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

interface MilkdownEditorInnerProps {
  markdown: string
  onChange: (markdown: string) => void
  placeholder?: string
}

function MilkdownEditorInner({ markdown, onChange, placeholder }: MilkdownEditorInnerProps) {
  const prevMarkdownRef = useRef<string>('')
  const updatingRef = useRef(false)

  const { loading, get } = useEditor((root) => {
    return new Crepe({
      root,
      defaultValue: markdown,
      features: {
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.AI]: false,
      },
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: placeholder || '',
        },
      },
    })
  })

  useEffect(() => {
    if (loading) return
    const instance = get()
    if (!instance) return

    const currentMarkdown = instance.action(getMarkdown())
    if (currentMarkdown === markdown) return
    if (updatingRef.current) return

    updatingRef.current = true
    instance.action(replaceAll(markdown, true))
    prevMarkdownRef.current = markdown
    setTimeout(() => {
      updatingRef.current = false
    }, 0)
  }, [markdown, loading, get])

  useEffect(() => {
    if (loading) return
    const instance = get()
    if (!instance) return

    const view = instance.action((ctx) => {
      return ctx.get(editorViewCtx)
    })
    if (!view) return

    const handleInput = () => {
      if (updatingRef.current) return
      const md = instance.action(getMarkdown())
      if (md !== prevMarkdownRef.current) {
        prevMarkdownRef.current = md
        onChange(md)
      }
    }

    view.dom.addEventListener('input', handleInput)
    return () => {
      view.dom.removeEventListener('input', handleInput)
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
  return (
    <MilkdownProvider>
      <MilkdownEditorInner
        markdown={markdown}
        onChange={onChange}
        placeholder={typeof placeholder === 'string' ? placeholder : undefined}
      />
    </MilkdownProvider>
  )
}

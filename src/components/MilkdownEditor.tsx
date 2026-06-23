import { EditorView } from '@codemirror/view'
import { Crepe } from '@milkdown/crepe'
import { editorViewCtx } from '@milkdown/kit/core'
import { getMarkdown, replaceAll } from '@milkdown/kit/utils'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { type ReactNode, useEffect, useRef } from 'react'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

interface MilkdownEditorInnerProps {
  markdown: string
  onChange: (markdown: string) => void
  placeholder?: string
}

function MilkdownEditorInner({ markdown, onChange, placeholder }: MilkdownEditorInnerProps) {
  const prevMarkdownRef = useRef<string>(markdown)
  const updatingRef = useRef(false)
  const initializedRef = useRef(false)

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
          extensions: [EditorView.lineWrapping],
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
  return (
    <div className="text-sm">
      <MilkdownProvider>
        <MilkdownEditorInner
          markdown={markdown}
          onChange={onChange}
          placeholder={typeof placeholder === 'string' ? placeholder : undefined}
        />
      </MilkdownProvider>
    </div>
  )
}

import { type ReactNode } from 'react'
import { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, linkPlugin, tablePlugin, codeBlockPlugin } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

interface MDXEditorWrapperProps {
  markdown: string
  onChange: (markdown: string) => void
  placeholder?: ReactNode
}

export default function MDXEditorWrapper({ markdown, onChange, placeholder }: MDXEditorWrapperProps) {
  console.log('MDXEditorWrapper rendering with markdown:', markdown)
  
  return (
    <MDXEditor
      markdown={markdown}
      onChange={(md) => {
        console.log('MDXEditor onChange:', md)
        onChange(md)
      }}
      placeholder={placeholder}
      onError={(error) => {
        console.error('MDXEditor error:', error)
      }}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        tablePlugin(),
        codeBlockPlugin()
      ]}
    />
  )
}

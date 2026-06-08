import { type ReactNode } from 'react'
import { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, linkPlugin, tablePlugin, codeBlockPlugin, codeMirrorPlugin, markdownShortcutPlugin } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

interface MDXEditorWrapperProps {
  markdown: string
  onChange: (markdown: string) => void
  placeholder?: ReactNode
}

export default function MDXEditorWrapper({ markdown, onChange, placeholder }: MDXEditorWrapperProps) {
  console.log('[MDXEditor] markdown:', JSON.stringify(markdown?.substring(0, 300)))
  return (
    <MDXEditor
      markdown={markdown}
      onChange={onChange}
      placeholder={placeholder}
      onError={(error) => console.error('[MDXEditor] error:', error)}
      plugins={[
        headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4, 5, 6] }),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
        codeMirrorPlugin({ codeBlockLanguages: { js: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript (React)', css: 'CSS', html: 'HTML', json: 'JSON', python: 'Python', rust: 'Rust', sql: 'SQL', bash: 'Bash', md: 'Markdown' } }),
        markdownShortcutPlugin()
      ]}
    />
  )
}

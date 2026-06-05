import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders Markdown content using react-markdown with GFM support.
 * Supports: headings, bold, italic, links, lists, checkboxes, tables, code blocks.
 */
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Task list checkboxes
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-1.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },
          // Links open in new tab (external)
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
              {...props}
            >
              {children}
            </a>
          ),
          // Code blocks
          code: ({ className: codeClassName, children, ...props }) => {
            const isBlock = codeClassName?.includes('language-');
            if (isBlock) {
              return (
                <code
                  className={`${codeClassName} block bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-sm overflow-x-auto`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 text-sm text-pink-600 dark:text-pink-400"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Tables
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700" {...props}>
              {children}
            </td>
          ),
          // Headings
          h1: ({ children, ...props }) => <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2" {...props}>{children}</h1>,
          h2: ({ children, ...props }) => <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-3 mb-1.5" {...props}>{children}</h2>,
          h3: ({ children, ...props }) => <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-2 mb-1" {...props}>{children}</h3>,
          // Lists
          ul: ({ children, ...props }) => <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300" {...props}>{children}</ul>,
          ol: ({ children, ...props }) => <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300" {...props}>{children}</ol>,
          li: ({ children, ...props }) => <li className="text-sm" {...props}>{children}</li>,
          // Blockquote
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-4 border-blue-400 pl-3 italic text-gray-600 dark:text-gray-400 my-2" {...props}>
              {children}
            </blockquote>
          ),
          // Horizontal rule
          hr: () => <hr className="border-gray-200 dark:border-gray-700 my-3" />,
          // Paragraph
          p: ({ children, ...props }) => <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed" {...props}>{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

import { useRef, useEffect, useCallback } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function markdownToHtml(md: string): string {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Unordered list
  html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered list
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

function htmlToMarkdown(el: HTMLElement): string {
  let md = '';

  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      md += node.textContent || '';
    } else if (node instanceof HTMLElement) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'br') {
        md += '\n';
      } else if (tag === 'h1') {
        md += '# ' + node.textContent + '\n';
      } else if (tag === 'h2') {
        md += '## ' + node.textContent + '\n';
      } else if (tag === 'h3') {
        md += '### ' + node.textContent + '\n';
      } else if (tag === 'b' || tag === 'strong') {
        const inner = node.innerHTML;
        if (inner.includes('<i>') || inner.includes('<em>')) {
          md += '***' + node.textContent + '***';
        } else {
          md += '**' + node.textContent + '**';
        }
      } else if (tag === 'i' || tag === 'em') {
        md += '*' + node.textContent + '*';
      } else if (tag === 'code') {
        md += '`' + node.textContent + '`';
      } else if (tag === 'ul' || tag === 'ol') {
        for (const li of Array.from(node.children)) {
          if (li.tagName.toLowerCase() === 'li') {
            md += '- ' + li.textContent + '\n';
          }
        }
      } else if (tag === 'div' || tag === 'p') {
        md += htmlToMarkdown(node) + '\n';
      } else {
        md += htmlToMarkdown(node);
      }
    }
  }

  return md.replace(/\n+$/, '');
}

export default function MarkdownEditor({ value, onChange, placeholder, className }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (!editorRef.current || isInternalChange.current) return;
    const currentHtml = htmlToMarkdown(editorRef.current);
    if (currentHtml !== value) {
      editorRef.current.innerHTML = value ? markdownToHtml(value) : '';
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const md = htmlToMarkdown(editorRef.current);
    onChange(md);
    setTimeout(() => { isInternalChange.current = false; }, 0);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      document.execCommand('bold');
    } else if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      document.execCommand('italic');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  return (
    <div className="relative">
      {!value && (
        <div className="absolute top-0 left-0 text-sm text-gray-400 dark:text-gray-500 pointer-events-none select-none">
          {placeholder}
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`outline-none text-sm text-gray-900 dark:text-gray-100 min-h-[2em] whitespace-pre-wrap break-words ${className || ''}`}
        style={{ wordBreak: 'break-word' }}
      />
    </div>
  );
}

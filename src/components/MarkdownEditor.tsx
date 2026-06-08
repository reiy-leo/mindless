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

  // Headers (must come before bold/italic)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold+italic combo
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:0.9em">$1</code>');

  // Unordered list items
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

function saveCursor(container: Node): { node: Node; offset: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.startContainer)) return null;
  return { node: range.startContainer, offset: range.startOffset };
}

function restoreCursor(container: Node, saved: { node: Node; offset: number } | null) {
  if (!saved) return;
  const sel = window.getSelection();
  if (!sel) return;
  try {
    const range = document.createRange();
    range.setStart(saved.node, saved.offset);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {
    // If cursor node was removed, place at end
    const range = document.createRange();
    range.selectNodeContents(container);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export default function MarkdownEditor({ value, onChange, placeholder, className }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync value -> innerHTML (rendered markdown)
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalChange.current) return;

    const html = markdownToHtml(value);
    if (editorRef.current.innerHTML !== html) {
      const cursor = saveCursor(editorRef.current);
      editorRef.current.innerHTML = html || '';
      restoreCursor(editorRef.current, cursor);
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;

    // Read plain text from the editor
    const text = editorRef.current.innerText || '';
    onChange(text);

    // Re-render with markdown
    const html = markdownToHtml(text);
    const cursor = saveCursor(editorRef.current);
    editorRef.current.innerHTML = html;
    restoreCursor(editorRef.current, cursor);

    setTimeout(() => { isInternalChange.current = false; }, 0);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      document.execCommand('bold');
    } else if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      document.execCommand('italic');
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

export interface HighlightSegment {
  highlighted: boolean
  text: string
}

export interface HighlightMarkdownNode {
  children: Array<{ type: 'text'; value: string }>
  type: 'highlight'
}

const HIGHLIGHT_PATTERN = /::([\s\S]+?)::/g

export function splitHighlightText(value: string): HighlightSegment[] {
  const segments: HighlightSegment[] = []
  let lastIndex = 0

  for (const match of value.matchAll(HIGHLIGHT_PATTERN)) {
    const [raw, text] = match
    const start = match.index ?? 0
    const end = start + raw.length

    if (!text) continue

    if (start > lastIndex) {
      segments.push({ highlighted: false, text: value.slice(lastIndex, start) })
    }

    segments.push({ highlighted: true, text })
    lastIndex = end
  }

  if (lastIndex === 0) {
    return [{ highlighted: false, text: value }]
  }

  if (lastIndex < value.length) {
    segments.push({ highlighted: false, text: value.slice(lastIndex) })
  }

  return segments.filter((segment) => segment.text.length > 0)
}

export function serializeHighlightText(value: string) {
  return `::${value}::`
}

export function toHighlightMarkdownNodes(value: string) {
  return splitHighlightText(value).map((segment) => {
    if (!segment.highlighted) {
      return { type: 'text' as const, value: segment.text }
    }

    return {
      children: [{ type: 'text' as const, value: segment.text }],
      type: 'highlight' as const,
    }
  })
}

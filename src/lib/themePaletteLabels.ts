const ELEMENT_PALETTE_IDS = new Set(['chemical_elements_12', 'radioactive_elements_32'])

export function getThemePaletteLabelKey(paletteId: string) {
  return `settings.theme_color.palettes.${paletteId}`
}

export function getThemeColorLabelKey(name: string, paletteId: string) {
  return `settings.theme_color.color_names.${paletteId}.${formatThemeColorName(name, paletteId, 'zh')}`
}

export function formatThemeColorName(name: string, paletteId: string, language: string) {
  if (ELEMENT_PALETTE_IDS.has(paletteId)) {
    const match = name.match(/^(.+?)\s*[(（]\s*([A-Z][a-z]?)\b/)

    if (match) {
      const [, chineseName, symbol] = match
      return language.startsWith('zh') ? `${chineseName.trim()} ${symbol}` : symbol
    }
  }

  const baseName = name.replace(/\s*[(（][^()（）]*[)）]\s*/g, '').trim()
  return baseName
}

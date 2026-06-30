import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import { formatThemeColorName, getThemeColorLabelKey, getThemePaletteLabelKey } from './themePaletteLabels.ts'

const require = createRequire(import.meta.url)
const en = require('../i18n/locales/en/common.json')
const ja = require('../i18n/locales/ja/common.json')
const zh = require('../i18n/locales/zh/common.json')

test('getThemePaletteLabelKey maps palette ids to i18n keys', () => {
  assert.equal(getThemePaletteLabelKey('tailwind'), 'settings.theme_color.palettes.tailwind')
  assert.equal(getThemePaletteLabelKey('chrome_themes_15'), 'settings.theme_color.palettes.chrome_themes_15')
})

test('getThemeColorLabelKey maps normalized color names to i18n keys', () => {
  assert.equal(
    getThemeColorLabelKey('端午节 (粽叶绿、雄黄橙、艾草青)', 'holidays'),
    'settings.theme_color.color_names.holidays.端午节',
  )
  assert.equal(
    getThemeColorLabelKey('白羊座 (明烈红)', 'astrology_signs_12'),
    'settings.theme_color.color_names.astrology_signs_12.白羊座',
  )
})

test('formatThemeColorName strips parenthetical details from regular palette colors', () => {
  assert.equal(formatThemeColorName('端午节 (粽叶绿、雄黄橙、艾草青)', 'holidays', 'zh'), '端午节')
  assert.equal(formatThemeColorName('Chrome (经典蓝白)', 'chrome_themes_15', 'en'), 'Chrome')
  assert.equal(formatThemeColorName('Red', 'tailwind', 'zh'), 'Red')
})

test('theme color names are translated through locale resources', () => {
  assert.equal(en.settings.theme_color.color_names.holidays['端午节'], 'Dragon Boat Festival')
  assert.equal(en.settings.theme_color.color_names.zodiac_signs_12['子鼠'], 'Rat')
  assert.equal(en.settings.theme_color.color_names.astrology_signs_12['白羊座'], 'Aries')
  assert.equal(en.settings.theme_color.color_names.months_12['一月'], 'January')
  assert.equal(ja.settings.theme_color.color_names.holidays['端午节'], '端午節')
  assert.equal(ja.settings.theme_color.color_names.astrology_signs_12['白羊座'], '牡羊座')
  assert.equal(zh.settings.theme_color.color_names.tailwind.Red, '红色')
  assert.equal(zh.settings.theme_color.color_names.tailwind.Blue, '蓝色')
  assert.equal(zh.settings.theme_color.color_names.tailwind.Slate, '石板灰')
})

test('formatThemeColorName formats element palettes by locale', () => {
  assert.equal(formatThemeColorName('氩 (Ar - 薰衣草紫蓝放电色)', 'chemical_elements_12', 'zh'), '氩 Ar')
  assert.equal(formatThemeColorName('钚 (Pu - 四价钚离子肉桂橙棕)', 'radioactive_elements_32', 'zh-CN'), '钚 Pu')
  assert.equal(formatThemeColorName('氩 (Ar - 薰衣草紫蓝放电色)', 'chemical_elements_12', 'en'), 'Ar')
  assert.equal(formatThemeColorName('钚 (Pu - 四价钚离子肉桂橙棕)', 'radioactive_elements_32', 'ja'), 'Pu')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const en = require('./locales/en/common.json')
const ja = require('./locales/ja/common.json')
const zh = require('./locales/zh/common.json')

function collectKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  return Object.keys(value as Record<string, unknown>).flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key
    return [path, ...collectKeys((value as Record<string, unknown>)[key], path)]
  })
}

test('common locale files expose the same translation keys', () => {
  const locales = { en, ja, zh }
  const allKeys = new Set(Object.values(locales).flatMap((locale) => collectKeys(locale)))

  for (const [language, locale] of Object.entries(locales)) {
    const localeKeys = new Set(collectKeys(locale))
    assert.deepEqual(
      [...allKeys].filter((key) => !localeKeys.has(key)).sort(),
      [],
      `${language} is missing keys`,
    )
  }
})

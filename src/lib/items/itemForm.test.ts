import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeItemFormPayload } from './itemForm.ts'

test('normalizes item form fields and removes blank purchase lines', () => {
  assert.deepEqual(
    normalizeItemFormPayload({
      groupId: 'electronics',
      name: '  MacBook Pro  ',
      notes: '  primary laptop ',
      purchaseDate: '2026-07-05',
      links: [{ url: ' https://example.com/item ', label: ' Product page ' }, { url: '   ', label: 'ignored' }],
      purchaseLines: [
        { name: '  Laptop ', note: ' M4 ', quantity: '1', unitPrice: '12999' },
        { name: '   ', note: 'ignored', quantity: '2', unitPrice: '3' },
      ],
      purchasePrice: '12999',
      selectedTagIds: ['tag-a', 'tag-b'],
      source: 'jd',
    }),
    {
      groupId: 'electronics',
      name: 'MacBook Pro',
      notes: 'primary laptop',
      purchaseDate: '2026-07-05',
      links: [{ url: 'https://example.com/item', label: 'Product page', sortOrder: 0 }],
      purchaseLines: [{ name: 'Laptop', note: 'M4', quantity: 1, sortOrder: 0, unitPrice: 12999 }],
      purchasePrice: 12999,
      source: 'jd',
      tagIds: 'tag-a,tag-b',
    },
  )
})

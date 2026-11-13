import { expect, test } from 'vitest'
import { sequenceMac, type ToucheMac } from '../src/shared/touches-mac'

const t = (key: string, mods: Partial<ToucheMac> = {}): ToucheMac => ({
  key,
  shiftKey: false,
  metaKey: false,
  altKey: false,
  ctrlKey: false,
  ...mods
})

test('⇧↵ va à la ligne', () => expect(sequenceMac(t('Enter', { shiftKey: true }))).toBe('\x1b\r'))
test('⌘← et ⌘→ vont en début et en fin de ligne', () => {
  expect(sequenceMac(t('ArrowLeft', { metaKey: true }))).toBe('\x01')
  expect(sequenceMac(t('ArrowRight', { metaKey: true }))).toBe('\x05')
})
test('⌘⌫ efface le début de la ligne', () =>
  expect(sequenceMac(t('Backspace', { metaKey: true }))).toBe('\x15'))
test('les autres touches restent à xterm', () => {
  expect(sequenceMac(t('Enter'))).toBeNull()
  expect(sequenceMac(t('ArrowLeft'))).toBeNull()
  expect(sequenceMac(t('ArrowLeft', { metaKey: true, shiftKey: true }))).toBeNull()
  expect(sequenceMac(t('Enter', { shiftKey: true, metaKey: true }))).toBeNull()
})

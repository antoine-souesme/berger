import { expect, test } from 'vitest'
import { extrairePath, fusionnerPath } from '../src/shared/chemin'

test('extrairePath', () => {
  expect(extrairePath('bla\n__BERGER_PATH__/a:/b__BERGER_PATH__\n')).toBe('/a:/b')
  expect(extrairePath('bla\n/a:/b\n')).toBeNull()
})

test('fusionnerPath', () => {
  expect(fusionnerPath('/usr/bin:/bin', '/opt/homebrew/bin:/usr/bin')).toBe(
    '/opt/homebrew/bin:/usr/bin:/bin'
  )
  expect(fusionnerPath('/usr/bin', '')).toBe('/usr/bin')
})

import { expect, test } from 'vitest'
import { apercuTexte, lireNotifications, SORTES_NOTIFICATIONS } from '../src/shared/notifications'

test('sortes : « Texte copié » allumée par défaut', () => {
  expect(SORTES_NOTIFICATIONS.map((s) => [s.id, s.nom, s.parDefaut])).toEqual([
    ['copie', 'Texte copié', true]
  ])
})

test('réglage : absent ou invalide = défaut, clés inconnues ignorées', () => {
  expect(lireNotifications(undefined)).toEqual({ copie: true })
  expect(lireNotifications({ copie: false })).toEqual({ copie: false })
  expect(lireNotifications({ copie: 'non', autre: true })).toEqual({ copie: true })
  expect(lireNotifications([false])).toEqual({ copie: true })
})

test('aperçu : première ligne non vide, sans espaces de bord', () => {
  expect(apercuTexte('\n  ls -la  \nx')).toBe('ls -la')
  expect(apercuTexte('un')).toBe('un')
  expect(apercuTexte('  \n ')).toBe('')
})

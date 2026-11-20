# Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bulle discrète en bas à droite, première sorte « Texte copié », rubrique « Notifications » dans les réglages.

**Architecture:** Catalogue des sortes et lecture du réglage dans un module pur (`src/shared/notifications.ts`), branché dans `lireReglages`. Affichage DOM dans `src/renderer/src/notifications.ts`, appelé par `terminal.ts` après la copie.

**Tech Stack:** TypeScript, Electron, vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-notifications-design.md`

## Global Constraints

- Textes en français avec accents. Titre « Texte copié ». Rubrique « Notifications », icône `bell-ring`, après « Alertes ».
- Durée 2500 ms, trois bulles au plus (la plus ancienne part), clic = fermer.
- Clé `notifications.copie`, `true` par défaut.

## Review Focus

- Sorte éteinte : aucune bulle (vérifié dans `notifier`).
- Texte copié sur plusieurs lignes ou très long : une seule ligne, coupée par `…` (CSS `text-overflow`), aperçu = première ligne non vide.
- Valeur non booléenne dans `reglages.json` : défaut (test).
- Clé inconnue sous `notifications` : ignorée (test).
- Bulle par-dessus un dialogue ou les réglages : `z-index` au-dessus de tout, `pointer-events` seulement sur les bulles.

---

### Task 1: Module pur et réglage

**Files:** Create `src/shared/notifications.ts`, `tests/notifications.test.ts` ; Modify `src/shared/reglages.ts`, `tests/reglages.test.ts`.

**Interfaces — Produces:**
- `type SorteNotification = 'copie'`
- `SORTES_NOTIFICATIONS: { id: SorteNotification; nom: string; description: string; parDefaut: boolean }[]` (copie : « Texte copié », « Quand une sélection dans un terminal part dans le presse-papiers »)
- `lireNotifications(x: unknown): Record<SorteNotification, boolean>`
- `apercuTexte(texte: string): string` — première ligne non vide, espaces de bord retirés.
- `Reglages.notifications: Record<SorteNotification, boolean>`

- [ ] Tests : `lireNotifications(undefined)` → `{ copie: true }` ; `{ copie: false }` → false ; `{ copie: 'non', autre: true }` → `{ copie: true }` ; `apercuTexte('\n  ls -la  \nx')` → `'ls -la'`. Test des défauts de `reglages.test.ts` mis à jour avec `notifications: { copie: true }`.
- [ ] `npm test` échoue, implémenter, `npm test` passe, commit.

### Task 2: Bulle et rubrique

**Files:** Create `src/renderer/src/notifications.ts` ; Modify `src/renderer/src/terminal.ts` (`brancherCopieSelection`), `src/renderer/src/reglages.ts` (SECTIONS, `pageNotifications`), `src/renderer/assets/main.css`.

**Interfaces — Produces:** `notifier(sorte: SorteNotification, titre: string, texte?: string): void` (lit `reglagesActuels()`, ne fait rien si éteinte).

- [ ] Écrire `notifier` (pile `.notifications` fixe en bas à droite, bulle `.notification` : pastille, titre, ligne grise ; couleurs `--popover`, `--foreground`, `--muted`, `--accent`).
- [ ] Après `writeText` réussi dans `terminal.ts` : `notifier('copie', 'Texte copié', apercuTexte(texte))`.
- [ ] `pageNotifications` : une ligne bascule par sorte, `changerReglage(['notifications', id], v)`.
- [ ] `npm run typecheck`, `npm test`, lancer `npm run dev` et voir la bulle et la rubrique ; commit.

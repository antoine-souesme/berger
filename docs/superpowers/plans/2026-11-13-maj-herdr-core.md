# Mise à jour de herdr-core — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Berger prévient d'une nouvelle version de herdr-core (rond bleu) et l'installe sur un clic.

**Architecture:** Règle pure dans `src/shared/maj-core.ts` ; la partie Node (`src/main/maj-core.ts`) lit `latest.json` et `hc --version`, pousse l'état `berger:maj-core`, répond à `berger:verifier-core` et `berger:mettre-a-jour-core` ; la fenêtre ajoute la rubrique « Mises à jour » et le rond.

**Tech Stack:** Electron, TypeScript, vitest.

**Spec:** `docs/superpowers/specs/2026-11-13-maj-herdr-core-design.md`

## Global Constraints

- Source : `https://releases.herdr.dev/core/latest.json` ; génération 1 seulement.
- Vérification au lancement puis toutes les heures ; rien d'installé sans clic.
- `BERGER_VERSION_CORE=<x.y.z>` remplace la version lue par `hc --version`.
- Textes en français avec accents.

## Review Focus

- `latest.json` inaccessible ou mal formé : état « échec », pas de rond, pas de plantage.
- Version publiée plus ancienne ou égale : pas de rond.
- Génération différente : pas de rond.
- `hc update` qui échoue : message d'erreur dans la rubrique, rond gardé.
- Deux clics sur « Mettre à jour » : un seul `hc update` à la fois.

---

### Task 1: règle pure

**Files:** Create `src/shared/maj-core.ts`, `tests/maj-core.test.ts`

**Interfaces — Produces:**
- `type EtatMajCore = { actuelle: string | null; disponible: string | null; verifieA: number | null; erreur: string | null; enCours: boolean }`
- `comparerVersions(a: string, b: string): number` (négatif si a < b)
- `versionDisponible(actuelle: string, publie: unknown): string | null` — `publie` est le JSON brut ; renvoie `publie.version` si génération 1 et plus récente, sinon `null`.
- `versionDeHc(sortie: string): string | null` — `"hc 0.1.20\n"` → `"0.1.20"`.

- [ ] Tests : `comparerVersions('0.1.9','0.1.10') < 0`, `('0.1.21','0.1.21') === 0` ; `versionDisponible('0.1.20', {version:'0.1.21',generation:1}) === '0.1.21'`, `null` pour génération 2, pour version égale ou plus ancienne, pour `null`/`{}`/`{version:3}` ; `versionDeHc('hc 0.1.20\n') === '0.1.20'`, `versionDeHc('bof') === null`.
- [ ] `npm test -- maj-core` échoue, puis implémenter, puis passe.

### Task 2: partie Node

**Files:** Create `src/main/maj-core.ts` ; Modify `src/main/index.ts` (brancher et pousser à la fenêtre comme `berger:reglages`).

- `brancherMajCore(envoyer: (e: EtatMajCore) => void): void` : vérifie au démarrage puis `setInterval` 1 h ; `ipcMain.handle('berger:maj-core')` rend l'état ; `berger:verifier-core` revérifie et rend l'état ; `berger:mettre-a-jour-core` lance `cheminHc() update` (refuse si `enCours`), garde la fin de stderr comme `erreur` si code ≠ 0, puis revérifie.
- `fetch` avec délai de 10 s ; un échec met `erreur` et `verifieA: null`. `BERGER_TRACE` journalise chaque vérification.

### Task 3: fenêtre

**Files:** Modify `src/renderer/src/reglages.ts`, `src/renderer/assets/main.css`.

- Section `'mises-a-jour'`, libellé « Mises à jour », icône `refresh-cw`, rond (`.rond-maj`, couleur d'accent) sur l'entrée de la rubrique et sur `#ouvrir-reglages` quand `disponible`.
- Page : titre `herdr-core <actuelle>` ; sous-titre « <disponible> est prête. Tes terminaux restent ouverts pendant la mise à jour. », sinon « À jour. Vérifié à HH:MM. », sinon « La vérification a échoué. » ; pendant l'installation « Mise à jour en cours… ». Boutons « Vérifier maintenant » et, si disponible, « Mettre à jour herdr-core ». Note : « Berger vérifie toutes les heures. herdr-core fait tourner tes terminaux : ils continuent pendant ses mises à jour. »

### Task 4: vérifier

- [ ] `npm test`, `npm run typecheck`.
- [ ] `BERGER_VERSION_CORE=0.1.19 BERGER_CAPTURE=… npm run dev` : rond visible ; capture de la rubrique ouverte.
- [ ] Sans la variable (0.1.20 réelle, 0.1.21 publiée) : rond visible aussi ; ne pas cliquer « Mettre à jour » (laissé à Antoine).
- [ ] Commit.

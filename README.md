# Berger

Berger is an agent multiplexer for macOS: one window to keep an eye on your
terminals and coding agents (Claude Code and others), organized by project,
with a real code editor right next to them — the one from VS Code (Monaco).

It is an Electron app built on top of [herdr-core](#requirements): terminals
run inside the core, not inside Berger. You can quit or restart Berger and your
agents keep working.

The interface is in French.

![Two terminals side by side in a space, with the file explorer on the left](docs/captures/terminaux.png)

![A Markdown file open in the editor, with its preview next to it](docs/captures/editeur.png)

## Features

### Workspaces, spaces and agents

- **Workspaces**: groups of projects, each with its own emoji in the left bar.
  A badge shows which workspace has an agent waiting for you or done.
- **Spaces**: one space per project, showing its git branch (or `↑n` when
  commits are waiting to be pushed). Create them (`⌘N`), rename them, reorder
  them by dragging, and switch between them (`⌃1`, `⌃2`…).
- **Agents**: the list of agents in the workspace, with their state (working,
  waiting for you, done), how long they have been running and their space. One
  click takes you to their terminal.
- **Sounds** when an agent is waiting or done while you are looking elsewhere,
  with a choice of sound for each alert.

### Terminals

- **Tabs and splits**: new tab (`⌘T`), split right (`⌘D`) or down (`⇧⌘D`),
  zoom a pane (`⇧⌘↵`), move to the next pane (`⌥⌘←`), swap two panes.
  Double-click a divider to make the panes equal.
- **GPU rendering**, sharp and flicker-free while resizing.
- **Clickable links**: `⌘`-click a web address to open it in your browser.
- **Drag and drop**: drop a file on a terminal, from the explorer, the Finder
  or a screenshot thumbnail, and its path is typed in.
- **Mac keys**: `⇧↵` for a new line, `⌘←` and `⌘→` to jump to the start or end
  of the line.

### Files

- **Explorer**: one folder per space, plus any folders you add, with git colors
  and Material icons. Files ignored by git are dimmed. Create, rename, copy,
  paste, move (by dragging), select several files (`⌘`-click, `⇧`-click) and
  move to the Trash (after confirming).
- **Quick open** (`⌘P`) with recent files.
- **File tabs** that can be pinned and reordered by dragging; the folder is
  shown when two files have the same name.
- **Viewer** for images and videos.

### Editor

- **The VS Code editor**, with its grammars and a Monokai theme identical to
  VS Code's.
- **Language support** for TypeScript, JavaScript, JSON (SchemaStore schemas),
  YAML and Markdown: completion, go to definition (`F12`, `⌘`-click),
  references, hover, rename, errors underlined as you type, "Organize imports".
- **Git changes in the gutter**: green bar for added lines, blue for modified
  lines, pink triangle where lines were deleted, compared with the last commit.
  Updated as you type and after each commit.
- **Markdown preview** next to the text, updated as you type.
- **Files changed by an agent**: an open file with no unsaved changes reloads
  by itself; if it was changed on both sides, Berger asks before overwriting.
- Word wrap (`⌥Z`), minimap, multiple cursors, code folding.

### Settings

- **Settings window** (`⌘,`) or a `reglages.json` file, applied live.
- **Separate themes** for the app (7 built in, plus themes in Herdr's format)
  and for the editor (9 built in, including VS Code's).
- **Fonts** for the interface, the editor and the terminal, picked from the
  ones installed on your Mac.
- **Keyboard shortcuts** you can change, with conflict detection.
- **herdr-core updates** announced in the settings.

## Requirements

- macOS.
- [Node.js](https://nodejs.org/) 22 or later.
- **herdr-core**, with its `hc` command on your `PATH`. Berger connects to it at
  launch; without it, the window says so and waits.

## Install

```sh
npm install
npm run install-app
```

`npm run install-app` builds `Berger.app` and installs it in `/Applications`
(replacing the version already installed).

## Development

```sh
npm run dev        # run Berger in development mode
npm test           # unit tests
npm run typecheck  # type checking
```

The development build stores its data in
`~/Library/Application Support/Berger-dev/`, the installed app in
`~/Library/Application Support/Berger/`.

The code has three parts: `src/main` (the main process: connection to the core,
files, language servers), `src/renderer` (the window) and `src/shared` (pure
logic, tested in `tests/`). The roadmap is in
[`docs/suivi/ROADMAP.md`](docs/suivi/ROADMAP.md), the spec of each phase in
`docs/superpowers/specs/` and the mockups in `docs/maquettes/` (all in French).

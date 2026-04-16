# Discoloration

Discoloration is a browser-based grid logic game inspired by the classic Lights Out puzzle. The player restores a corrupted digital matrix by toggling cells until the whole board is active.

## Table of contents

- [Overview](#overview)
- [Gameplay](#gameplay)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [How the solver works](#how-the-solver-works)
- [Persistence](#persistence)
- [Deployment](#deployment)
- [Contributing notes](#contributing-notes)

## Overview

The goal is simple: turn every tile on the board into its restored state. Each click affects the selected cell plus its direct neighbors above, below, left, and right. Because every move changes multiple cells, the puzzle rewards planning, pattern recognition, and careful undo/reset usage.

The app starts at a `3x3` grid and progresses through larger boards up to `27x27`. Levels unlock sequentially as the player completes earlier sectors. For each level, the app tracks the best move count locally and compares it with the known optimal clear count.

## Gameplay

1. Open the level selector.
2. Choose any unlocked sector.
3. Click a tile to toggle it and its orthogonal neighbors.
4. Use `Undo` to step back one move or `Reset` to restart the current level.
5. Use `Hint` to highlight a mathematically valid next move.
6. Complete the level by restoring every tile.
7. Compare your move count with the optimal count and move to the next level.

### Win condition

A level is complete when every cell in the grid is active/restored.

### Perfect clear

A clear is marked perfect when the player solves the level using the known optimal number of moves.

## Features

- Progressive level selector from `3x3` through `27x27`
- Sequential unlocking so each completed level opens the next one
- Best score tracking for every level
- Optimal move counts displayed in the level selector and summary screen
- Undo and reset controls during active play
- Algebraic hint solver for reliable guidance on large boards
- Light and dark themes with local preference persistence
- Responsive Vite/React interface for desktop and mobile
- Fully local gameplay with no backend and no API keys
- Production-ready static build output

## Tech stack

- React 19 for the UI
- TypeScript for application code and solver logic
- Vite for local development and production builds
- Tailwind CSS 4 for styling
- ESLint and TypeScript checks for code quality

## Project structure

```text
.
├── index.html
├── metadata.json
├── package.json
├── src
│   ├── App.tsx
│   ├── components
│   │   └── Header.tsx
│   ├── index.css
│   ├── lib
│   │   └── lightsOut.ts
│   └── main.tsx
├── tsconfig.json
└── vite.config.ts
```

### Key files

- `src/App.tsx` contains the main game state, level flow, scoring, undo/reset controls, hint handling, and screen rendering.
- `src/lib/lightsOut.ts` contains the Lights Out solver used by the hint system.
- `src/components/Header.tsx` contains the app title and theme toggle.
- `src/index.css` contains Tailwind setup plus the custom matrix theme, glass panels, grid overlay, and hint pulse animation.
- `vite.config.ts` configures Vite, React, Tailwind, and the `@` path alias.

## Getting started

### Prerequisites

Install Node.js before running the project. A current LTS version is recommended.

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

By default, Vite starts the app on port `3000`.

### Build for production

```bash
npm run build
```

The production output is written to `dist/`.

### Preview the production build

```bash
npm run preview
```

## Available scripts

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Creates an optimized production build.

```bash
npm run preview
```

Serves the production build locally for final checks.

```bash
npm run lint
```

Runs ESLint with warnings treated as failures.

```bash
npm run typecheck
```

Runs the TypeScript compiler without emitting files.

```bash
npm run check
```

Runs linting and type checking together.

## How the solver works

The game is a Lights Out variant. Each possible click can be represented as a column in a binary matrix, where each bit describes whether that click affects a cell. The target is another binary vector describing which cells still need to be toggled.

The hint solver in `src/lib/lightsOut.ts` solves that system over GF(2), meaning all arithmetic is binary:

- `0` means a cell is unchanged or inactive in a vector.
- `1` means a cell is affected or needs to be toggled.
- Addition is equivalent to XOR.

The solver uses Gaussian elimination to find valid click combinations. When a board has multiple valid solutions, it evaluates the free-variable assignments and returns the solution with the fewest moves. This keeps hints correct even on high-level boards where simple brute force would become unreliable or too slow.

## Persistence

The app stores progress in the browser with `localStorage`.

- `discoloration_stats` stores completed levels, best move counts, and optimal move metadata.
- `discoloration_theme` stores the selected theme.

No data leaves the browser.

## Deployment

This project builds to static files, so it can be hosted on GitHub Pages, Vercel, Netlify, Cloudflare Pages, or any static hosting service.

The Vite config uses:

```ts
base: './'
```

That makes the built app work from repository subpaths as well as root domains, which is useful for GitHub Pages deployments.

## Contributing notes

- Keep generated folders such as `dist/`, `node_modules/`, and `.npm-cache/` out of Git.
- Run `npm run check` before committing code changes.
- Run `npm run build` before publishing UI or configuration changes.
- Keep solver changes covered by manual spot checks on small levels where the optimal move count is easy to verify.

## License

See the repository `LICENSE` file for license details.

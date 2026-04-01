# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (Turbopack)
npm run dev

# Production build
npm run build

# Lint
npm run lint

# Run all tests
npm run test

# Reset database
npm run db:reset
```

To run a single test file:
```bash
npx vitest src/components/chat/__tests__/ChatInterface.test.tsx
```

## Environment

- `ANTHROPIC_API_KEY` — optional. If not set, the app uses `MockLanguageModel` (offline demo mode with hardcoded examples).
- `JWT_SECRET` — optional. Falls back to a dev secret if not set.

Database is SQLite (`prisma/dev.db`). After schema changes, run `npx prisma migrate dev`.

## Architecture

### Virtual File System (`src/lib/file-system.ts`)
All user code lives in an in-memory `VirtualFileSystem` (tree of `File`/`Directory` nodes). Nothing is written to disk. The VFS state is serialized to JSON and stored in the `Project.data` database column. `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) owns the VFS instance and exposes `handleToolCall()` so Claude tool results mutate it.

### AI Tool Use (`src/app/api/chat/route.ts`)
The chat API uses Vercel AI SDK's `streamText()` with two Claude tools:
- `str_replace_editor` — view/create/modify files (delegates to `src/lib/tools/str-replace.ts`)
- `file_manager` — create/delete files and directories (`src/lib/tools/file-manager.ts`)

`maxSteps: 40` allows multi-turn tool execution in a single request. After generation completes, the project is persisted to the database. Anthropic ephemeral prompt caching is applied to the system prompt.

### Language Model Provider (`src/lib/provider.ts`)
`getLanguageModel()` returns real `claude-haiku-4-5` when `ANTHROPIC_API_KEY` is set, or a `MockLanguageModel` for offline use. The mock simulates a 4-step tool-call sequence producing a hardcoded example component.

### JSX Transformation & Preview (`src/lib/transform/jsx-transformer.ts`, `src/components/preview/PreviewFrame.tsx`)
Client-side preview pipeline:
1. Babel standalone transforms JSX/TSX to plain JS.
2. `createImportMap()` maps local file paths to Blob URLs and third-party imports to `esm.sh` CDN URLs.
3. `createPreviewHTML()` injects the import map and an `ErrorBoundary` into an iframe srcdoc. Tailwind CSS is loaded from CDN inside the iframe.

### State Management
Two React contexts drive the UI:
- `FileSystemContext` — VFS state, selected file, tool-call processing.
- `ChatContext` — wraps `useChat` (Vercel AI SDK), serializes VFS state into each API request body.

### Authentication
JWT sessions via `jose` stored in HttpOnly cookies (7-day expiry). Server actions in `src/actions/` handle signup/signin/logout. `src/middleware.ts` protects routes. Anonymous users can work locally; `src/lib/anon-work-tracker.ts` saves their project IDs in `localStorage` so they can be claimed after sign-up.

### Layout
`src/app/main-content.tsx` uses `react-resizable-panels`: Chat (35%) | Preview/Code (65%). The Code view splits into FileTree (30%) + Monaco editor (70%).

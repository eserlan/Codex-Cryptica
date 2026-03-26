# Codex Cryptica - Project Context

## Project Overview

**Codex Cryptica** is a local-first, AI-powered world-building and lore management application. It enables users to create, organize, and visualize their fictional worlds through a bidirectional text-to-graph sync system. The application features an AI "Oracle" (powered by Google Gemini) that helps users brainstorm, expand queries, and generate content while maintaining privacy through client-side processing.

### Core Features

- **AI Oracle**: Chat-based AI assistant for world-building queries with visual distillation capabilities
- **Visual Graph**: Interactive Cytoscape.js graph showing entity relationships
- **Local-First Storage**: Uses OPFS (Origin Private File System) for private, offline-capable data storage
- **Bidirectional Sync**: Real-time synchronization between text notes and graph visualization
- **Rich Text Editor**: Tiptap-based markdown editor with tables and task lists
- **Importer**: AI-powered extraction of structured data from uploaded documents

## Tech Stack

| Category         | Technology                      |
| ---------------- | ------------------------------- |
| **Framework**    | SvelteKit 2.x with Svelte 5     |
| **Styling**      | Tailwind CSS 4.x                |
| **Build System** | Turborepo (monorepo)            |
| **Runtime**      | Node.js 18+                     |
| **Graph Viz**    | Cytoscape.js with fCoSE layout  |
| **Editor**       | Tiptap + Milkdown               |
| **AI**           | Google Gemini API               |
| **Storage**      | OPFS + IndexedDB (Dexie)        |
| **Testing**      | Vitest (unit), Playwright (E2E) |

## Repository Structure

```
Codex-Arcana/
├── apps/
│   ├── web/                 # Main SvelteKit application
│   └── workers/             # Web workers for background tasks
├── packages/                # Shared libraries (Library-First Architecture)
│   ├── schema/              # Zod schemas for data validation
│   ├── vault-engine/        # Core vault management logic
│   ├── graph-engine/        # Cytoscape.js graph logic
│   ├── editor-core/         # Tiptap extensions
│   ├── oracle-engine/       # AI Oracle services
│   ├── sync-engine/         # Bidirectional sync logic
│   ├── search-engine/       # Search functionality
│   ├── chronology-engine/   # Timeline features
│   ├── map-engine/          # Map visualization
│   ├── dice-engine/         # Dice rolling utilities
│   ├── canvas-engine/       # Canvas utilities
│   ├── importer/            # Document import processing
│   └── proposer/            # Content proposal logic
├── docs/                    # Documentation (ADR, guides, reports)
├── scripts/                 # Build and maintenance scripts
├── .specify/                # Spec-driven development artifacts
├── .gemini/                 # Speckit command definitions (canonical)
└── .codex/                  # Codex CLI command mirror
```

## Building and Running

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone and install dependencies
git clone <repository>
cd Codex-Arcana
npm install
```

### Development

```bash
# Start development server (all packages)
npm run dev
# or
turbo run dev

# Start only the web app
npm run dev --workspace=web
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

### Building

```bash
# Build all packages
npm run build
# or
turbo run build
```

### Testing

```bash
# Run all unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests (Playwright)
npm run test:e2e

# Test specific workspace
npm test --workspace=@codex/vault-engine
```

### Linting & Formatting

```bash
# Lint all packages
npm run lint

# Format code
npm run format
```

## Development Conventions

### Gitmoji Commit Messages

All commits must start with a [gitmoji](https://gitmoji.dev/) emoji:

```bash
# Examples
✨ Add new feature
🐛 Fix bug
♿ Improve accessibility
🎨 Style/UI improvement
🔧 Configuration change
```

Use `npx gitmoji -c` for interactive commit with emoji selection.

### Pre-commit Hooks

Husky + lint-staged automatically runs on commit:

- `eslint --fix` on staged files
- `prettier --write` on staged files
- Commit message validation (gitmoji required)

Bypass with `--no-verify` (not recommended).

### Code Style

- **TypeScript**: Strict mode with comprehensive types
- **Prettier**: 2-space tabs, double quotes, trailing commas, semicolons required
- **Svelte**: Use `prettier-plugin-svelte`
- **Tailwind**: Follow Tailwind CSS 4.x syntax

### Testing Practices

**Constitutional Requirements** (from `.specify/memory/constitution.md`):

| Component Type   | Coverage Goal | Enforced Floor   |
| ---------------- | ------------- | ---------------- |
| Shared Utilities | 80%           | 80%              |
| Core Engines     | 70%           | Package baseline |
| State Stores     | 50%           | 45-50%           |

**TDD Mandate**: No code logic committed without corresponding unit tests. Follow Red-Green-Refactor cycle.

### Dependency Injection

All services and stores must use **constructor-based DI**:

```typescript
// Export both class and singleton
export class MyService {
  constructor(private dependency = otherServiceSingleton) {}
}

export const myService = new MyService();
```

This enables testability by allowing mocks to be injected during testing.

### Architecture Principles

1. **Library-First**: Major features must be standalone packages in `packages/`
2. **Privacy**: Client-side processing preferred; data never leaves device except for AI inference
3. **Simplicity (YAGNI)**: Use established libraries over custom solutions
4. **AI-First**: Oracle is primary engine for unstructured→structured transformation
5. **Documentation**: Major features need user-facing help content
6. **Natural Language**: User-facing text should be clear and accessible

## AI Agent Guidelines

When working with AI coding assistants:

1. **Unused Variables**: Prefix with `_` to avoid lint errors
2. **Svelte 5**: Use `$derived` instead of `$state(prop)` to avoid stale state warnings
3. **Tailwind 4**: Use modern syntax (no `@apply`, prefer utility classes)
4. **Type Safety**: Provide comprehensive type definitions in packages
5. **Spec-Driven**: For feature work, use `.specify` scripts and read `spec.md`, `plan.md`, `tasks.md`

## Key Configuration Files

| File                              | Purpose                                  |
| --------------------------------- | ---------------------------------------- |
| `turbo.json`                      | Turborepo pipeline configuration         |
| `package.json`                    | Root workspace configuration             |
| `.prettierrc`                     | Code formatting rules                    |
| `.commitlintrc.json`              | Gitmoji commit validation                |
| `eslint.config.js`                | ESLint configuration                     |
| `.specify/memory/constitution.md` | Engineering principles (source of truth) |
| `AGENTS.md`                       | AI agent instructions                    |

## Deployment

The application builds as a **static site** deployed to GitHub Pages. The Oracle AI uses:

- **User API Key**: Stored in IndexedDB (secure, local)
- **Lite Mode**: Shared key (public, rate-limited) - must be restricted via Google Cloud Console referrer policy

## Important Directories

- **`.specify/`**: Spec-driven development system with scripts and memory
- **`.gemini/commands/`**: Canonical Speckit command definitions
- **`.codex/commands/`**: Codex CLI command mirror
- **`docs/adr/`**: Architecture Decision Records
- **`vault-test/`**: Sample vault data for testing

## Common Workflows

### Adding a New Feature

1. Create spec in `.specify/` or `specs/`
2. Run `.specify/scripts/bash/create-new-feature.sh`
3. Implement with TDD (tests first)
4. Add user documentation in `apps/web/src/lib/config/help-content.ts`
5. Ensure coverage goals are met

### Fixing a Bug

1. Write failing test
2. Implement fix
3. Verify tests pass
4. Commit with gitmoji (e.g., `🐛 fix: description`)

### Code Review Checklist

- [ ] Tests added/updated
- [ ] Coverage maintained or improved
- [ ] Follows constitution principles
- [ ] User documentation updated
- [ ] Gitmoji commit message

## Git Workflow

- Before committing, run `npm run lint` and `npm run test` to catch errors early
- If commitlint fails, use `git reset --soft HEAD~1` to amend rather than creating new commits
- When addressing PR comments, reference the specific comment thread in your commit message

## Code Review Checklist (Extended)

- Verify all imported methods exist in the codebase before using them
- Check for safe object spreading with null/undefined checks on metadata objects
- Run existing tests before proposing changes to catch regressions

## Testing Guidelines

- For AI-dependent tests, create mock fixtures that don't require real API keys
- Always run tests after modifying auth-related files or API integration code
- Document test limitations in comments when real API calls can't be mocked

# Codex Arcana

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the development server:
```bash
npm run dev
# or
turbo run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

### Architecture

- **apps/web**: SvelteKit application with Tailwind CSS (Migrated from Next.js)
- **packages/schema**: Shared Zod schemas for data validation
- **packages/graph-engine**: Cytoscape.js core logic for graph visualization
- **packages/editor-core**: Framework-agnostic Tiptap extensions and core

### CI/CD

This project uses **GitHub Actions** for continuous integration. Every push and pull request to the `main` branch triggers:
1.  **Dependency Installation**: Ensuring the environment is reproducible.
2.  **Linting**: Verifying code style and potential errors.
3.  **Testing**: Running unit and integration tests across all packages.
4.  **Building**: Ensuring the production build succeeds.

### Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Build System**: [Turborepo](https://turbo.build/repo)
- **Runtime**: Node.js
- **State Management**: Svelte Stores (Frontend)
- **Local-first database**: [RxDB](https://rxdb.info/) with OPFS
- **Graph Visualization**: [Cytoscape.js](https://js.cytoscape.org/)
- **Rich Text Editor**: [Tiptap](https://tiptap.dev/)

### Features

- Local-first storage (OPFS/RxDB)
- Bidirectional text-to-graph sync
- Offline capability
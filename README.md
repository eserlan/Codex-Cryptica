# Codex Cryptica

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

### Development Workflow

This project uses **Husky** and **lint-staged** to ensure code quality before every commit.

- **Commit Messages**: We use [gitmoji](https://gitmoji.dev/) for consistent and descriptive commit messages. Every commit message must start with a gitmoji (either the emoji character or the `:code:`).
  - Example: `:sparkles: Add new feature` or `✨ Add new feature`
  - You can use the `gitmoji-cli` to help you choose the right emoji: `npx gitmoji -c`
- **Pre-commit Hooks**: When you run `git commit`, Husky runs `lint-staged`, which executes `eslint --fix` and `prettier --write` on the modified files.
- **Commit-msg Hooks**: A hook validates that your commit message follows the gitmoji convention using `commitlint`.
- **Why?**: This prevents linting and formatting errors from reaching the repository and ensures a readable, searchable commit history.
- **Manual Bypass**: If you absolutely need to bypass the hooks (not recommended), you can use the `--no-verify` flag:
  ```bash
  git commit -m "your message" --no-verify
  ```

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
- **Local-first database**: Native File System Access API with OPFS
- **Graph Visualization**: [Cytoscape.js](https://js.cytoscape.org/)
- **Rich Text Editor**: [Tiptap](https://tiptap.dev/)

### Security & Lore Oracle

The Lore Oracle (AI Assistant) uses Google Gemini. It can be used in two modes:

1.  **User Provided Key**: Users enter their own API key in the settings. This is stored securely in their local browser (IndexedDB).
2.  **Lite Mode (Shared Key)**: If `VITE_SHARED_GEMINI_KEY` is provided during build, all users can access the "Lite" tier.

**Important for Developers:** Because this is a static frontend application, any shared key provided at build time is **publicly visible** in the compiled JavaScript. To prevent abuse, you **must** restrict your API key in the [Google Cloud Console](https://console.cloud.google.com/):

- Go to **APIs & Services > Credentials**.
- Select your API Key.
- Under **Application restrictions**, choose **Websites (HTTP referrers)**.
- Add your deployment domain (e.g., `https://your-username.github.io/*`).

### Features

- Local-first storage (OPFS)
- Bidirectional text-to-graph sync
- Offline capability

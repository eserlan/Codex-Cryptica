# Research: GitHub Pages Deployment for SvelteKit SPA

## Decisions

### 1. Adapter Selection

- **Decision**: Use `@sveltejs/adapter-static`.
- **Rationale**: GitHub Pages only supports static file hosting. `adapter-static` is the official tool for generating a static site from a SvelteKit project.

### 2. SPA Routing Strategy

- **Decision**: Set `fallback: 'index.html'` in the adapter configuration (enabling `strict: false` if needed), and use the build script to copy `index.html` to `404.html`.
- **Rationale**: Since GitHub Pages doesn't support server-side routing, navigating directly to a sub-route (e.g., `/NPCs`) would normally cause a 404. Configuring the SPA fallback to `index.html` and then copying it to `404.html` ensures that GitHub Pages serves the main SPA entry point for all unknown routes, allowing the client-side router to take over while still conforming to GitHub Pages' use of `404.html`.

### 3. Base Path Handling

- **Decision**: Configure `paths.base` in `svelte.config.js` to `/Codex-Arcana` (or the specific repository name).
- **Rationale**: GitHub Pages sites for project repositories are served at `username.github.io/repo-name/`. Without setting the base path, asset links (e.g., `/app.js`) will fail because they look at the domain root instead of the subdirectory.

### 4. Deployment Automation

- **Decision**: Use `peaceiris/actions-gh-pages` or the official GitHub `actions/deploy-pages`.
- **Rationale**: Automated deployment ensures that the `gh-pages` branch is always in sync with `main`.

## Implementation Details

- **Package to install**: `@sveltejs/adapter-static`
- **Config file to update**: `apps/web/svelte.config.js`
- **New file**: `.github/workflows/deploy.yml`
- **Environment**: Needs `VITE_GOOGLE_CLIENT_ID` secret in GitHub Repo.

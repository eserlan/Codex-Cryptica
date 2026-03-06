# ADR 005: Dual-Path CI/CD Deployment Strategy

- **Status:** Active
- **Date:** 2026-03-06

---

## Context and Problem Statement

As the Codex Cryptica project grows, we need a way to:

1.  **Safely test features** in a live-like environment before they are merged into the `main` branch.
2.  **Provide a stable production environment** for end-users that is only updated with verified code.
3.  **Automate versioning** to maintain a clear history of releases and coordinate with the `Lore Oracle` AI capabilities.
4.  **Notify the team** of successful deployments via Discord.

## Decision

We have implemented a "Dual-Path" CI/CD pipeline using GitHub Actions and GitHub Pages:

1.  **Branch-Based Matrix Builds:**
    - Every push to _any_ branch triggers a build matrix that generates two separate versions of the site:
      - **Production Path:** Always built from the `main` branch, served at the domain root (`/`).
      - **Staging Path:** Built from the _current_ branch (the one that triggered the push), served at the `/staging` sub-path.
2.  **Combined Artifact Deployment:**
    - The deployment job waits for both matrix builds to complete.
    - It merges the two builds into a single directory structure:
      - `dist/` (Production)
      - `dist/staging/` (Staging)
    - The entire `dist/` folder is uploaded as a single GitHub Pages artifact.
3.  **Post-Merge Automation:**
    - When a Pull Request is merged into `main`, a separate `auto-bump-web-version` workflow triggers.
    - This workflow increments the version in `package.json`, updates the service worker cache version, and pushes a commit back to `main`.
    - This push then triggers the final `production` deployment with the new version number.

## Decision Outcome

### Pros

- **Immediate Feedback:** Developers can see their changes live at `/staging` before merging.
- **Zero-Risk Main:** The production site at `/` is protected and only updates when `main` changes.
- **Unified Hosting:** Both environments coexist on the same GitHub Pages instance, simplifying configuration.
- **Automated Traceability:** Version numbers are always in sync with the live code without manual intervention.

### Cons

- **Build Redundancy:** Every push builds `main` twice (once as the target and once as the "Production" part of the matrix).
- **Concurrency Cancellations:** Rapid pushes or the auto-bump bot can cause previous deployment runs to be cancelled, which can look like failures in the GitHub UI (though the latest run always prevails).
- **Environment Leakage:** Since both sites share the same domain (different paths), they share `localStorage` and `IndexedDB`. Developers must be careful when testing breaking schema changes in staging.

## Alternatives Considered

- **Separate Repositories:** Too much overhead for a small team.
- **Vercel/Netlify:** Excellent for PR previews, but GitHub Pages was chosen to keep the entire stack within the GitHub ecosystem and avoid extra third-party dependencies for this static site.

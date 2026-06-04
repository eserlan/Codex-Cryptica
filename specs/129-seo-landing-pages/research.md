# Research & Decisions: SEO Landing Page and Generator System

This document outlines technical research, architectural decisions, and alternatives evaluated for the SEO Landing Page system in Codex Cryptica.

---

## 1. Static Sitemap Generation in SvelteKit

### Decision

Implement `/sitemap.xml` as a pre-rendered API route (`+server.ts`) inside `apps/web/src/routes/sitemap.xml/`.

### Rationale

- Setting `export const prerender = true` inside `+server.ts` prompts SvelteKit to execute the `GET` handler during build-time compilation and save the resulting XML to `build/sitemap.xml`.
- This combines the benefit of automatic data-driven generation (aggregating all marketing solutions, comparisons, generators, and blog articles dynamically) with 100% static hosting compatibility.
- Avoids manual, error-prone updates to a static sitemap file.

### Alternatives Considered

- **Static sitemap file**: Rejected due to high maintenance overhead.
- **Dynamic runtime sitemap**: Rejected since the entire app is deployed as a static site using `@sveltejs/adapter-static` without an active Node server.

---

## 2. API Key vs Shared System Proxy for Public Generators

### Decision

Default all public generator pages to use the out-of-the-box shared system proxy (`oracle-proxy.espen-erlandsen.workers.dev`) using the existing `aiClientManager` class.

### Rationale

- Codex Cryptica already implements a shared proxy to provide free trial AI usage to users without their own API keys.
- Leveraging this system proxy on the landing pages allows new visitors to see full AI lore-generation capabilities with zero configuration or keys.
- If the proxy limits are hit or the client is offline, the page falls back gracefully to high-quality local deterministic name tables and random generators.

### Alternatives Considered

- **Strictly local deterministic tables**: Rejected because it misses showcasing the core AI features of Codex Cryptica.
- **Input field for client Gemini Key**: Defers the "Aha!" moment too much; most visitors will bounce instead of searching for their Gemini key. We can provide this as an optional toggle for power users.

---

## 3. Local Storage Pending Import Transfer

### Decision

Use `localStorage` to pass the generated draft payload between the marketing routes and the app shell.

### Rationale

- Query parameters are limited to ~2000 characters by many browsers. Large settlement descriptions or multiple generated characters would exceed this limit.
- Both the landing pages (under `(marketing)`) and the workspace app (under `(app)`) share the same origin, giving them access to the same `localStorage` space.
- A key named `__codex_pending_import` will hold the Zod-validated `ImportDraft` object.
- The app shell's `onMount` hook checks this key, clears it, auto-initializes/switches to a vault if needed, and writes the entity.

---

## 4. Dual-Theme Scoping (App Chrome vs World)

### Decision

Adhere strictly to the dual-theme guidelines in `STYLE_GUIDE.md`:

- The marketing pages will use `data-app-appearance` variables (`neutral-dark` or `neutral-light`) for the page layout wrappers.
- The interactive generator output cards will use the default world theme `workspace` or a preview of `fantasy` scoping (`data-world-theme`) to showcase Codex's immersive aesthetic style (Alegreya typography, borders, subtle textures).

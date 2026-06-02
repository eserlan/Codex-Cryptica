# Quickstart: SEO Landing Page and Generator System

This guide outlines how to build, run, and verify the SEO landing page and generator system.

---

## 1. Running the Development Server

Start the development server from the repository root:

```bash
bun run dev
```

Navigate to:

- `/solutions/campaign-manager`
- `/vs/obsidian`
- `/generators/npc`

---

## 2. Dynamic Sitemap Verification

To verify that the `/sitemap.xml` endpoint dynamically compiles correctly:

1. Open your browser or request the endpoint:
   ```bash
   curl http://localhost:5173/sitemap.xml
   ```
2. Verify it outputs valid XML containing references to all solutions, comparisons, generators, and blog articles.

---

## 3. Testing the Funnel Locally

To trace the onboarding conversion loop:

1. Navigate to `/generators/npc`.
2. Adjust attributes (e.g. Race: Elf, Role: Mage) and click **✦ Generate NPC ✦**.
3. Once the draft description and lore are loaded, click **Save to Codex Cryptica**.
4. The page will store the payload in `localStorage` under `__codex_pending_import` and redirect you to `/`.
5. The workspace app should immediately initialize, import your new entity, and display it in the knowledge graph.

---

## 4. Running Unit Tests

Run the test suite using Vitest:

```bash
bun run test
```

To run targeted unit tests for our new SEO configuration files and sitemap endpoint:

```bash
bun test apps/web/src/lib/services/seo/
```

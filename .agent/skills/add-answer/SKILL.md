---
name: add-answer
description: Add a new Codex Cryptica reference answer page (/answers/[slug]) covering an authentic TTRPG or worldbuilding question. Enforces British English, direct snippet-first answers, table frameworks, worked before/after examples, Discovery Intent Governance (Constitution XIII), live route validation, R2-only images, and category registration.
---

# Add an Answer Page

Answer pages (`/answers/[slug]`) are reference entries for real tabletop RPG and worldbuilding questions that players and Game Masters search for — not shallow SEO landing pages and not dated blog posts.

One page owns one genuine user intent (Constitution XIII). The substantive answer is structured data (`AnswerConfig`), landing in crawler-visible HTML without requiring a bespoke Svelte page per question.

---

## Editorial & Style Rules (Mandatory)

1. **British English throughout** (Constitution & Issue #2563/#2564):
   - Use `-ise` endings (`organise`, `recognise`, `realise`, `specialise`, `characterise`).
   - Use British spellings (`colour`, `honour`, `behaviour`, `rumour`, `favourite`, `neighbour`, `centre`, `theatre`, `catalogue`, `grey`, `cancelled`, `defence`, `offence`).
   - **Never use American travel conjugations**: Use `travelled`, `travelling`, `traveller`, `travellers` (the test suite rejects `traveled` and `traveling`).
2. **Direct Answer First (`shortAnswer`)**:
   - Must be a single self-contained paragraph of $\ge 140$ characters that directly answers the question before any body prose.
   - Forms the structured FAQPage JSON-LD snippet; it must make total sense when read in search engine results out of context.
3. **Substantive Framework & Structure**:
   - At least 3 body sections (`sections.length >= 3`).
   - **At least one worked `example` block** (`kind: "example"`): Concrete tabletop comparison (e.g. weak/strong or before/after) with a "Why it works" takeaway.
   - **At least one actionable checklist block** (`kind: "checklist"`): Specific, practical prep items the reader can take straight to their table.
4. **Honest Product Connection**:
   - `codexConnection` belongs at the end of the article, after the substantive answer is already complete. It must explain how Codex tools/graphs assist the specific workflow, not read as a mid-article sales pitch.
5. **No AI Filler or Fluff**:
   - Avoid generic AI intro fluff ("In the vast and wondrous world of tabletop gaming..."). Start directly with the friction point or core design dilemma.

---

## Step-by-Step Implementation Workflow

### 1. Check Discovery Intent (Constitution XIII)

Every public answer page is governed by the Discovery Intent Registry:

1. Run the discovery audit to check existing intents and cluster owners:
   ```sh
   bun scripts/discovery-audit.mjs
   ```
2. Verify the intent is distinct: do not create a second URL for a synonym or word-order variant of an existing answer.
3. Identify the parent cluster (e.g. `session-prep`, `worldbuilding`, `adventure-mapping`, `npc-creation`) and search intent aliases. You will define these directly in the answer file's `discovery` object — no separate registry file edit required!

---

### 2. Image Asset Workflow (Cloudflare R2 Only)

> [!IMPORTANT]
> **NEVER commit image files to git.** All image assets belong exclusively in Cloudflare R2 (`codex-cryptica-statics` bucket served via `https://assets.codexcryptica.com/`). Any local files created temporarily during generation must be deleted immediately after upload.

1. Generate or prepare a 16:9 illustration for the topic:
   - Aspect ratio: `16:9`.
   - Evocative, atmospheric tabletop RPG illustration matching Codex's aesthetic.
2. Upload directly to R2 using wrangler:
   ```sh
   bunx wrangler r2 object put \
     codex-cryptica-statics/og/<slug>.jpg \
     --file=/path/to/temporary-image.jpg \
     --content-type=image/jpeg \
     --remote
   ```
3. Verify both direct and CDN responses:
   ```sh
   curl -sI https://assets.codexcryptica.com/og/<slug>.jpg | head -5
   ```
4. **Delete the local temporary image immediately**.
5. Set `seo.image` to `https://assets.codexcryptica.com/og/<slug>.jpg` and `seo.imageAlt` to a descriptive string ($\ge 10$ characters).

---

### 3. Create the Answer Page File

Create `apps/web/src/lib/content/answers/pages/<slug>.ts`:

```ts
import type { AnswerConfigInput } from "../schema";

export const <camelCaseName>: AnswerConfigInput = {
  slug: "<kebab-case-slug>",
  category: "session-prep", // "getting-started" | "session-prep" | "worldbuilding" | "campaign-notes"
  question: "<Verbatim Question Ending in ?>",
  kind: "framework", // "definition" | "how-to" | "framework" | "comparison"
  shortAnswer:
    "<Self-contained direct answer >140 characters with zero introductory filler.>",
  sections: [
    {
      kind: "prose",
      heading: "<Why the problem exists / common pitfalls>",
      paragraphs: [
        "<Explanatory paragraph 1...>",
        "<Explanatory paragraph 2...>",
      ],
    },
    {
      kind: "list",
      heading: "<The Core Framework / Criteria>",
      intro: "<Brief framing sentence:>",
      items: [
        {
          term: "<Pillar 1>",
          text: "<Actionable explanation...>",
        },
        {
          term: "<Pillar 2>",
          text: "<Actionable explanation...>",
        },
      ],
    },
    {
      kind: "example",
      heading: "<Worked Example Scenario: Before and After>",
      paragraphs: [
        "<Context for the scenario...>",
      ],
      items: [
        {
          term: "<The weak / default approach>",
          text: "<How tables typically fumble this...>",
        },
        {
          term: "<The strong framework approach>",
          text: "<How the proposed framework transforms the scene...>",
        },
        {
          term: "Why it works",
          text: "<The mechanical and narrative reason this succeeded.>",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "<Before You Run / Prep Checklist>",
      intro: "<Practical check before sitting at the table:>",
      items: [
        "<Actionable item 1>",
        "<Actionable item 2>",
        "<Actionable item 3>",
      ],
    },
  ],
  codexConnection: {
    heading: "<Connecting X to your broader campaign world>",
    paragraphs: [
      "<How Codex Cryptica's generator, graph, or canvas supports this workflow.>",
    ],
    linkText: "<Try the relevant generator / tool>",
    href: "/generators/<slug>", // Must be a verified live route
  },
  relatedTools: [
    {
      title: "<Tool Title>",
      description: "<Short description of utility.>",
      href: "/generators/<live-slug>",
    },
  ],
  relatedForPages: [
    {
      title: "<Hub Title>",
      description: "<Short description of relevant genre or system.>",
      href: "/for/<live-slug>",
    },
  ],
  relatedAnswers: [
    "<existing-answer-slug-1>",
    "<existing-answer-slug-2>",
  ],
  discovery: {
    parentCluster: "<cluster-id, e.g. adventure-mapping, session-prep, worldbuilding>",
    intentAliases: ["<alias 1>", "<alias 2>"],
    uniqueValue: "<1-2 sentences explaining the unique technique or framework>",
    relatedIntents: ["<related-intent-id>"],
  },
  seo: {
    title: "<Question>? | Codex Cryptica", // <= 75 chars
    description:
      "<Concise, actionable meta description under 185 chars.>", // <= 185 chars
    image: "https://assets.codexcryptica.com/og/<slug>.jpg",
    imageAlt: "<Descriptive alt text for the journey/scene illustration>",
  },
};
```

---

### 4. Sync Answer Registries

Run the automated synchronization script to register your answer:

```sh
bun sync:answers
```

This automatically:

- Registers the answer in `apps/web/src/lib/content/answers/pages/index.ts`.
- Incorporates the answer into its category (`apps/web/src/lib/content/answers/categories.ts`).
- Generates its Discovery Intent entry (`apps/web/src/lib/content/discovery/entries/answers.ts`).

No manual editing of index, category, or discovery files is needed!

---

### 5. Verification Gate (Mandatory)

Run all targeted tests and static analyses before committing:

1. **Answer Unit Tests**:
   ```sh
   bun test apps/web/src/lib/content/answers/
   ```
   _Verifies schema validation, British English spelling check, slug uniqueness, link liveness, structured data, and category coverage._
2. **Discovery Intent Audit**:
   ```sh
   bun scripts/discovery-audit.mjs
   ```
   _Ensures 0 overlap errors and verifies canonical registration._
3. **Type & Lint Check**:
   ```sh
   bun run lint:types
   bun run lint
   ```

---

### 6. Pull Request & Review Loop

1. Create a dedicated branch off `origin/staging`:
   ```sh
   git checkout -b feat/<issue>-<kebab-name> origin/staging
   ```
2. Commit with conventional gitmoji:
   ```sh
   git commit -m "✨ feat(answers): add <question summary> answer page (#<issue>)"
   ```
3. Push to origin (`--no-verify` to bypass slow pre-push hooks):
   ```sh
   git push -u origin feat/<issue>-<kebab-name> --no-verify
   ```
4. Open the Pull Request targeting `staging`:
   ```sh
   gh pr create --base staging --title "..." --body "..."
   ```
5. Run the automated review fix loop:
   ```sh
   bun run pr:fix <pr-number>
   ```
   _The loop polls for Copilot/bot reviews and check failures, automatically dispatching an agent pass to resolve findings._

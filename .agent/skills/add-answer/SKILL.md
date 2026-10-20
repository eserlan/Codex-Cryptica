---
name: add-answer
description: Add a new Codex Cryptica reference answer page (/answers/[slug]) covering an authentic TTRPG or worldbuilding question. Enforces British English, direct snippet-first answers, intent-fit teaching formats, actionable worked examples, Discovery Intent Governance (Constitution XIII), live route validation, R2-only images, and category registration.
---

# Add an Answer Page

Answer pages (`/answers/[slug]`) are reference entries for real tabletop RPG and worldbuilding questions that players and Game Masters search for, not shallow SEO landing pages and not dated blog posts.

One page owns one genuine user intent (Constitution XIII). The substantive answer is structured data (`AnswerConfig`), landing in crawler-visible HTML without requiring a bespoke Svelte page per question.

---

## Editorial & Style Rules (Mandatory)

1. **British English throughout** (Constitution & Issue #2563/#2564):
   - Use `-ise` endings (`organise`, `recognise`, `realise`, `specialise`, `characterise`).
   - Use British spellings (`colour`, `honour`, `behaviour`, `rumour`, `favourite`, `neighbour`, `centre`, `theatre`, `catalogue`, `grey`, `cancelled`, `defence`, `offence`).
   - **Never use American travel conjugations**: Use `travelled`, `travelling`, `traveller`, `travellers` (the test suite rejects `traveled` and `traveling`).
2. **Direct Answer First (`shortAnswer`)**:
   - Must be a single self-contained paragraph that directly answers the question before any body prose. Use the space needed to preserve the important distinction; there is no character floor.
   - Forms the structured FAQPage JSON-LD snippet; it must make total sense when read in search engine results out of context.
3. **Strict Ban on Obvious AI Writing Tells (Zero Tolerance)**:
   Prose must read as authentic, authoritative tabletop literature written by an experienced Game Master. Obvious LLM signatures degrade credibility immediately:
   - **Zero Em Dashes (Unicode U+2014) or En Dashes (Unicode U+2013)**: Absolutely forbid em dashes and en dashes in all fields (`shortAnswer`, section headings, prose paragraphs, list intro/terms/text, example blocks, checklist items, `codexConnection`, and SEO metadata). The em dash is the single most identifiable LLM marker. Use standard punctuation: commas, colons, semicolons, parentheses, full stops, or ordinary hyphens (Unicode U+002D) for compound adjectives (`session-long`, `step-by-step`, `tabletop-ready`).
   - **Zero Emojis**: Never use any emoji character (decorative pictographs such as sparkles, dice, or arrow glyphs) anywhere in answer files. Answers are permanent, authoritative reference documents, not social media posts.
   - **No Synthetic AI Buzzwords & Fluff**: Reject synthetic vocabulary that makes copy read like a boilerplate marketing brochure. Specifically avoid:
     - Synthetic fillers: `delve`, `tapestry`, `testament`, `beacon`, `plethora`, `myriad`, `vital`, `crucial`, `paramount`, `pivotal`, `holistic`, `synergy`, `foster`, `embark`, `nestled`, `treasure trove`, `realm`, `cornerstone`.
     - Fluffy marketing adjectives: `seamless`, `effortless`, `game-changing`, `revolutionary`, `transformative`, `robust`, `vibrant`, `richly detailed`, `meticulous`, `cutting-edge`.
     - Inflated verbs: `elevate`, `supercharge`, `unleash`, `unlock`, `harness`, `leverage`, `navigate the intricacies of`.
       State mechanical actions plainly (`track`, `note`, `roll`, `draft`, `sketch`, `reveal`, `constrain`).
   - **No Throat-Clearing Openers**: Never start the `shortAnswer` or first section with broad, sweeping generalizations ("In the vast world of tabletop roleplaying...", "Whether you are a seasoned game master or running your first campaign...", "At its core...", "Every GM knows that..."). Open immediately with the mechanical constraint, table dilemma, or friction point.
   - **No Symmetrical Contrast Cadences or Generic Contrast Formulas**: Avoid repetitive rhetorical swings like "It is not about X; it is about Y", "X isn't just Y, it's Z", "Not only does this X, but it also Y". State the point directly without artificial rhetorical symmetry.
   - **No Formulaic Boilerplate Conclusions**: Never end sections or the answer with decorative moralizing recaps ("Ultimately, the key is...", "In conclusion...", "By keeping these principles in mind, your world will come alive..."). When the practical explanation is finished, stop.
   - **Break the Uniform AI Cadence**: Avoid uniform 3-sentence paragraphs or lists where every bullet has the exact same grammatical shape (e.g. bold verb-noun phrase followed by 12 words of generic explanation). Vary sentence lengths and paragraph depths to match genuine human technical writing.
4. **Editorial Quality Beyond Compliance (Mandatory)**:
   Apply this as a final editorial pass. These checks concern the answer's usefulness and judgement, while the AI-writing-tells section above concerns detectable patterns.
   - **Give the answer one editorial spine**: Before drafting sections, write the one sentence the whole answer is teaching. For example: "A faction turn should answer one question: what changed in the world while the players were busy elsewhere?" Choose sections that develop that idea for the declared reader; omit blocks that add no useful explanation or action.
   - **Use realistic failure cases**: When a comparison helps, its weak or default approach should describe a competent GM's genuine friction, not an absurd straw man. Show how increasing complexity makes actions, changes, and visible consequences harder to track.
   - **Avoid unsupported precision and theatrical certainty**: Do not invent timelines, percentages, time costs, frequencies, or universal outcomes. Use specific numbers only when sourced or clearly labelled as an example.
   - **Separate strong advice from universal rules**: State a useful heuristic confidently, but qualify it when circumstances change. Reserve absolute language for procedures that genuinely require it.
   - **Prefer ordinary tabletop language**: Use the simplest terms that preserve meaning. Prefer "factions that currently matter to the party" over "organisations within the party's operational area", and "NPC, place, or rival" over "target entity" where appropriate.
   - **Optimise for economy**: After drafting, remove repeated thesis statements, setup that merely restates a heading, and explanations the worked example already demonstrates. Read the shortAnswer, opening, headings, example, checklist and ending together, including optional blocks only when present. Remove repeated reassurances, redundant introductions and takeaways that merely restate the lesson. Fix micro-copy such as "memorise every die from memory". Judge cuts by retained meaning and reader progress, not a percentage or word-count target; preserve rules distinctions and useful practical detail.
   - **Make examples prove the advice through play**: For narrative or game-prep guidance, show a consequence the players can encounter, such as a blocked road, missing contact, price increase, changed patrol, new rumour, burned district, or political demand. An example that only paraphrases the framework is not enough.
   - **Vary authority and cadence naturally**: Mix direct procedure, conditional advice, concrete examples, and brief reasoning. Authoritative writing can contain uncertainty where the table's circumstances genuinely matter.

   Keep these examples concise and use them as editorial checks:

   - **Failure case**: "Every GM ends up with sprawling spreadsheets, dozens of numerical stats, and hours of simulation."
     **Better**: "As more factions become active, it becomes easy to lose track of who acted, what changed, and which consequences the players have actually seen."
   - **Unsupported certainty**: "By the fourth session, the party will have forgotten the original clue."
     **Better**: "If a clue has not returned to play for several sessions, give the players a fresh way to recognise its importance."
   - **Universal rule**: "If the players ignore the faction, it succeeds automatically next turn."
     **Better**: "If nobody meaningfully opposes the move, consider resolving it without a roll. If another faction or obstacle still resists it, use the normal resolution procedure."

5. **Choose Structure by Reader Intent**:
   Before drafting, state the intended reader level, the question they need answered, and what they should be able to do afterwards. Keep this drafting note outside the published data. Select the teaching format from that job, not from a fixed article recipe:

   | Reader job                           | Useful teaching format                                                                                                                    | Evidence of success                                                      |
   | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
   | Learn beginner rules                 | Define notation and abbreviations; walk through realistic inputs, rolls, modifiers, results and the next action; address likely mistakes. | The newcomer can perform the procedure without guessing a missing step.  |
   | Apply a GM technique or prepare play | Show a concrete situation, an intervention and a changed outcome at the table. Use before/after only when it illuminates the change.      | The reader can prepare or run a choice with player-visible consequences. |
   | Compare options                      | Show trade-offs, decision criteria and when each option fits.                                                                             | The reader can choose for their circumstances and explain the cost.      |
   | Understand a definition or reference | Give the direct definition, boundaries and clarifying examples where useful.                                                              | The reader can recognise an instance and distinguish a nearby concept.   |

   Use any supported combination of `prose`, `list`, `example`, `checklist` and `table`. There is no universal section count and no required example, checklist, before/after pair or "Why it works" paragraph. A short definition can be complete without a prep checklist. A useful standalone example may still deserve the distinct `example` block; do not hide demonstrations merely to avoid the old formula.

   **Demonstrate mechanical guidance**: include explicit inputs and a real result. For the dice question (#3895), a stated attack bonus of +5, target Armour Class (AC) 15 and twenty-sided die (d20) result of 12 gives 12 + 5 = 17, a hit. With listed damage 1d8 + 3 and a stated eight-sided die result of 6, report 6 + 3 = 9 damage to the Dungeon Master (DM). Use the listed bonus once; do not add its included ability or proficiency modifiers again. The numbers are illustrative, not requirements for every article. Explain what a miss would change when useful. Never generalise this attack-then-damage sequence into a rule that all healing or damage begins with a d20.

   **Ground the explanation for its audience**: define abbreviations before relying on them. Validate concrete mechanics against authoritative rules or publisher material and link the relevant source. Identify the edition, and label significant 2014/2024 D&D differences instead of combining their rules. Recheck version-sensitive claims rather than copying a familiar example. Separate a chosen example, a useful heuristic and an actual rule; avoid invented prerequisites, misleading modifiers and overconfident absolutes.

6. **Relevant Links and Honest Product Connection**:
   - Choose links for the reader's next job. Prefer the cornerstone and directly relevant neighbouring Answers. When discovery overlap is recorded, consider whether the neighbouring page also deserves a visible reader link; registry metadata alone does not render one.
   - `relatedTools`, topic/hub recommendations and `codexConnection` are optional. Zero related tools is better than a weakly related recommendation: an NPC/name generator does not help someone who only needs to understand dice. Retain meaningful related-Answer links and their reciprocity; do not add product links to meet a quota.
   - Include `codexConnection` only when a verified, currently available capability helps this specific workflow. Check the product code or current help material and the destination route. Keep it restrained and after the question has been fully answered. Omit it when there is no useful connection; never invent a feature or ask the reader to start onboarding before they have an answer.
   - **Never link to a competing product.** Answers are our own reference content, so they do not send readers to a competitor. Do not link to virtual tabletops or campaign and world managers (Foundry VTT, Roll20, Fantasy Grounds, Owlbear Rodeo, World Anvil, Kanka, LegendKeeper, Obsidian Portal), in prose, tables, `systemsThatSupportThis` or any other field. If a reader's question names one, say in plain text what they need to know (for example that an official system exists) and link to the publisher or rules source instead. Do not build a page around a competitor's compatibility, package versions or listings, and do not target a competitor's name in `discovery` intents. The `competitor-link` check enforces the links; the list lives in `COMPETITOR_DOMAINS` in `scripts/check-answer-editorial.ts`.
7. **Clean List Item Titles (No Redundant Numbering)**:
   - When items in a `list` block use bold lead-in terms (`term: "..."`), do not set `ordered: true` and do not prefix the term with digits (e.g. use `term: "Review hooks"` rather than `term: "1. Review hooks"`). The template renders clean terms without duplicate numbers.
8. **Optional `systemsThatSupportThis` (#2769)**:
   - Only add an entry when a named RPG system has an actual rule or procedure for this topic (a named mechanic, not a matching genre or vibe). "Blades in the Dark" belongs on a heist answer because of its flashback/clock rules; a generic fantasy heartbreaker that merely permits heists does not.
   - Each entry needs `system`, one-sentence `rationale` naming the specific mechanic, and an external `href` to the system's own site or its publisher.
   - Roughly 2 to 4 entries where genuinely applicable. Omit the field entirely rather than padding it with a loosely-related system.

---

## Automated Editorial Checks (#4012)

The rules a machine can decide without judgement are enforced by `scripts/check-answer-editorial.ts`. It runs on every changed Answer page inside `bun run lint:changed`, so CI's changed-file Lint step fails with the file, line, field path (e.g. `sections[6].items[1].text`) and an excerpt, plus an inline PR annotation.

| Rule                | What fails                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `prohibited-dash`   | An em dash (U+2014) or en dash (U+2013) in any reader-facing field: question, `shortAnswer`, every section field, `codexConnection`, CTAs, system rationales, link titles/descriptions, SEO title/description/alt. |
| `emoji`             | An emoji-presentation character (🎲, ✨, ❤️). Plain notation symbols such as ★, ✓, →, © and ™ are not flagged.                                                                                                     |
| `blank-text`        | A whitespace-only question, `shortAnswer`, section heading, `codexConnection` heading/link text, or SEO title/description/alt.                                                                                     |
| `image-alt-missing` | `seo.image` is set but `seo.imageAlt` is missing or blank.                                                                                                                                                         |
| `invalid-date`      | `publishedAt` is not a real calendar date (e.g. `2026-02-30`).                                                                                                                                                     |
| `future-date`       | `publishedAt` is after the check date. See the date policy below.                                                                                                                                                  |
| `competitor-link`   | A link to a product that competes with Codex Cryptica (virtual tabletops and campaign managers such as Foundry VTT, Roll20 and World Anvil), in any field including `href`. See the competitor links rule above.   |

Not checked: URLs (`href`, `seo.image`, `seo.canonical`), slugs, enums, labels, `relatedAnswers` and the `discovery` block, which are metadata rather than copy. Prose economy, argument quality and whether an example is realistic stay with editorial review; do not add regex checks for them.

**Publication date policy.** Answers have no scheduled publishing: a page is live as soon as it deploys, whatever its `publishedAt`. Set `publishedAt` to the date the page will actually ship. A date up to 7 days ahead of the check date only warns (for example, an Answer merged on 2026-10-12 for the next day's release with `publishedAt: "2026-10-13"`). More than 7 days ahead fails. Pass `--as-of YYYY-MM-DD` to check against a planned release date instead of today.

**Rules owned elsewhere** (not repeated by this checker): British English, SEO length limits, the R2 image requirement and live-route links are in `apps/web/src/lib/content/answers/registry.test.ts`; related-answer links and reciprocity in `bun run check:answer-mesh`; intent ownership in `bun scripts/discovery-audit.mjs`.

**Legacy debt.** Violations that predate the checker are counted per answer and rule in `scripts/answer-editorial-baseline.json`. A changed file passes only while its count for each rule stays at or below the baseline; any new violation fails the whole rule for that file. The baseline only goes down: when a changed file has fewer violations than its baseline allows, the check fails until you run `bun scripts/check-answer-editorial.ts --update-baseline` in the same change. Never raise it to let new copy through.

```sh
bun scripts/check-answer-editorial.ts --files apps/web/src/lib/content/answers/pages/<slug>.ts
bun run check:answer-editorial   # full audit, lists baselined legacy violations too
```

---

## Step-by-Step Implementation Workflow

### 1. Check Discovery Intent (Constitution XIII)

Every public answer page is governed by the Discovery Intent Registry:

1. Run the discovery audit to check existing intents and cluster owners:
   ```sh
   bun scripts/discovery-audit.mjs
   ```
2. Verify the intent is distinct: do not create a second URL for a synonym or word-order variant of an existing answer.
3. Identify the parent cluster (e.g. `session-prep`, `worldbuilding`, `adventure-mapping`, `npc-creation`) and search intent aliases. You will define these directly in the answer file's `discovery` object (no separate registry file edit required).

---

### 2. Image Asset Workflow (Cloudflare R2 Only, Mandatory)

> [!IMPORTANT]
> **Every answer page requires an R2 illustration.** `seo.image`/`seo.imageAlt` are enforced by `registry.test.ts` for every answer with `publishedAt` on or after 2026-09-07; skipping the image will fail that test. **NEVER commit image files to git.** All image assets belong exclusively in Cloudflare R2 (`codex-cryptica-statics` bucket served via `https://assets.codexcryptica.com/`). Any local files created temporarily during generation must be deleted immediately after upload.

1. Generate or prepare a 16:9 illustration for the topic:
   - **Aspect ratio**: Strictly `16:9`.
   - **Art Direction (Grounded Cinematic Realism)**: Adhere to [docs/ART_DIRECTION_EDITORIAL_IMAGES.md](../../../docs/ART_DIRECTION_EDITORIAL_IMAGES.md).
     - Target: Painterly digital realism, cinematic lighting (golden hour, firelight, twilight, mist), environmental storytelling, authentic textures and dress. Full-bleed edge-to-edge framing.
     - Strictly forbidden: Storybook/fairytale styles, borders/frames/parchment mats, text/runes/banner labels, flowchart/diagrammatic layouts.
     - Prompt formula: `Cinematic concept art, wide shot of [grounded scene and cultural interaction]... [authentic materials and garments]... [motivated lighting and atmospheric haze]... No text, no frames, no borders.`
   - **Tool fallback order:** try the `agy` CLI first. If `agy` reports its image-generation quota is exhausted, fall back to `codex`. If `codex` also fails, fall back to Claude Code's own image generation. Only move to the next tool once the current one has failed or is out of quota.
   - **`agy` in headless mode:** a plain `agy -p "<prompt>"` can fail with `a tool required the "command" permission that headless mode cannot prompt for`, since there is no interactive session to approve the permission. This is a local sandbox/permission issue, not a quota failure, so it does not mean falling back to `codex`. Retry once with `agy --dangerously-skip-permissions -p "<prompt>"` before treating it as a genuine `agy` failure — this only auto-approves tool calls inside `agy`'s own sandboxed image-generation run in the current directory (the scratchpad), it does not touch the surrounding session's permissions.
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

Create `apps/web/src/lib/content/answers/pages/<slug>.ts`. Start from the minimal shape below and choose body blocks for the reader job above. This is an authoring scaffold, not a prescribed section sequence. `publishedAt` is the actual shipping date.

```ts
import type { AnswerConfigInput } from "../schema";

export const <camelCaseName>: AnswerConfigInput = {
  slug: "<kebab-case-slug>",
  category: "session-prep", // "getting-started" | "session-prep" | "adventure-design" | "running-the-game" | "worldbuilding" | "campaign-notes"
  publishedAt: "<YYYY-MM-DD>",
  question: "<Verbatim Question Ending in ?>",
  kind: "definition", // "definition" | "how-to" | "framework" | "comparison"
  shortAnswer: "<Self-contained direct answer with no introductory filler.>",
  sections: [
    {
      kind: "prose",
      heading: "<Heading that helps the reader find the explanation>",
      paragraphs: ["<Explanation that adds to, rather than repeats, the direct answer.>"],
    },
    // Add, replace or omit blocks according to the actual question.
  ],
  relatedAnswers: ["<directly-relevant-existing-answer-slug>"],
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

Use these optional block patterns only when they teach something the prose has not already established:

```ts
// A walkthrough can show a sequence without a contrived weak/strong pair.
{
  kind: "example",
  heading: "<Specific situation or procedure>",
  paragraphs: ["<Starting information the reader will use.>"],
  items: [
    { term: "<Step or decision>", text: "<Input, calculation/action and result.>" },
    { term: "<Next action>", text: "<What the reader or players do with that result.>" },
  ],
}

// For a comparison, show the criteria that change the reader's choice.
{
  kind: "table",
  headers: ["<Option>", "<Fits when>", "<Cost or limitation>"],
  rows: [["<Option name>", "<Relevant circumstance>", "<Concrete trade-off>"]],
}
```

A `checklist`, if useful, needs at least two actionable items; it need not recap every section. `systemsThatSupportThis` is optional and follows rule 8 above. Omit `relatedTools`, `relatedTopics`, `relatedForPages` and `codexConnection` when they have no relevant purpose; link arrays default to empty. When adding a product connection, use its schema fields (`heading`, `paragraphs`, `linkText`, `href`) and a verified live destination.

For the original/corrected dice comparison and contrasting definition/worldbuilding demonstrations, read [the editorial benchmark](../../../docs/answer-editorial-benchmark-3918.md). Assess what the reader can now calculate, recognise, decide or prepare. Structural compliance does not establish editorial completeness. Independent factual and editorial verification, including the existing post-merge review and `copy-fix` loop, still matters; reducing valid review reports is not a quality target.

---

### 4. Connect & Update the Knowledge Mesh

Reference answers must form an interconnected web, never dead ends. When publishing a new answer:

1. **Reciprocal Linking**:
   - Check the answers you listed in `relatedAnswers`.
   - Update those existing answer files (`apps/web/src/lib/content/answers/pages/<existing-slug>.ts`) to include your new answer's slug in their `relatedAnswers`.
   - Or run the automated fixer:
     ```sh
     bun run check:answer-mesh --fix
     ```
2. **Intent Pruning & Alias Migration (Constitution XIII)**:
   - If an existing broader answer in your cluster currently carries an `intentAlias` that your new, specialized page now directly answers, prune that alias from the existing answer's `intentAliases`.
3. **Mutual Overlap Acknowledgment**:
   - If your answer shares significant vocabulary or cluster scope with an existing answer, ensure both answers acknowledge each other via `acknowledgedOverlap: [{ with: "<other-intent-id>", reason: "<distinct-role-rationale>" }]`.
4. **Link to worked examples, reader-facing, not just in the discovery registry**:
   - If a relevant `/examples/<slug>` page exists (or is being added alongside this answer), link to it from within a `prose` section using that block's optional `cta` field:
     ```ts
     {
       kind: "prose",
       heading: "<Framing sentence for the example>",
       paragraphs: ["<One sentence setting up what the example shows.>"],
       cta: {
         text: "Read the <Example Name> example",
         href: "/examples/<example-slug>",
       },
     },
     ```
   - See `how-do-you-run-a-heist-in-a-tabletop-rpg.ts`'s "See a table-ready score in action" block for the precedent.
   - **This step is easy to miss**: adding the example to `discovery.relatedIntents`, or linking the example's own `relatedAnswers` back to this page, does not put a link on the rendered answer page itself. `check:answer-mesh` and the discovery audit only check answer-to-answer reciprocity and intent-registry consistency — neither one catches a missing answer-to-example link, so this has to be done by hand and verified by reading the finished page, not by a green test run.

---

### 5. Sync Answer Registries

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

### 6. Verification Gate (Mandatory)

Run all targeted tests and static analyses before committing:

1. **Answer Mesh Check**:
   ```sh
   bun run check:answer-mesh
   ```
   _Audits outbound links, ensures no broken links, and verifies reciprocal cross-links._
2. **Answer Unit Tests**:
   ```sh
   (cd apps/web && bunx vitest run src/lib/content/answers/)
   bun test ./scripts/check-answer-mesh.test.ts
   ```
   _Verifies schema validation, British English spelling check, slug uniqueness, link liveness, structured data, and category coverage._
3. **Answer Editorial Check**:
   ```sh
   bun scripts/check-answer-editorial.ts --files apps/web/src/lib/content/answers/pages/<slug>.ts
   ```
   _Fails on em/en dashes, emoji, blank headings, missing image alt text and bad `publishedAt` dates. Also runs inside `bun run lint:changed`. See Automated Editorial Checks above._
4. **Discovery Intent Audit**:
   ```sh
   bun scripts/discovery-audit.mjs
   ```
   _Ensures 0 overlap errors and verifies canonical registration._
5. **Type & Lint Check**:
   ```sh
   bun run lint:changed
   bun run test:changed
   # Type-check only the affected web workspace:
   (cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error)
   ```
6. **Rendered Deployment Smoke Check (#4013)**:
   Once a Cloudflare Pages preview or staging build is available, verify the exact rendered artifact:
   ```sh
   bun run verify:rendered-answer <slug> [--base-url <preview-url>] [--mobile]
   ```
   _Asserts HTTP 200, matching H1, non-empty excerpt, canonical and SEO metadata, live R2 image assets (HEAD 200), valid internal links, and no horizontal overflow on mobile viewports (375px)._

---

### 7. Pull Request & Review Loop

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

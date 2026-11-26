# Generator changes and public copy (#4309)

Changes to the actual output or exposed features of a generator can leave
linked Answer pages and topic hubs describing old behaviour. The previous
heist-generator inconsistency is an example.

The lightweight, non-blocking review report is:

```bash
node scripts/generator-content-impact.mjs --base origin/staging
node scripts/generator-content-impact.mjs --all
```

The staging PR workflow runs this as an **advisory** and publishes the output
in its job summary. Initially, explicit mappings cover **Heist** and
**Point Crawl**; expand this mapping as we validate other generators rather than
guessing from general-purpose engine refactors.

If an output schema, live affordance, generator feature or default changes:

1. Check whether the report lists an Answer, topic hub, example, `/for` page
   or tool page that claims something affected.
2. Compare with actual generator output (not a roadmap or prompt wording).
3. Update any affected public copy, linked worked examples or FAQs.
4. In the PR, leave a brief **"Public copy reviewed"** note, including
   "No changes needed" when that is the correct conclusion.
5. Do not regenerate content automatically, create mandatory new pages, or fail
   the build because of a possible editorial relationship.

Internal refactors need no additional editorial work when shipped behaviour is
unchanged. This is a reminder and a candidate list, not a gate.

---

# Generator landing-page migration standard (#5231)

This section applies when replacing a public \`/generators/*\` fallback guide, refreshing
an existing slug-specific guide, or changing the page's educational and
product-continuation copy. **The goal is useful, distinctive pages, not simply
the removal of duplicate sentences.** Treat each migration as a small
content-and-product review, not a synonym-replacement exercise.

## 1. Inspect the shipped generator before drafting

Record the following in the PR notes (a concise table is fine):

- Actual controls and defaults, and which outputs they affect.
- A representative real generation in **non-AI and AI modes** where available;
  distinguish a static/demo example from a generated result.
- Section headings, output schema/entity types, and the most useful
  distinctive feature(s) for a GM.
- The actual public **Copy / Save to Codex / regenerate** behaviour, including
  whether a result must be explicitly generated before a save CTA appears.
- The **real import/handoff shape**: one Markdown entity, structured entities,
  NPCs, relationships, maps and other linked data may differ by generator.
  **Never promise linked entities or preservation of structure without testing.**
- Existing relevant Answers, hubs and complementary generators, checking
  canonical destinations instead of relying on plausible slugs.

If the audit cannot establish a claimed feature, omit that claim or open a
bounded follow-up. The generator's prompt or roadmap is not evidence of what a
visitor receives. Follow the existing public-copy consistency review above
when output features changed.

## 2. Choose an editorial proposition, not a shared template

Before writing, finish these two sentences in the PR notes:

- **This generator uniquely helps a GM _[do X]_ by _[mechanism Y]_.**
- **After reading this guide, the GM can _[do something useful at the table]_.**

Then author an introduction and guide that fulfil those promises:

- Refer to **actual named controls** and explain why a specific combination
  matters, rather than instructing users to "customize genre and tone".
- Include at least one **concrete play consequence**: an actionable decision,
  conflict, lead, encounter, relationship, or changing situation.
- Prefer sharp, generator-specific examples over abstract "refine this draft"
  advice. Provide helpful specificity without inventing product capabilities.
- Keep lore-creation advice in the **GM guide** and saving/adoption guidance
  near the **completed result**. Do not spend a third of the GM guide
  describing browser storage.
- Vary angle, voice, headings and number of ideas to suit the generator.
  Do **not** mechanically reproduce three headings from another migrated page.
  The existing \`GeneratorGuide.summary/tips/links\` data shape can be reused;
  where a particular issue asks for three tips, make each do a _different
  actual job_, not three variations of the same generic instruction.
- Keep copy succinct, human, genre-appropriate and useful even to someone
  who never saves a result. No keyword stuffing, padding or SEO guarantees.

**Editorial contrast examples, not mandated headings:**

| Generator            | Natural angle                                                    |
| -------------------- | ---------------------------------------------------------------- |
| Nation               | Power, legitimacy, competing institutions and a political crisis |
| Dark Fantasy Faction | Moral compromise, dependency and breaking points                 |
| Nomad Clan           | Movement, logistics, contested routes and loyalty                |
| Star System          | Exploration, distances, resources and travel hazards             |

Avoid boilerplate such as "Keep only what sparks play" or "Customize genre and
tone first" unless the advice has genuinely become specific to the tool.

## 3. Make examples and FAQs earn their space

- Review the visible sample for grammar, internal consistency, repetition,
  promises that exceed the full output, and clarity that it is an **Example**
  when its settings intentionally differ from the form defaults.
- Show a plausible pressure or situation a GM can run rather than only a
  decorative name or two-sentence premise, where the page supports it.
- FAQs should answer **real questions specific to this generator**, including
  likely misconceptions or limitations; keep generic no-account/system
  compatibility facts only when helpful, without cloning whole FAQ sets.
- Do not silently change the generator's mechanics to satisfy the copy.

## 4. Curate educational continuations

- Usually offer **up to three** editorially chosen Answers, if genuinely
  relevant; three is a target for richer tools, **not a quota**.
- Each link needs a brief description explaining _what the visitor can do_
  after reading it. Avoid generic "Further reading", unrelated session-prep
  links and duplicated/recycled recommendations.
- Link using crawlable, accessible ordinary anchors with verified canonical
  paths. Preserve useful links already present; do not create a second
  competing links section.
- Where naturally relevant, add a contextual reciprocal path from an Answer
  to the generator, or record a scoped Answer-page follow-up. Do not turn
  every Answer into a promotional landing page.
- Position learning links after the GM guidance and before related tools,
  unless this page has a better evidenced information hierarchy.

## 5. Treat adoption as a useful next action, not a sales block

The intended optional journey is **discover → learn/generate → keep developing
the result in Codex Cryptica**.

- Audit **eligibility** before adding or rewriting a CTA. Use the shared
  generator-to-vault pattern from **#5136** and the established
  **#4624/#4625** handoff, not a bespoke importer or duplicate button.
- On a successful **explicit** generation, keep a concise,
  generator-specific **Add to My Codex** continuation near the finished
  result/actions. Explain _why retaining this particular output matters_
  using only verified importable features. A preloaded example, failure or
  loading state must not masquerade as a successful generated result.
- Do not force a vault on copy-first tools or get in the way of
  Copy/Reroll/Share/Session Hub. Avoid a long mobile benefits wall.
- Be exact about state: **ready/staged for import is not saved** until the
  local import succeeds. Browser-local/no-account messaging must be true;
  provide existing recovery/copy fallback on failure.
- When an Answer sends visitors back to the generator, avoid losing their
  draft unnecessarily. If this requires a new persistence contract, document
  a bounded follow-up rather than introducing one in an editorial PR.
- **#5046** owns public-only exposure/click/placement/variant measurement.
  Keep private lore, generated prompts/results, identifiers, OPFS/vault
  events and local entity contents out of analytics. **#4626** owns
  in-vault contextual actions after import. Reuse, do not duplicate.

## 6. Verification and PR evidence

Test/review the **rendered staging page**, not just the TypeScript string:

- [ ] Intro, guide, example and FAQ feel specific to the selected generator,
      not a name-swapped sibling page.
- [ ] Each product claim is verified against visible controls, representative
      AI/non-AI output and supported import shape; limitations are honest.
- [ ] At least one piece of advice yields a concrete next-session decision
      or consequence. Guide and CTA have separate editorial jobs.
- [ ] Answer links resolve in staging/production, are contextual and
      accessible; reciprocal links are assessed, not blindly added.
- [ ] Completed-result continuation is accurate, discoverable, compact and
      shares the existing handler; copy-first use remains frictionless.
- [ ] Example/default distinctions, grammar and FAQ specifics are reviewed.
- [ ] At roughly 360px, 390px and desktop: no clipping, horizontal overflow,
      hidden actions, huge promotional block or broken focus order.
- [ ] Explicit-generation, sample, failure, copy and save/handoff states get
      smoke coverage proportional to the change; use existing regression
      tests and preserve privacy boundaries.
- [ ] PR includes **"Public copy reviewed"** with a brief list of actual
      controls/output inspected, the editorial proposition, curated link
      choices, save/import capabilities verified and any deferred issue(s).

**Scope management:** The per-page migration can ship as one bounded PR. Where
a missing import contract, product-wide CTA rollout, analytics or in-vault
feature makes part of the ideal journey impossible, link a follow-up to
**#5136**, **#5046** or **#4626** (as applicable). Do not block replacing
harmful generic copy on building unrelated new functionality. Existing
\`noindex\` alternatives in #5231 remain possible when quality content
cannot be provided.

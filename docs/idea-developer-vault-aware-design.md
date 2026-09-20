# Idea Developer: vault-aware version (design)

Status: design only, no code. Written for #3228 (FR-028, FR-029). Nothing here
is built, and nothing in the public tool depends on it.

The public Idea Developer at `/tools/idea-developer` develops an idea using
only what the visitor typed. This document describes how a later, signed-in
version could develop the same idea **in the context of the user's own world**,
so the public tool's structure does not block it.

> **Develop this idea in the context of my world.**

## What it is for

Using existing entities, relationships, timeline facts, factions, settlements
and unresolved threads to:

- spot contradictions between the idea and what is already true;
- find existing material worth reusing instead of inventing something generic;
- connect the idea to established lore;
- suggest changes that fit the user's world.

The principle from the public tool still holds: **develop the user's idea, don't
replace it.** Vault context is there to ground the development, not to swap the
idea for something the vault already contains.

## The flow

The whole vault is never sent. Each step narrows what goes to the model.

1. **The user submits an idea** and chooses to develop it in the context of
   their world. This is a separate, deliberate choice every time (see
   "Privacy conditions").
2. **Identify the concepts the idea implicates.** Names, places, groups and
   terms in the idea that may match existing entities, plus their aliases.
   This is a local step, run in the browser against the local search index. No
   model call is needed for a first version.
3. **Retrieve a compact context package.** For each implicated concept: a short
   excerpt, its type, its labels, and how it relates to the others. Add a
   small number of graph neighbours where the idea touches a connected group.
   The package has a hard size budget and a hard entity count.
4. **Show the package to the user** before anything is sent (see "Inspecting the
   context").
5. **Develop the idea against the package.** The same eight sections as the
   public tool, grounded in the selected context.
6. **Surface contradictions and reuse.** Anything in the idea that conflicts with
   a supplied fact, and any existing entity that fits, is called out explicitly
   with the entity named.
7. **Suggest changes that fit.** Options for adjusting the idea or the world,
   never applied automatically.
8. **Continue over several turns.** Later turns add only what is new (see
   "Conversation and delta").

## What the package contains

A `ContextPackage` is a small, inspectable record:

| Field             | Meaning                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `entities[]`      | Selected entity excerpts: `id`, `title`, `type`, `labels`, a short `contentExcerpt` and optional `loreExcerpt`               |
| `relationships[]` | Only the links between the selected entities, with their direction                                                           |
| `facts[]`         | Dated or otherwise load-bearing facts pulled from those entities (for example a timeline entry), each with its source entity |
| `reasons`         | For each entity, why it was selected: a name match, an alias match, a neighbour of a matched entity, or a label match        |
| `excluded`        | Entities that matched but were left out, with why (budget, visibility, not relevant enough)                                  |
| `budget`          | The limits applied and how much of each was used                                                                             |

Rules:

- **Visibility is respected.** Entities the app treats as not visible are never
  selected, using the same visibility check (`isEntityVisible`) as the existing
  retrieval service.
- **Excerpts, not documents.** Long entities are cut to the part that matters,
  and the package says when it cut.
- **No private-mode text.** Lore hidden from guests stays hidden.
- **Nothing is invented.** The package holds only what is in the vault. Anything
  the model adds beyond it is flagged as unsupported.

## Inspecting the context

The user must be able to see, and debug, what was retrieved.

- **Before sending:** a preview lists every selected entity with its excerpt and
  the reason it was chosen, and every excluded entity with the reason. The user
  can remove an entity, add one, or cancel.
- **After the response:** the result shows which entities it drew on. An
  "unsupported addition" marker shows where the model added lore that no
  supplied entity backs.
- **For debugging:** the same package can be copied out as text, so a bad
  result can be traced to bad retrieval or to a bad response.
- **Size is shown:** the entity count and an estimate of how much was sent.

The existing generators already record an `includedContext` list of categories
so the user can see what was included. The vault-aware Idea Developer should
extend that pattern rather than introduce another.

## Result shape

The eight sections carry over unchanged, so the public and vault-aware
versions look the same and a result can move between them.

Two sections are added only in the vault-aware version:

- **Fits with your world**: existing entities that connect to the idea, and
  how.
- **Conflicts to resolve**: contradictions between the idea and supplied facts,
  each naming the entity and the fact. Framed as questions for the creator,
  never as a verdict.

There is still no numeric score. A "conflict" is a fact to decide about, not a
grade.

## Conversation and delta

The public tool uses a multi-turn conversation that the AI provider holds, so
earlier turns are not resent. The vault-aware version can use the same model.
The existing generator sessions already track which lore has been sent so that
later turns send only what is new or changed (`GeneratorSession` with
`LoreDeltaTracker`). The design reuses that: turn one sends the package, later
turns send only entities added to or changed in it.

When the user edits the vault between turns, the changed entities are treated as
new context, as the existing sessions do.

## Reuse of existing machinery (evaluated, not assumed)

| Piece                                                                           | What it gives                                                                                                      | Fit for this use                                             | Gap                                                                                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `GeneratorVaultContext` and `VaultContextEntityExcerpt` (`generator-engine`)    | An excerpt shape with `relationship`, `contentExcerpt`, `loreExcerpt`, `labels`, plus `includedContext` categories | Good starting shape for `entities[]` and the inspection list | No `reasons`, no `excluded`, no `facts[]`                                                           |
| `DefaultContextRetrievalService` (`ai-engine`)                                  | Search-based retrieval over the local index, visibility filtering, a guest fallback                                | Good for step 2 (implicated concepts) and step 3 (retrieve)  | Search returns matches, not "why"; no size budget of its own; free text needs term extraction first |
| `GeneratorSession` and `LoreDeltaTracker` (`generator-engine`, `oracle-engine`) | Send-only-what-changed across turns                                                                                | Good for the conversation                                    | Built for generator drafts; the Idea Developer's turn kinds would need a small adapter              |
| The public tool's `turn-runner`, `conversation` and `hub-sync`                  | Turns, replay, hub draft                                                                                           | Reused as is; only the input builder gains the package       | None significant                                                                                    |

Conclusion: most of the machinery exists. The new work is the **selection with
reasons and exclusions**, the **budget**, the **contradiction and reuse
sections**, and the **preview**. It should live in `packages/` as a
library-first module, with the web app as a thin layer over it.

## Privacy conditions

The public tool sends only what the visitor types. The vault-aware version sends
**vault content** to an AI provider, and the provider holds the conversation
while it continues. That is where the constitution's Principle V exception for
remote handling of vault data comes in. Each of its six conditions has to be
met and shown, not just noted.

| #   | Condition                                                          | How this design meets it                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Off by default                                                     | Vault-aware development is a separate action chosen each time. It never runs as a side effect of the public flow, and the app's "AI Disabled" setting turns it off entirely.                                                                                                                                                                                        |
| 2   | Informed, explicit consent before the first byte leaves the device | The preview is the consent surface. It states in plain language what will be sent (the listed entities), that an AI service processes it, that the service keeps the conversation for its retention period (about 30 days at the time of writing), how to turn the feature off, and how to end and erase the conversation. Nothing is sent until the user confirms. |
| 3   | Reversible                                                         | The user can end the conversation and clear their tab's copy. To delete the provider's copy without contacting support, the proxy needs a delete call for the stored conversation. Until that exists, the design prefers stateless turns for vault content (resend the compact package each turn) and says so honestly.                                             |
| 4   | Local remains authoritative                                        | The vault is the source of truth. Results are drafts. Nothing is written to the vault except when the user chooses to save. Losing the AI service does not affect local use.                                                                                                                                                                                        |
| 5   | No onward sharing                                                  | The AI provider is the only recipient and is named in the consent text. No third party receives it, and it does not enter any training pipeline (the provider's API terms exclude API data from training unless the account opts in; re-confirm per account before launch).                                                                                         |
| 6   | Internal access disclosed                                          | Codex Cryptica stores no request content. The proxy's logs hold metadata only. The consent text says staff cannot read the content, and what metadata is visible.                                                                                                                                                                                                   |

**Open questions**, to settle before any build:

- The existing signed-in AI features (Oracle chat, generator sessions) already
  send vault context to a provider with stored conversations. How they meet
  these six conditions today should be checked, and this design should follow
  the same consent surface rather than invent a second one.
- Whether to require a proxy-side delete for vault conversations, or use
  stateless turns for them.
- Whether the preview should be skippable after the first time, and if so how
  the consent stays informed.

## Analytics

None inside the signed-in vault app. Not a first-party channel, not
privacy-safe counters, nothing (project rule: nothing inside the authenticated
vault is tracked). The public tool's funnel events stop at the public page. A
user moving from the public tool into the vault-aware version is not tracked
once they are inside the app.

## Follow-up: is Jev (TypeSafe) worth it?

Recorded here, **not built**. It depends on Jev access and on the API being able
to support this use.

### The question

Does adding Jev to retrieval-augmented prompting produce measurably better
results than ordinary retrieval plus prompting? Commit to it only if it does.

### What Jev might do

- evaluate whether a generated development is consistent with the supplied world
  context;
- compare several candidate developments and identify which best respects the
  established facts;
- flag unsupported lore additions and contradictions;
- help judge whether the retrieved context was enough for the task.

Possible pipeline:

> idea + relevant vault context → generate several candidate developments →
> Jev evaluates and context-checks → select or refine → return the result

### Test corpus

A small set, written by hand:

1. Simple standalone ideas.
2. Ideas that fit existing world lore.
3. Ideas that deliberately contradict established facts.
4. Ideas where one obscure existing faction or entity is highly relevant.
5. Ideas with too little context to judge safely.

### Approaches to compare

1. **Plain generation**: the idea only, no vault context.
2. **Retrieval-augmented generation**: the idea plus the compact context
   package.
3. **Retrieval plus Jev evaluation and refinement.**

### Measures (manual)

- Preservation of the original idea.
- Lore consistency.
- Useful reuse of existing world material.
- Unsupported invention.
- Playability and actionability.
- Amount of vault context sent.

### Decision rule

Adopt Jev only if approach 3 beats approach 2 on lore consistency or unsupported
invention by a margin a reviewer would notice, without a matching loss in
preservation of the idea or a large increase in context sent or latency.

## Not in scope

- Building any of this.
- Running the Jev comparison.
- Changing the public tool to read vault data (it must not; FR-016).

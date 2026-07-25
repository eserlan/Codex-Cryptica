# Art Direction v2

How Codex Cryptica builds image prompts. Users describe a subject; the system
supplies everything else.

## The pipeline

```
entity/vault canon
      │
      ▼
distillVisualSubject ──► descriptive subject only (no names, style, or camera)
      │
      ▼
composeImagePrompt ────► subject → category → theme → camera → style reference
      │                  plus a separate list of negative terms
      ▼
formatForProvider ─────► negatives in a dedicated field, or inline
      │
      ▼
generateImage
```

The model writes **only** the subject. Everything after that is deterministic:
identical inputs always produce an identical prompt. This is why the subject
prompt in `packages/ai-engine/src/prompts/visual-distillation.ts` explicitly
forbids medium, palette, camera, style lineage, filler, and proper names —
anything the model emits there is duplicated or contradicted by the layers
composed around it.

## Layers

| Layer           | Owns                                                                                                | Source                       |
| --------------- | --------------------------------------------------------------------------------------------------- | ---------------------------- |
| Subject         | Species, role, build, clothing, materials, condition, equipment, expression, posture, action        | AI, from vault canon         |
| Stature         | Standing: mundane, renowned, mythic, or divine                                                      | `art-direction-stature.ts`   |
| Category        | Framing, composition, silhouette readability, depth                                                 | `art-direction-catalogue.ts` |
| Theme           | Medium, palette, lighting logic, material vocabulary                                                | `art-direction-catalogue.ts` |
| Camera          | Focal length, aperture, shot size, angle, lighting recipe, aspect ratio, film stock, lens character | `art-direction-optics.ts`    |
| Style reference | Named lineage, name-free fallback, or nothing                                                       | `art-direction-catalogue.ts` |
| Negatives       | Universal + figure + category failure modes                                                         | `art-direction-negatives.ts` |

Categories never contain medium or palette language, and themes never contain
camera direction — lens, aperture, or shot size. That separation is what lets
any category render in any theme, and both halves are enforced by a test. Two
themes do carry a composition bias that is inseparable from the style
(`mythic`'s hierarchical scale, `pulp_adventure`'s diagonal action layout);
those are the deliberate exceptions.

Category prompts also stay renderable. Brief language written for a human
concept artist — "implies its builders", "communicates intent", "establishes
history" — consumes model attention without steering pixels, and a test keeps
it out.

### Material vocabulary

A theme's handcrafted-goods language ("worn leather, hammered iron") is right
for a figure or a prop and wrong for a mountain range. Themes therefore carry
two material clauses and each category selects via `materialFocus`:

| Focus     | Categories                | Emits                                     |
| --------- | ------------------------- | ----------------------------------------- |
| `craft`   | character, creature, item | Clothing, equipment, props                |
| `terrain` | location, cover           | Landform, architecture, surfaces at scale |
| `both`    | faction, event, note      | Both clauses                              |
| `exalted` | any, via stature          | Materials beyond mortal making            |

## Stature

Categories say what kind of thing is in frame, themes say what world it belongs
to, optics say how it is shot. None of them say whether it is a farmhand, a
duke, a hero, or a god — so before this axis existed, "divine" could only appear
as adjectives in the subject layer, which every later layer overrides.

The failure that produced it: a prompt for elven deities composed the fantasy
material vocabulary — "worn leather, hammered iron ... thatch and slate, moss
and lichen over old masonry" — and rendered a village militia. Six words of
subject lost to sixty words of downstream peasant vocabulary.

Hence the rule the axis is built on: **a contradiction is resolved by
substitution, not addition.** Appending "radiant, divine" to a prompt that still
says thatch and worn leather returns the same militia with a glow on it. So an
exalted stature _replaces_ what it disagrees with:

| Stature    | Replaces                                          | Adds                                                        |
| ---------- | ------------------------------------------------- | ----------------------------------------------------------- |
| `mundane`  | nothing — emits nothing at all                    | nothing                                                     |
| `renowned` | nothing                                           | A standing clause                                           |
| `mythic`   | Material vocabulary, faction signals, wear clause | Hierarchical scale, low angle, rim light                    |
| `divine`   | The same, plus the theme's lighting logic         | Self-originating light, `2:3`, mundane-vocabulary negatives |

Three seams carry it, all of them pre-existing: themes gained
`exaltedMaterials` alongside craft and terrain; the stature's `defaultCamera`
merges over the theme's bias and under any explicit override; and categories
whose prompt asks for wear (`character`, `item`, `location`) carry an
`exaltedPrompt` used in its place. A positive "practical wear — repairs, stains"
standing next to a negative "patched cloth" is a fight the negative block loses,
which is why the clause is swapped rather than countered.

Anything the stature wants _absent_ goes in the negative block and never into
the prompt as a denial: a positive "no banners" tends to produce banners.

**Where it comes from**: labels. `deity`, `god`, `goddess`, `divine`,
`divinity`, `immortal`, `primordial`, `titan` → divine; `legend`, `legendary`,
`demigod` → mythic. The stature ids themselves (`renowned`, `mythic`, …) also
resolve, so any tier can be set explicitly. Highest wins, so a "legendary deity"
is divine, and an explicit `stature` on the compose input overrides the labels
entirely.

Only words that can _only_ mean standing are aliased. `ancient` was deliberately
dropped: it belongs to a ruin, a tome, and a forest far more often than to a
legend, and an exalted stature would strip exactly the weathering a ruin exists
to show. Age, power, and importance to the plot are not stature. A missed
stature costs one explicit label; a false one silently rewrites the entity's
whole material vocabulary.

A vault that uses none of these labels composes byte-identical prompts to before
the axis existed.

**When nothing says**: stage 1 of the distiller — the only stage that reads
vault canon — ends its summary with a `STATURE:` line, parsed against the closed
set and stripped before stage 2 sees it. No extra call, no extra latency: the
classification rides along on a request already being made. Canon is where
standing actually lives ("_worshipped at every crossroads shrine_"); labels and
subject text usually do not carry it.

The instruction is biased hard toward `mundane`, because a loose classifier
makes every character with a sword legendary and the axis stops meaning
anything. Age, power, rarity, and importance to the plot are explicitly not
stature. An unparseable or invented value counts as no signal, so a model that
ignores the instruction leaves the prompt exactly as it would have been.

`metadata.statureSource` records which of the three decided it — `explicit`,
`labels`, or `inferred` — and is stored with the image.

**Where it shows**: the entity panel carries a "Drawn as _X_" badge beside the
labels whenever a stature applies, so the inference is never invisible — and the
label that caused it is right next to the badge. The prompt review dialog's
Advanced art direction section has a Stature selector (defaulting to _Auto (from
labels)_) and reports what the last revision actually composed at, and where that came
from — _your choice_, _from labels_, or _read from your lore_.

## No proper names

The `{subject}` layer must describe what is visually present, never who it is.
Names carry no visual information and push models toward whatever they
associate with the string.

```
Wrong: Valerius, a weary veteran officer...
Right: male human veteran officer, weary expression, scarred obsidian
       breastplate over a patched wool campaign coat...
```

`prepareSubject` in `art-direction-subject.ts` strips names, repairs the
appositive left behind, and falls back to a descriptor when stripping would
leave a fragment. Removed names are kept in metadata for provenance. Multi-word
titles are matched whole and by word, but common nouns inside a title
(`Keep`, `Tower`, `Guild`, …) are left alone so ordinary prose survives.

## Style override

Vault- or entity-authored art direction (`entity.artDirection`, or an
`## Art Direction` section in content) becomes a **style override**: it
replaces the theme layer and suppresses the style lineage. Category framing,
camera, and negatives still apply.

It replaces rather than stacks because two style blocks specify two different
mediums at once, and the model resolves that arbitrarily.

Composed prompts are never written back to `artDirection` — that would turn a
full prompt into a style override on the next generation and duplicate the
category and camera layers. Generation provenance goes to
`entity.imageArtDirection` instead.

## Negatives

Three blocks, merged in order and deduplicated:

- **Universal** — `text`, `watermark`, `artist signature`, `logo`,
  `oversaturated HDR`, `lens dirt overlay`, `tiling`. Always applied.
- **Figure** — `extra fingers`, `extra limbs`, `fused hands`,
  `distorted anatomy`, `asymmetrical eyes`, `plastic skin`, `cropped head`.
  Applied only when a person or creature is in frame, since anatomy negatives
  on a landscape waste budget and mildly contradict a camera asking for a
  human-scale reference figure.
- **Category** — that category's specific failure modes.

A camera preset or optics override sets `figureInFrame` to add the block to a
category that normally has none — the item `in-hand` framing uses this — or to
take it away. An explicit value wins over the category's `includesFigures`
default in both directions.

## Aspect ratio

Every category and variant sets one, and it reaches the image two ways: as a
framing phrase at the end of the camera layer, and — for providers that take
explicit pixel dimensions — as `dimensions` on the generation request, mapped
from the ratio by `ASPECT_RATIO_DIMENSIONS`. Sending only the phrase let the
direct Cloudflare path render every shot as a 1024×1024 square while the prompt
asked for 2.39:1. The hand-edited prompt path carries no composed metadata, so
the provider default applies there.

## Providers

Provider differences live only in `art-direction-providers.ts`.

| Provider                   | Negatives                                    | Prompt limit |
| -------------------------- | -------------------------------------------- | ------------ |
| Gemini                     | Inline `Avoid: …` (no negative field exists) | 4000         |
| Cloudflare Workers AI      | `negative_prompt` field                      | 2000         |
| Custom (OpenAI-compatible) | `negative_prompt` field                      | 2000         |

When negatives go inline, prompt budget is reserved for them first, so capping
truncates the positive prompt and never the negative block.

## Troubleshooting

| Symptom                                | Cause                                                                   | Fix                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Generic, forgettable figure            | Subject lacks specific materials, repairs, or props                     | Add physical facts to the entity's content; the distiller can only describe what the vault records |
| Background overpowers the subject      | Aperture too deep or focal hierarchy wrong                              | Use a wider aperture variant — `portrait` for characters, `in-hand` for items                      |
| Landscape rendered in leather and iron | Category has the wrong `materialFocus`                                  | Environment categories must be `terrain` or `both`, never `craft`                                  |
| Figure cropped or floating in dead air | Provider rendering a different shape than the prompt states             | Every category sets an aspect ratio; providers taking explicit dimensions get it via `dimensions`  |
| Faction looks like clones              | No internal hierarchy or specialist roles                               | The faction blueprint supplies signals, but the subject needs distinct roles to differentiate      |
| Plastic-looking surfaces               | Missing directional or raking light                                     | Pick a camera variant with a lighting recipe, or a theme with stronger lighting logic              |
| Style drifts between images            | Theme changed, or an entity style override is set on some entities only | Check `imageArtDirection.styleOverridden` in the stored metadata                                   |
| Muddy colours                          | Too many palette terms — usually a style override fighting the theme    | Shorten the override to one medium and one palette                                                 |
| Creature has no weight                 | Missing ground contact, compression, cast shadow, or scale cues         | The creature category asks for these; if they're absent the subject is likely too abstract         |
| Prompt reads twice as long as expected | A style override containing a full composed prompt                      | Clear `artDirection` on the entity                                                                 |

### Development-time warnings

`validateOptics` flags contradictory settings and is surfaced in
`composeImagePrompt(...).warnings`:

- `aperture-depth-conflict` — a deep-focus aperture combined with a
  shallow-depth lens character
- `aperture-shot-conflict` — a subject-isolating aperture on an extreme wide
  shot
- `motion-redundant` — `long-exposure` and `motion-blur` both requested
- `lens-character-overload` — more than three lens character terms, which start
  cancelling each other out

## Reproducibility

Generated images store an `imageArtDirection` record: `artDirectionVersion`,
the composed positive and negative prompts, category, theme, camera preset and
variant, style-reference mode, whether a style override applied, provider, and
timestamp. Images generated before v2 have no record and need no migration.

## Extending

- **New theme**: add to `ART_THEMES` with `medium`, `palette`, `lighting`,
  `craftMaterials`, `terrainMaterials`, `exaltedMaterials`, a
  `nameFreeFallback`, and optional
  `aliases` and `styleReferences` (max two). Add a matching
  `FACTION_BLUEPRINTS` entry. Tests assert both exist.
- **New category**: add to `ART_CATEGORIES` with a framing-only prompt, a
  `defaultCamera` including an `aspectRatio`, a `materialFocus`, an
  `includesFigures` flag, and a `CATEGORY_NEGATIVE_PROMPTS` block. Add an
  `exaltedPrompt` if the prompt asks for wear, repair, or decay. Add a golden
  fixture.
- **New provider**: add to `PROVIDER_CAPABILITIES`. Nothing else should need to
  change.

The committed fixture in `packages/schema/src/__fixtures__/golden-prompts.json`
is the contract for composed output. A change there shifts every generated image
— regenerate it with `UPDATE_GOLDENS=1` only when the art direction was
deliberately revised.

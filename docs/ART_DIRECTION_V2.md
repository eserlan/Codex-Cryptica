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
| Category        | Framing, composition, silhouette readability, depth                                                 | `art-direction-catalogue.ts` |
| Theme           | Medium, palette, lighting logic, material vocabulary                                                | `art-direction-catalogue.ts` |
| Camera          | Focal length, aperture, shot size, angle, lighting recipe, aspect ratio, film stock, lens character | `art-direction-optics.ts`    |
| Style reference | Named lineage, name-free fallback, or nothing                                                       | `art-direction-catalogue.ts` |
| Negatives       | Universal + figure + category failure modes                                                         | `art-direction-negatives.ts` |

Categories never contain medium or palette language, and themes never contain
framing. That separation is what lets any category render in any theme, and it
is enforced by a test.

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

A camera variant can add the figure block to a category that normally has none
via `figureInFrame` on the preset — the item `in-hand` framing uses this.

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
| Figure cropped or floating in dead air | Provider default aspect ratio fighting the shot size                    | Every category sets an aspect ratio; check it survived any optics override                         |
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
  `craftMaterials`, `terrainMaterials`, a `nameFreeFallback`, and optional
  `aliases` and `styleReferences` (max two). Add a matching
  `FACTION_BLUEPRINTS` entry. Tests assert both exist.
- **New category**: add to `ART_CATEGORIES` with a framing-only prompt, a
  `defaultCamera` including an `aspectRatio`, a `materialFocus`, an
  `includesFigures` flag, and a `CATEGORY_NEGATIVE_PROMPTS` block. Add a
  golden fixture.
- **New provider**: add to `PROVIDER_CAPABILITIES`. Nothing else should need to
  change.

Golden snapshots in `packages/schema/src/__snapshots__` are the contract for
composed output. A change there shifts every generated image — update them only
when the art direction was deliberately revised.

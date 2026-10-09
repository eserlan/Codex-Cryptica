# Art Direction: Editorial & Answer Page Images

This guide establishes the visual standards for public-facing editorial illustrations across Codex Cryptica, including Answer pages (`/answers/[slug]`), Discovery hubs, OpenGraph (OG) cards, and social share assets.

For in-app entity image generation within the Lore Oracle, see [docs/ART_DIRECTION_V2.md](./ART_DIRECTION_V2.md). For UI component styling and design tokens, see [docs/STYLE_GUIDE.md](./STYLE_GUIDE.md).

---

## 1. Visual Target: Grounded Cinematic Realism

Public editorial images must feel like concept art from a high-end speculative fiction production or premier tabletop publication (in the vein of _Dune_, _Symbaroum_, or prestige fantasy worldbuilding).

- **Format**: Strictly `16:9` aspect ratio.
- **Composition**: Full-bleed edge-to-edge cinematic framing. Use wide or medium-wide establishing angles with clear focal hierarchy and natural depth of field.
- **Atmosphere & Lighting**: Rely on authentic, motivated light sources (e.g. dawn sea-mist, late afternoon golden hour, dramatic hearth embers, twilight lantern glow, or stormy chiaroscuro).
- **Environmental Storytelling**: Convey cultural, societal, or mechanical concepts through physical reality:
  - Contrasting architecture (e.g. terraced stone masonry vs timber stilt pavilions).
  - Authentic textiles and dress (layered linen, dyed wool, embossed leather, bronze or silver jewelry).
  - Visible customs and human posture (gift offerings, council deliberation, ceremonial hospitality, trade negotiations).
- **Style**: Painterly digital realism with rich tactile textures, dust motes, rising smoke, and atmospheric haze.

---

## 2. Forbidden Anti-Patterns (Strictly Avoid)

When generating editorial images, actively guard against common AI generation failure modes:

| Anti-Pattern                         | Why It Fails                                                                                                                       | What to Do Instead                                                                                |
| :----------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| **Storybook / Fairytale / Cartoon**  | Degrades authority; reads like children's fantasy rather than serious worldbuilding literature.                                    | Specify `cinematic concept art, grounded realism, painterly digital art, mature tone`.            |
| **Parchment mats, borders & frames** | Artificial faux-parchment cutouts or illuminated borders waste visual space and clash with modern web layout.                      | Always mandate full-bleed: `no borders, no frames, edge-to-edge cinematic composition`.           |
| **Text, runes & banner labels**      | Diffusion models frequently hallucinate garbled pseudo-text, misspellings, or unintelligible runes on signs, banners, or stones.   | Explicitly forbid text: `no text, no typography, no labels, no banners`.                          |
| **Diagrams, arrows & infographics**  | Requesting "cause and effect", flowcharts, or split panels produces cluttered, fragmented, textbook-like graphics.                 | Depict the concept organically through a single cohesive scene or meeting point.                  |
| **Monocultural stereotypes**         | Generic monoculture cliches (e.g. all dwarfs in identical horned helms, generic cloaked wizards) contradict nuanced worldbuilding. | Emphasize internal diversity, distinct social roles, contrasting garments, and authentic customs. |

---

## 3. The Prompt Recipe

Use the following layered formula when composing prompts for editorial and answer images:

```text
[Camera & Framing] + [Core Worldbuilding Subject & Interaction] + [Contrasting Cultural / Material Details] + [Motivated Lighting & Atmosphere] + [Negative Constraints]
```

### Reference Example (Issue #3580 — Distinct Cultures)

```text
Cinematic concept art, wide shot of an open-air monumental stone rotunda carved into a seaside cliffside during a crisp golden morning. A tense cultural assembly where clan lineage and merit collide. Towering woven lineage tapestries and polished bronze tablets hang between fluted pillars. Elders in draped crimson and saffron robes examine inscribed clay seals, while a diverse delegation of younger leaders in layered leather tunics and silver torque necklaces present their case before an empty carved stone throne. Golden sunlight slicing through marble colonnades, ocean spray rising in the distance, subtle dust motes, realistic environmental storytelling, painterly realism, grounded historical fantasy, rich textures, cinematic composition, artstation trending. No text, no frames, no borders.
```

---

## 4. Asset Storage & Upload Protocol (Cloudflare R2 Only)

Per repository rules and Constitution:

1. **NEVER commit image files to git.** All image assets belong exclusively in Cloudflare R2 (`codex-cryptica-statics` bucket served via `https://assets.codexcryptica.com/`).
2. Upload using `wrangler` with `--remote`:
   ```sh
   bunx wrangler r2 object put \
     "codex-cryptica-statics/og/<slug>.jpg" \
     --file="/path/to/temporary-image.jpg" \
     --content-type="image/jpeg" \
     --remote
   ```
3. Verify public CDN accessibility:
   ```sh
   curl -sI "https://assets.codexcryptica.com/og/<slug>.jpg" | head -5
   ```
4. **Immediately delete all local temporary files** created during generation.

---

## Related Documentation

- Skill Instructions: [`.agent/skills/add-answer/SKILL.md`](../.agent/skills/add-answer/SKILL.md)
- In-App Lore Oracle Art Direction: [`docs/ART_DIRECTION_V2.md`](./ART_DIRECTION_V2.md)
- Project Style Guide: [`docs/STYLE_GUIDE.md`](./STYLE_GUIDE.md)

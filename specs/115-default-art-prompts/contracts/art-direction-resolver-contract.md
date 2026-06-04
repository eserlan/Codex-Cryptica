# Contract: Art Direction Resolver

## Public Resolver Contract

```typescript
type ArtDirectionSource =
  | "entity-context"
  | "user-authored-context"
  | "category-default"
  | "theme-default"
  | "global-default";

type DrawSurface = "command" | "entity" | "zen" | "graph" | "cover" | "chat";

interface DrawRequestContext {
  subject: string;
  entityId?: string;
  entityTitle?: string;
  categoryId?: string;
  categoryLabel?: string;
  themeId?: string;
  surface: DrawSurface;
  entityArtDirection?: string;
  userAuthoredArtDirection?: string;
}

interface ResolvedArtDirection {
  prompt: string;
  source: ArtDirectionSource;
  templateId?: string;
  subject: string;
  categoryId?: string;
  themeId?: string;
}

interface ArtDirectionResolver {
  resolve(context: DrawRequestContext): ResolvedArtDirection;
}
```

## Fallback Contract

The resolver checks candidates in this order:

1. `entityArtDirection`
2. `userAuthoredArtDirection`
3. shipped category default for `categoryId`
4. shipped theme default for `themeId`
5. shipped global default

Required behavior:

- Empty or whitespace-only candidates are skipped.
- The final prompt always includes the trimmed subject.
- Missing `{subject}` in a template is handled by adding the subject to the prompt.
- Multiple `{subject}` placeholders are all replaced.
- Resolver metadata identifies which fallback level won.

## Category Parsing Contract

For `/draw` commands:

- Recognized category words may set `categoryId` when no matched entity category is available.
- If the subject resolves to an entity with metadata, the entity category wins over command-provided category words.
- Unknown category words are treated as normal subject text unless existing command parsing already recognizes them.

## Defaults Contract

Shipped defaults include:

- global Codex Cryptica default
- category defaults for Character, Creature, Location, Item, Faction, Event, Note, and world cover
- theme defaults for supported world themes where practical

Default prompt rules:

- Do not name living artists.
- Do not instruct direct imitation of a living artist.
- Prefer descriptive language for medium, composition, lighting, mood, materials, and readability.
- Keep defaults concise enough to avoid unwieldy generated prompts.

## Integration Contract

All existing image generation entry points must call the resolver before image generation:

- `/draw`
- entity sidebar draw
- Zen mode draw
- graph context menu image generation
- front page cover generation
- Oracle chat draw where context is available

The image generation service receives the resolver's `prompt` as final prompt text. Image model request/response behavior remains unchanged.

## Gating Contract

- Existing tier, capability, guest, and AI-disabled gates remain authoritative.
- Resolver logic must not make unavailable draw controls visible.
- Normal notes/entities remain editable according to existing permissions even when image generation is unavailable.

## Verification Contract

Automated coverage must assert:

- entity/user-authored/category/theme/global fallback order
- empty candidate fallback behavior
- subject insertion when `{subject}` is present, missing, or repeated
- category command hints and entity metadata precedence
- shipped defaults avoid named living artists
- `/draw` uses resolved prompt
- entity sidebar and Zen mode draw use resolved prompt
- graph context menu image generation uses resolved prompt
- front page cover generation uses cover/world context
- existing image generation still works with no user-authored art direction content

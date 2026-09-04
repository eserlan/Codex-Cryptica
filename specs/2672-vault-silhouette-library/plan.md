# Implementation Plan: Vault Silhouette Library & Entity Selector Modal

**Issue**: [#2672](https://github.com/eserlan/Codex-Cryptica/issues/2672) (expanding upon [#2625](https://github.com/eserlan/Codex-Cryptica/issues/2625))  
**Branch**: `2672-vault-silhouette-library` | **Date**: 2026-09-02

---

## 1. Summary & Objectives

Implement a universal, curated SVG silhouette system across the Codex Cryptica Vault. The system provides high-impact visual representation for all entity types/categories (characters, creatures, locations, items, factions) when no custom portrait image exists, with:

1. **Deterministic Auto-Inference**: Automatically guess the best silhouette archetype and theme based on entity metadata (category, kind, labels, title, text keywords, active world theme) without generative AI token costs or latency.
2. **Cloudflare R2 Asset Pipeline**: Clean, theme-neutral vector assets hosted in R2 (`https://assets.codexcryptica.com/silhouettes/...`) paired with a strongly-typed metadata and SVG path registry in `@codex/schema` / client app.
3. **Frontmatter Persistence**: Extend `EntitySchema` with `silhouette?: string` to store manual selections.
4. **Interactive Selector Modal**: Rich, searchable, genre-filterable modal allowing users to inspect auto-matched suggestions, browse the archetype matrix, preview styles, and assign/reset silhouettes on any entity.
5. **Universal Foundation**: Designed to seamlessly power Vault entity views, graph nodes, cards, and future generators like the Wanted Poster / Bounty Notice Generator ([#2624](https://github.com/eserlan/Codex-Cryptica/issues/2624)).

---

## 2. Technical Context & Constraints

- **Language & Runtime**: TypeScript 6.0.3, Svelte 5 (Runes: `$state`, `$derived`, `$effect`), SvelteKit 2, Bun 1.3.14.
- **Styling & Icons**: Tailwind CSS 4 semantic tokens (`text-theme-primary`, `bg-theme-surface`, etc.), Iconify utility classes (`class="icon-[lucide--...]"`). Zero `lucide-svelte` imports.
- **Asset Storage & Governance**: R2 asset policy strictly observed: SVGs hosted on Cloudflare R2 bucket (`codex-cryptica-statics` via `https://assets.codexcryptica.com/`). The local repository stores typed definitions, vector paths / registries, and mock test assets.
- **Coloring & Rendering**: SVGs use clean vector shapes with `fill="currentColor"` or theme-reactive CSS variables to enable dynamic tinting, ink bleeds, or holo glow effects.
- **Architecture**: Dependency injection for stores/services, unit-tested heuristics and components.

---

## 3. Data Contracts & Schema

### 3.1 Entity Frontmatter (`packages/schema/src/entity.ts`)

```ts
export const EntitySchema = z.object({
  // ... existing fields ...
  image: z.string().optional(),
  /**
   * Silhouette identifier referencing the Silhouette Registry (e.g. "gothic-vampire-female").
   * When absent, the UI dynamically computes an auto-inferred fallback silhouette.
   */
  silhouette: z.string().optional(),
  // ...
});
```

### 3.2 Silhouette Registry Definition (`packages/schema/src/silhouettes.ts` / `apps/web/src/lib/config/silhouettes/`)

```ts
export type SilhouetteGenre =
  | "fantasy"
  | "gothic"
  | "scifi"
  | "cyberpunk"
  | "western"
  | "modern"
  | "cosmic-horror"
  | "steampunk";

export type SilhouetteArchetype =
  | "warrior"
  | "caster"
  | "rogue"
  | "scientist"
  | "noble"
  | "inquisitor"
  | "outlaw"
  | "pilot"
  | "hacker"
  | "beast"
  | "dragon"
  | "horror"
  | "construct"
  | "relic"
  | "structure"
  | "insignia"
  | "generic";

export type SilhouetteCategory =
  "character" | "creature" | "location" | "item" | "faction" | "event" | "note";

export interface SilhouetteDefinition {
  id: string; // e.g. "fantasy-warrior-male", "gothic-vampire-female"
  name: string; // "Fantasy Warrior (M)", "Vampire Countess"
  category: SilhouetteCategory;
  genres: SilhouetteGenre[];
  archetype: SilhouetteArchetype;
  gender?: "female" | "male" | "neutral" | "androgynous";
  tags: string[]; // ["knight", "sword", "plate", "paladin"]
  r2Path: string; // "silhouettes/characters/fantasy/warrior-male.svg"
  svgContent?: string; // Inline SVG path / geometry for offline / instant rendering
}
```

---

## 4. Silhouette Matrix (Initial Foundation Set)

| ID                         | Name                      | Category  | Genres                | Archetype  | Gender  | Key Tags                                  |
| -------------------------- | ------------------------- | --------- | --------------------- | ---------- | ------- | ----------------------------------------- |
| `fantasy-warrior-male`     | Warrior (M)               | character | fantasy, gothic       | warrior    | male    | knight, plate, sword, soldier, guard      |
| `fantasy-warrior-female`   | Warrior (F)               | character | fantasy, gothic       | warrior    | female  | shieldmaiden, knight, mercenary, sword    |
| `fantasy-caster-male`      | Mage / Wizard (M)         | character | fantasy               | caster     | male    | wizard, staff, robe, archmage, spell      |
| `fantasy-caster-female`    | Sorceress / Witch (F)     | character | fantasy, gothic       | caster     | female  | witch, sorceress, magic, mystic, spell    |
| `fantasy-rogue-male`       | Rogue / Assassin (M)      | character | fantasy, gothic       | rogue      | male    | rogue, thief, dagger, hooded, assassin    |
| `fantasy-rogue-female`     | Duelist / Scout (F)       | character | fantasy, western      | rogue      | female  | scout, ranger, duelist, blades, cloaked   |
| `fantasy-paladin`          | Paladin / Cleric          | character | fantasy               | warrior    | neutral | holy, divine, warhammer, crusader, sun    |
| `gothic-vampire-male`      | Vampire Lord (M)          | character | gothic, fantasy       | noble      | male    | vampire, count, fangs, aristocrat, blood  |
| `gothic-vampire-female`    | Vampire Countess (F)      | character | gothic, fantasy       | noble      | female  | vampire, countess, gown, gothic, blood    |
| `gothic-inquisitor`        | Witch Hunter / Inquisitor | character | gothic, fantasy       | inquisitor | neutral | inquisitor, hat, coat, stake, zealot      |
| `gothic-werewolf`          | Werewolf / Lycan          | creature  | gothic, fantasy       | beast      | neutral | werewolf, lycanthrope, claws, feral, wolf |
| `scifi-scientist-alien`    | Alien Scientist           | character | scifi, cosmic-horror  | scientist  | neutral | alien, researcher, tech, lab, scholar     |
| `scifi-pilot-explorer`     | Star Pilot / Explorer     | character | scifi                 | pilot      | neutral | helmet, suit, pilot, astronaut, scout     |
| `cyberpunk-hacker-female`  | Netrunner (F)             | character | cyberpunk, scifi      | hacker     | female  | hacker, cyber, jacked-in, visor, neural   |
| `cyberpunk-enforcer-male`  | Cyber Enforcer (M)        | character | cyberpunk, scifi      | warrior    | male    | cyborg, heavy, augment, mercenary, cop    |
| `western-gunslinger-male`  | Gunslinger (M)            | character | western               | outlaw     | male    | cowboy, revolver, duster, hat, bounty     |
| `western-outlaw-female`    | Outlaw / Bandita (F)      | character | western               | outlaw     | female  | bandit, hat, rifle, renegade, bandana     |
| `creature-beast-quadruped` | Dire Beast / Hound        | creature  | fantasy, gothic       | beast      | neutral | beast, hound, predator, feral, claws      |
| `creature-dragon-winged`   | Dragon / Wyvern           | creature  | fantasy               | dragon     | neutral | dragon, wings, breath, scales, monster    |
| `creature-horror-aberrant` | Eldritch Abomination      | creature  | cosmic-horror, gothic | horror     | neutral | tentacles, eyes, horror, alien, occult    |
| `creature-golem-construct` | Stone / Iron Golem        | creature  | fantasy, scifi        | construct  | neutral | golem, automaton, robot, mech, metal      |
| `item-relic-blade`         | Legendary Blade           | item      | fantasy, gothic       | relic      | neutral | sword, artifact, holy, enchanted, weapon  |
| `item-arcane-tome`         | Grimoire / Tome           | item      | fantasy, gothic       | relic      | neutral | book, spellbook, lore, ancient, secret    |
| `location-citadel-castle`  | Fortress / Citadel        | location  | fantasy, gothic       | structure  | neutral | castle, keep, stronghold, tower, fortress |
| `location-scifi-megacity`  | Neon Megacity / Spire     | location  | cyberpunk, scifi      | structure  | neutral | city, skyscraper, skyline, station        |
| `faction-insignia-crest`   | Heraldic Crest / Crown    | faction   | fantasy, gothic       | insignia   | neutral | crown, shield, banner, nobility, guild    |
| `faction-insignia-cyber`   | Corp Logo / Cyber Hex     | faction   | cyberpunk, scifi      | insignia   | neutral | corporation, syndicate, logo, faction     |
| `generic-humanoid-unknown` | Redacted / Silhouette     | character | fantasy, scifi        | generic    | neutral | unknown, question, shadow, mysterious     |

---

## 5. Auto-Inference Heuristic Engine

The resolver `resolveEntitySilhouette(entity, worldTheme?)` evaluates:

1. **Explicit Override:** If `entity.silhouette` is present and valid in registry, return it immediately.
2. **Category Filter:** Narrow candidate pool to `definition.category === entity.category` (or fallback to `character`).
3. **Genre Affinity:** Match `worldTheme` (e.g. `dark-fantasy`, `cyberpunk`, `space-western`) against `definition.genres`.
4. **Keyword Scoring:**
   - Scan `title`, `labels`, `kind`, and `content` preview.
   - Aggregate matched tags with weighting:
     - `labels` match: +5 pts
     - `kind` / `type` match: +4 pts
     - `title` word match: +3 pts
     - `content` keyword match: +1 pt
5. **Fallback:** If score == 0, select the default generic silhouette for that category & genre.

---

## 6. Vault UI Components

1. **`EntityAvatar.svelte` / `DetailImage.svelte` Enhancement**:
   - When no user image is loaded, render `SilhouetteAvatar`.
   - Displays SVG with crisp vector scaling and theme-colored accents.
   - Subtle edit button/badge on hover: _"Change silhouette"_.
2. **`SilhouettePickerModal.svelte`**:
   - Header with search input and live count.
   - Quick Genre filter chips (_All_, _Fantasy_, _Gothic_, _Sci-Fi_, _Cyberpunk_, _Western_, _Creatures_, _Locations/Items_).
   - "Suggested for this Entry" top section highlighting the highest-scoring auto-matches.
   - Full grid with responsive cards, hover zoom, and archetype tags.
   - Action buttons:
     - `Set as Silhouette` (updates entity frontmatter `silhouette`).
     - `Use Auto-Detect` (clears frontmatter so it adapts to future note edits).
     - `Cancel`.

---

## 7. Testing & Verification

- **Schema & Registry Tests**: Ensure all registry items validate against `SilhouetteDefinitionSchema`, contain valid R2 paths, unique IDs, and valid SVG geometries.
- **Inference Engine Tests**: Unit tests covering:
  - Female Gothic Vampire matching.
  - Sci-Fi Alien Scientist matching.
  - Western Gunslinger matching.
  - Creature / Aberration matching.
  - Default fallbacks for unlabelled entities.
  - Theme override handling.
- **UI & Interaction Tests**: Vitest tests for `SilhouettePickerModal` (filtering, selection, frontmatter update trigger).
- **Linter & Typechecks**: `bun run lint` and `bun run lint:types` with 0 errors.

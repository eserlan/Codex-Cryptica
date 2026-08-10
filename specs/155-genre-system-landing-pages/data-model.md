# Data Model: Landing Page Shell Configuration

## Entities & Interfaces

### 1. `LandingPageKind`

```ts
export type LandingPageKind = "system" | "genre" | "use-case";
```

### 2. `LandingPageUseCase`

```ts
export interface LandingPageUseCase {
  title: string;
  description: string;
  icon?: string; // Iconify icon class name, e.g., 'icon-[lucide--crown]'
}
```

### 3. `LandingPageGraphNode` & `LandingPageGraph`

```ts
export interface LandingPageGraphStep {
  label: string;
  sublabel?: string;
  type?: string; // e.g., 'character', 'faction', 'location'
}

export interface LandingPageGraph {
  title: string;
  description?: string;
  steps: LandingPageGraphStep[];
}
```

### 4. `RecommendedTool`

```ts
export interface RecommendedTool {
  title: string;
  description: string;
  href: string; // e.g., '/generators/vampire' or '/tools'
  badge?: string; // e.g., 'Generator', 'Vault Feature'
}
```

### 5. `LandingPageConfig` (Main Entity)

```ts
export interface LandingPageConfig {
  slug: string; // URL path parameter under /for/[slug]
  kind: LandingPageKind;
  theme?: string; // Optional string referencing a valid system theme
  seo: {
    title: string;
    description: string;
    canonical?: string;
  };
  hero: {
    eyebrow?: string;
    title: string;
    tagline: string;
    problemStatement: string;
  };
  useCases: LandingPageUseCase[];
  exampleGraph?: LandingPageGraph;
  recommendedTools: RecommendedTool[];
  cta: {
    title: string;
    description?: string;
    buttonText: string;
    buttonHref: string; // e.g., '/app' or '/demo'
  };
  disclaimer?: string; // Optional non-affiliation statement
}
```

---

## Initial Validation Content Packs

### 1. `vampire-the-masquerade` (`LandingPageConfig`)

- **slug**: `"vampire-the-masquerade"`
- **kind**: `'system'`
- **theme**: `"vampire"`
- **hero.title**: `"Codex Cryptica for Vampire: The Masquerade"`
- **hero.tagline**: `"Build and run your chronicle without losing track of your city."`
- **hero.problemStatement**: `"Running a VtM chronicle gets complicated quickly. Between coteries, Elysium etiquette, Prince decrees, domain claims, and mortal contacts, keeping your gothic conspiracy connected during play requires more than standard notes."`
- **exampleGraph**:
  - `Prince (Ventrue)` → `Sheriff (Gangrel)` → `Primogen Council` → `Coterie Havens` → `Mortal Contacts`
- **disclaimer**: `"Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Paradox Interactive or World of Darkness."`

### 2. `fantasy-worldbuilding` (`LandingPageConfig`)

- **slug**: `"fantasy-worldbuilding"`
- **kind**: `'genre'`
- **theme**: `"fantasy"`
- **hero.title**: `"Codex Cryptica for Fantasy Worldbuilding"`
- **hero.tagline**: `"Connect pantheons, kingdoms, artifacts, and lineages into a living world."`
- **hero.problemStatement**: `"Fantasy settings demand massive depth: royal bloodlines, rival guilds, ancient magic systems, and sprawling campaign timelines. Codex Cryptica turns flat world notes into a dynamic, connected graph."`
- **disclaimer**: _Omitted (undefined)_

# Quickstart: Adding a New /for/[slug] Landing Page

Adding a new genre or system landing page (e.g. `call-of-cthulhu` or `cyberpunk-red`) requires **zero UI component code**.

## Step 1: Create a Content Pack File

Create a new file in `apps/web/src/lib/content/for/packs/<slug>.ts`:

```ts
import type { LandingPageConfig } from "../schema";

export const callOfCthulhuConfig: LandingPageConfig = {
  slug: "call-of-cthulhu",
  kind: "system",
  seo: {
    title: "Call of Cthulhu Campaign Management | Codex Cryptica",
    description:
      "Organize cosmic horror investigations, sanity tracking notes, cult factions, and clues in a local-first campaign graph.",
  },
  hero: {
    title: "Codex Cryptica for Call of Cthulhu",
    tagline: "Keep your investigation connected before the madness takes over.",
    problemStatement:
      "Investigative horror campaigns get tangled in clues, cultists, forbidden tomes, and location webs. Codex Cryptica lets Keepers map connections without spoiling secrets.",
  },
  useCases: [
    {
      title: "Track Cults & Factions",
      description:
        "Connect sinister leaders, occultists, and front organizations.",
      icon: "icon-[lucide--eye]",
    },
  ],
  recommendedTools: [
    {
      title: "Cosmic Horror Theme Hub",
      description: "Generator for ancient relics, forbidden rites, and cults.",
      href: "/generators/cosmic-horror",
    },
  ],
  cta: {
    title: "Start Your Investigation",
    buttonText: "Open Codex Cryptica",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent tool and is not affiliated with Chaosium Inc.",
};
```

## Step 2: Register in `packs/index.ts`

Import your config in `apps/web/src/lib/content/for/packs/index.ts` and add it to the `packs` dictionary:

```ts
import { callOfCthulhuConfig } from "./call-of-cthulhu";

export const packs: Record<string, LandingPageConfig> = {
  "vampire-the-masquerade": vampireTheMasquerade,
  "fantasy-worldbuilding": fantasyWorldbuilding,
  "call-of-cthulhu": callOfCthulhuConfig,
};
```

## Step 3: Verify

Run unit tests and type checks:

```bash
bun --filter web test src/lib/content/for/registry.test.ts
bun --filter web check
```

Navigate to `http://localhost:5173/for/call-of-cthulhu` in your local development server!

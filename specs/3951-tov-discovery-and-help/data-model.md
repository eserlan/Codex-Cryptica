# Data Model & Content Contracts: ToV Discovery & Help

**Feature**: [spec.md](./spec.md)  
**Parent Epic**: #3941  
**Issue**: #3951  
**Date**: 2026-10-16

---

## 1. Landing Page Contract (`/for/tales-of-the-valiant`)

Implemented as `LandingPageConfig` in `apps/web/src/lib/content/for/packs/tales-of-the-valiant.ts`:

```typescript
export interface LandingPageConfig {
  slug: "tales-of-the-valiant";
  kind: "system";
  theme: "fantasy";
  hub: "fantasy";
  seo: {
    title: string;
    description: string;
    image: string; // Cloudflare R2 asset
    imageAlt: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    tagline: string;
    problemStatement: string;
  };
  useCases: Array<{
    title: string;
    description: string;
    icon: string; // icon-[lucide--...] pattern
  }>;
  exampleGraph: {
    title: string;
    description: string;
    steps: Array<{
      label: string;
      sublabel: string;
      category: string;
    }>;
  };
  workflow: {
    title: string;
    steps: Array<{
      step: string;
      title: string;
      description: string;
    }>;
  };
  attribution?: {
    notice: string;
    sourceUrl: string;
    license: string;
  };
}
```

---

## 2. Reference Answer Contract (`/answers/how-do-i-organise-a-tales-of-the-valiant-campaign`)

Implemented as `AnswerConfig` in `apps/web/src/lib/content/answers/pages/how-do-i-organise-a-tales-of-the-valiant-campaign.ts`:

- **slug**: `how-do-i-organise-a-tales-of-the-valiant-campaign`
- **title**: `How do I organise a Tales of the Valiant campaign?`
- **category**: `campaign-prep`
- **shortAnswer**: Single direct paragraph $\ge 140$ characters, zero AI tells, British English.
- **sections**: At least 3 body sections covering:
  1. Structuring Lineage, Heritage, and Background connections in notes.
  2. Managing session Luck pools and long rest resets across sheets and VTT.
  3. Prepping BFRD encounters, creature roles, and Doom budgets.
- **workedExample**: `kind: "example"` comparing 5e flat prep vs ToV multi-faceted prep.
- **checklist**: `kind: "checklist"` step-by-step table prep items.
- **codexConnection**: Linking to vault system profile, stat sheets, and generators.

---

## 3. In-App Help Contract (`apps/web/src/lib/content/help/tales-of-the-valiant.md`)

Frontmatter contract:

```markdown
---
id: tales-of-the-valiant
title: Tales of the Valiant (BFRD) Campaign Guide
description: Complete guide to running Tales of the Valiant campaigns in Codex Cryptica, including system profiles, Luck and Doom tracking, and BFRD stat blocks.
tags:
  [
    tales of the valiant,
    tov,
    bfrd,
    black flag,
    luck,
    doom,
    stat sheets,
    character import,
  ]
rank: 8
---
```

Sections:

1. Activating the ToV System Profile for your Campaign Vault.
2. Character & Monster Stat Sheets (`builtin-tov-character`, `builtin-tov-monster`, `builtin-tov-npc`).
3. Luck Points in Play (Gaining, Spending, Long Rest reset).
4. Doom Points for Adversary Encounters.
5. Importing from tov-chargen & external JSON.
6. ToV Mechanics in Generators & Encounters.
7. Legal & CC BY 4.0 Attribution.

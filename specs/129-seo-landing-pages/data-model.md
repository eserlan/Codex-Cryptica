# Data Model: SEO Landing Page and Generator System

This document outlines the data schemas, validation rules, and structures utilized by the SEO landing page and generator system.

---

## 1. SEO Page Configuration (`SEOPageData`)

Defines the structure for landing page static copy parameters.

```typescript
export interface SEOPageData {
  slug: string;
  title: string;
  description: string;
  h1: string;
  subheading: string;
  introText: string;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  ctaText: string;
  keywords: string[];
  features: Array<{
    title: string;
    description: string;
    icon: string; // Iconify utility class (e.g. icon-[lucide--zap])
  }>;
}

export interface SEOComparisonPageData extends SEOPageData {
  competitorName: string;
  comparisonTable: Array<{
    feature: string;
    competitorHas: boolean | string;
    codexHas: boolean | string;
  }>;
  verdict: string;
}
```

---

## 2. Generator Configuration & Table Schemas

Deterministic data used to procedurally construct names, NPCs, and settlements client-side.

```typescript
export interface NameTable {
  prefixes: string[];
  suffixes: string[];
  descriptors: string[];
}

export interface NPCGeneratorConfig {
  races: string[];
  roles: string[];
  alignments: string[];
  traits: string[];
  secrets: string[];
  motives: string[];
}

export interface SettlementGeneratorConfig {
  sizes: Array<{ name: string; range: string; pointsOfInterestCount: number }>;
  economies: string[];
  governments: string[];
  notableLocations: string[];
  factions: string[];
}
```

---

## 3. Transfer Payload Schema (`ImportDraft`)

Passed from marketing pages to the app shell via `localStorage` under `__codex_pending_import`. It adheres to the canonical `Entity` structure from `packages/schema`.

```typescript
import { z } from "zod";

export const ImportDraftSchema = z.object({
  type: z.enum([
    "character",
    "creature",
    "location",
    "item",
    "event",
    "faction",
    "note",
  ]),
  title: z.string().min(1),
  content: z.string().default(""), // Markdown description / chronicle
  lore: z.string().optional(), // Secondary notes / stats / tables
  labels: z.array(z.string()).default(["imported-draft"]),
  status: z.enum(["active", "draft"]).default("active"),
});

export type ImportDraft = z.infer<typeof ImportDraftSchema>;
```

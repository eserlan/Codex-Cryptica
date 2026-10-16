# Feature Specification: ToV Onboarding, Help and Discovery Pages Tied to Working Features

**Feature Branch**: `feat/3951-tov-discovery-and-help`  
**Created**: 2026-10-16  
**Status**: Ready  
**Input**: GitHub Issue #3951 ("ToV P2: Publish ToV onboarding, help and discovery pages tied to working features")  
**Parent Epic**: #3941 (Tales of the Valiant / BFRD campaign support)  
**Legal & Attribution Base**: `docs/legal/tales-of-the-valiant-attribution.md` (CC BY 4.0, Kobold Press BFRD)

---

## 1. Overview & Purpose

Build a credible discovery funnel and in-app documentation for Game Masters and players using Kobold Press's **Tales of the Valiant (ToV)** and the **Black Flag Reference Document (BFRD)**.

The delivery connects to **actual working Codex Cryptica features** (shipped across #3942–#3949: ToV system profile, native character/monster/NPC stat sheets, Luck resource tracker, Doom tracker, stat-block import/detection, tov-chargen JSON interchange, encounter assistance, and ToV generators for NPCs, creatures, and magic items). It explicitly forbids generic D&D 5e advice with the name swapped or speculative links to unbuilt features.

---

## 2. User Scenarios & Testing

### User Story 1 - Public System Guide & Discovery Hub (/for/tales-of-the-valiant) (Priority: P1) 🎯 MVP

**User Goal**: As a Tales of the Valiant Game Master searching for campaign notes and VTT tools, I want to discover Codex Cryptica's dedicated ToV workflows—such as BFRD character and monster sheets, the interactive Luck tracker, Doom adversary tracking, and ToV-aware generators—so I can adopt the platform for my Black Flag campaign with confidence.

**Why this priority**: Serves as the primary public entry point and SEO landing page under `/for/tales-of-the-valiant`, governed by Constitution XIII (Discovery Intent Governance).

**Independent Test**: Navigate to `/for/tales-of-the-valiant` on mobile and desktop. Verify page renders with ToV-specific hero copy, genuine feature workflows, sample campaign graph, BFRD attribution notice (CC BY 4.0), and valid internal CTAs without any broken links or trademark compatibility badge violations.

**Acceptance Scenarios**:

1. **Given** a visitor lands on `/for/tales-of-the-valiant`, **When** the page loads, **Then** it clearly articulates how CC supports ToV (Luck pool, Doom tracking, BFRD stat blocks, character JSON interchange) rather than generic 5e advice.
2. **Given** the page renders, **When** reviewing the footer/legal section, **Then** it displays nominative fair-use and CC BY 4.0 attribution for the Black Flag Reference Document without unauthorized compatibility badges.
3. **Given** the discovery audit runs (`bun scripts/discovery-audit.mjs`), **Then** `/for/tales-of-the-valiant` is registered in `discovery/entries/for.ts` and `for/registry.ts` with 0 audit errors.

---

### User Story 2 - Authoritative Reference Answer on ToV Campaign Organisation (Priority: P1)

**User Goal**: As a GM planning a Tales of the Valiant campaign, I want an authoritative, actionable guide answering _"How do I organise a Tales of the Valiant campaign?"_ that explains how to structure lineages/heritages, track Luck across sessions, handle Doom points, and import BFRD creatures.

**Why this priority**: Provides organic discovery for authentic search queries while adhering to the strict Answer Editorial Standards (Constitution XIII, British English, direct snippet, worked example, actionable checklist, zero AI writing tells).

**Independent Test**: Navigate to `/answers/how-do-i-organise-a-tales-of-the-valiant-campaign`. Confirm British English, single direct `shortAnswer` paragraph (>=140 chars), 3+ body sections, at least one concrete worked before/after example, an actionable prep checklist, and honest CC integration. Verify tests in `apps/web/src/lib/content/answers/` pass.

**Acceptance Scenarios**:

1. **Given** the answer page loads, **When** inspecting the schema, **Then** it provides valid `FAQPage` JSON-LD with a standalone `shortAnswer` paragraph.
2. **Given** the content text, **When** scanned for editorial quality, **Then** there are zero em/en dashes, zero emojis, zero synthetic marketing buzzwords, and all spellings use British English (`organise`, `characterise`, `defence`, `travelled`).
3. **Given** the worked example, **When** read, **Then** it contrasts a weak approach (shoehorning 5e assumptions into ToV) with an authentic ToV structure (distinct Lineage/Heritage notes, session Luck reset procedures, Doom adversary pools).

---

### User Story 3 - In-Product Help & Cif AI Help Assistance Target (Priority: P2)

**User Goal**: As an active user in the campaign app, I want comprehensive in-product help documentation covering the full ToV workflow (activating system profile, Luck and Doom trackers, VTT quick stats, importing from tov-chargen, and mechanics generators) so that both the Help modal and Cif Help Assistant can accurately locate and present instructions.

**Why this priority**: Connects discovery to in-app retention and provides ground truth knowledge for Cif retrieval without leaking rules into non-ToV vaults.

**Independent Test**: Open the Help panel in the app and search for "Tales of the Valiant", "Luck", "Doom", or "tov-chargen". Verify that the help document renders clear instructions, exact UI controls, and accurate prerequisites. Run Cif help search/indexing tests to confirm high retrieval confidence.

**Acceptance Scenarios**:

1. **Given** a user opens the Help center, **When** searching for "Tales of the Valiant", **Then** `tales-of-the-valiant.md` appears with instructions on system profiles, Luck, Doom, and imports.
2. **Given** Cif help indexer processes help markdown files, **When** queried with ToV support questions, **Then** it returns the ToV guide as a relevant source.

---

## 3. Boundaries & Constraints

1. **Strictly Grounded in Shipped Features**:
   - Supported: Vault system profile (`tales-of-the-valiant`), Character sheet (`builtin-tov-character`), NPC sheet (`builtin-tov-npc`), Monster sheet (`builtin-tov-monster`), interactive Luck counter (`isTovLuckField`), Doom tracker (`isTovDoomField`), Encounter challenge guidance, and generators (NPC, Creature, Magic Item).
   - NOT Supported / Out of Scope: Proprietary Kobold Press sourcebook text/lore, automated spellbook compendium, or unofficial claim of Kobold Press partnership.
2. **Legal & Trademark Constraints**:
   - Must follow `docs/legal/tales-of-the-valiant-attribution.md`.
   - Nominative fair use only; NO official Kobold Press compatibility badges or logos.
   - Required CC BY 4.0 BFRD attribution notice on all published ToV discovery pages.
3. **Editorial & Quality Gate**:
   - 100% British English on `/answers/` and discovery content.
   - 0 em dashes, 0 en dashes, 0 emojis.
   - `bun scripts/discovery-audit.mjs` must pass with 0 errors.
   - Scoped unit tests and type checks must pass with 0 errors.

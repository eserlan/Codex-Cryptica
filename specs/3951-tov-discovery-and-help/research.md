# Research: ToV Discovery, Help and Reference Integration

**Feature**: [spec.md](./spec.md)  
**Parent Epic**: #3941  
**Issue**: #3951  
**Date**: 2026-10-16

---

## 1. Discovery Intent Architecture (Constitution XIII)

Every public indexable page in Codex Cryptica is registered in `apps/web/src/lib/content/discovery/`.

### Candidate 1: System Landing Page (`/for/tales-of-the-valiant`)

- **Parent Cluster**: `system-guides`
- **Page Kind**: `for`
- **User Job**: `adopt-workflow`
- **Primary Intent**: `tales of the valiant campaign manager`
- **Aliases**: `tov campaign organiser`, `black flag roleplaying campaign notes app`
- **Unique Value**:
  Connects authentic Tales of the Valiant workflows—Lineage and Heritage separation, interactive Luck tracking on sheets and VTT tokens, Doom tracking for GM adversary pools, and BFRD stat-block imports—into one campaign relationship graph.
- **Audience**: `Tales of the Valiant game masters and players`
- **Implementation Mechanism**:
  A new pack config in `apps/web/src/lib/content/for/packs/tales-of-the-valiant.ts`, exported through `apps/web/src/lib/content/for/packs/index.ts` and loaded by the existing dynamic prerendered route `apps/web/src/routes/(marketing)/for/[slug]/+page.svelte`.

### Candidate 2: Reference Answer Page (`/answers/how-do-i-organise-a-tales-of-the-valiant-campaign`)

- **Parent Cluster**: `campaign-notes` (or new `system-guides` cluster)
- **Category**: `campaign-prep`
- **Page Kind**: `answer`
- **User Job**: `understand`
- **Primary Intent**: `how to organise a tales of the valiant campaign`
- **Aliases**: `organising a tov campaign`, `running tales of the valiant tips`
- **Editorial Spine**:
  A Tales of the Valiant campaign stays manageable when session prep tracks what makes Black Flag distinct: separate Lineage and Heritage backstory connections, session-reset Luck reserves on party tokens, and GM Doom budgets on boss adversaries.
- **Mandatory Requirements**:
  British English throughout, single direct snippet `shortAnswer` ($\ge 140$ characters), 3+ structured body sections, 1 concrete before/after worked example, 1 practical prep checklist, honest product integration, and zero AI writing tells (no em/en dashes, no emojis, no marketing fluff).

---

## 2. In-App Product Help & Cif AI Help Architecture

Codex Cryptica provides two in-app help surfaces:

1. **The Static Markdown Help Library** (`apps/web/src/lib/content/help/`):
   - Rendered by the Help modal (`HelpModal.svelte`) and parsed by `apps/web/src/lib/content/help-registry.ts`.
   - Currently contains `tales-of-the-valiant-generators.md` (generator-specific).
   - Needs a unified guide: `tales-of-the-valiant.md` detailing the entire workflow:
     - Setting vault system profile to `tales-of-the-valiant`.
     - Using native ToV character and monster sheets.
     - Interactive Luck counter and Long Rest reset rules.
     - Doom tracking on GM tokens.
     - Encounter assistance and challenge guidance.
     - Importing from external JSON or tov-chargen.
2. **Cif AI Help Assistant**:
   - `packages/help-engine` and `apps/web/src/lib/content/help` generate build-time product knowledge.
   - When Cif retrieves help topics, tags like `tales of the valiant`, `tov`, `black flag`, `luck`, `doom`, `bfrd` guarantee accurate context without halluncinating rules.

---

## 3. Legal & Trademark Compliance

All deliverables must comply with `docs/legal/tales-of-the-valiant-attribution.md`:

- Explicit reference to Open Design LLC d/b/a Kobold Press under nominative fair use.
- Mandatory CC BY 4.0 BFRD attribution notice on `/for/tales-of-the-valiant` and the answer page.
- NO official Kobold Press compatibility logo or badge assets (preserves trademark safety).
- Plain language clarifying that while ToV is 5e-compatible, rules differences (such as Luck, Lineage/Heritage, Doom, and Talent trees) are distinct.

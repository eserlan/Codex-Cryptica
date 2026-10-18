# Specification Quality Checklist: Canvas Entity Reports

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-28
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Both clarification questions were resolved directly by the stakeholder: Q1 (canvas node-type scope) → Option A, entity-linking canvases only; Q2 (faction membership source) → Option A, scoped to the report's own entities, never the faction's full vault-wide roster. FR-018 and FR-019 were rewritten to state the resolution rather than leaving a marker.
- The stakeholder additionally asked, outside the two posed questions, that report generation also be reachable from a selection of entities in Graph view and Table view, not only from a Spatial Canvas. This was folded into User Story 3 (now surface-agnostic) with new FR-001a/002a/006a covering the two additional entry points and how relationships are sourced without canvas edges, rather than opened as a third clarification question, since it was a direct instruction rather than an open choice between options.
- The stakeholder then raised a second, larger architectural point: a generated report should be saved as a Note-category vault entity — opened and edited inside Codex Cryptica, with export to external formats as a secondary action on that saved entity — rather than only a transient preview with a copy action. This reordered priorities (persistence + editability moved to P1/P2; export moved to P5) and added FR-013/013a–d and FR-020. It directly strengthens the original issue's "reviewed and corrected... in Word or PDF" framing, since the primary way to review/correct is now in-app editing, with external export as an option rather than a requirement.
- A third refinement followed during planning: the saved report MUST be viewed and edited through the exact same entity view/editor as any other note — never a report-specific viewing surface, a structured "read mode," or a raw-markdown-source view. FR-013b was rewritten accordingly, and the presentation-layer requirement (FR-014) was narrowed to cover only report _generation_ (building the preview and the markdown that gets saved), since it plays no role once the entity exists and falls through to the app's ordinary entity view.
- All other candidate ambiguities (MVP export-format boundary, default Include/Detail state, GM-only field definition) were resolved with a documented default in the spec's Assumptions section instead of a clarification marker, since the codebase already has an established, reusable answer for each (existing GM-only field set, existing "copy first, file export later" precedent in the issue's own acceptance criteria).

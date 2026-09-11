# Specification Quality Checklist: Import Files from the File System

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-01
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

- Revalidated on 2026-08-01 after the spec was redesigned a second time: from an in-app "pick another vault, browse it live over OPFS" flow to native drag-and-drop / traditional file upload from the user's actual file system, since a browser page cannot browse a vault folder on disk without an explicit user-granted drop or selection. Image auto-copy now only applies to images included in the same drop/selection (including a dropped folder); a new missing-image resolution step (US3 scenarios 3–4, FR-011–FR-013) covers the case where it wasn't.
- The feature deliberately excludes overwriting and content-aware conflict merging to protect the current vault, consistent with the original design intent.
- Note (plan-level, not a spec change): the implementation plan now reuses `packages/importer`'s existing mechanical (non-AI) import pipeline (`ImportEngine`, `CCImportPackage`, `WebVaultWriter`) as a new source alongside CIF/Scabard/Chronica, rather than a bespoke OPFS-copy module. See research.md and plan.md.
- `/speckit-analyze` (2026-08-01) found 8 plan/task-level issues (0 CRITICAL, 2 HIGH, 3 MEDIUM×2 categories, 1 LOW) — all remediated the same day: entity-type mapping now preserves each file's real type instead of defaulting to "note" (was silently losing data); this source now gets its own `ImportEngine` instance with `titleFallback: false` and a `sourcePath`-only `sourceRefBuilder` so "conflict" means an exact path match, not a title-fuzzy one; `AssetDraft.contentHash` is now computed to avoid same-filename/different-content collisions; FR-017's concurrency guard and several previously-"inherited, unverified" UI behaviors (picked-up-file list, added/conflict counts, live-queryability) now have explicit tasks; the missing-image list's relationship to `PreviewAsset` was clarified as a new, separate concept rather than a reuse; the help-content registration path was confirmed (auto-glob, no `help-content.ts` edit needed); and the contract file was renamed from the superseded `vault-to-vault-import.md` to `file-system-import.md`. See research.md, plan.md, data-model.md, tasks.md, contracts/file-system-import.md for the resulting changes.

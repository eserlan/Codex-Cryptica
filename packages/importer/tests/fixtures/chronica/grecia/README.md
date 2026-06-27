# Chronica Grecia export fixtures

These fixtures support #1557, the mechanical Chronica export adapter.

The user supplied real Chronica JSON exports for the `Grecia` campaign. The full uploaded set included exports for:

- adventure notes
- characters
- encounters
- entities
- kinships
- places
- quests
- maps
- stat groups

`export-manifest.json` documents the observed file set, counts, important fields, and deterministic CC mappings.

`chronica.ventures-campaign-Grecia-export-16-stat-groups.json` is an actual raw Chronica export fixture from the supplied set. It is small enough to keep directly in the repository and covers the shared Chronica export shape:

- top-level `campaign`
- top-level `export_created_at`
- campaign metadata
- one domain-specific export area under `campaign`

Adapter tests should support multiple Chronica export JSON files for the same campaign and merge them into one CC import package keyed by campaign ID.

The remaining larger raw exports can be added here as direct JSON fixtures when needed by specific parser tests.

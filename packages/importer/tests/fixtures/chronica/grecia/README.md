# Chronica Grecia export fixtures

These fixtures support `#1557`, the Chronica multi-file campaign importer.

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

Current local fixture coverage in this checkout:

- `export-manifest.json`
- `raw-uploaded-files.txt`
- `chronica.ventures-campaign-Grecia-export-5-characters.json`
- `chronica.ventures-campaign-Grecia-export-13-places.json`
- `chronica.ventures-campaign-Grecia-export-16-stat-groups.json`

The smaller committed JSON files capture the shared Chronica export shape:

- top-level `campaign`
- top-level `export_created_at`
- campaign metadata
- one primary domain-specific export area under `campaign`

First-pass parser policy:

- self-consistent partial campaign imports are allowed
- multiple export files for the same campaign are merged into one CC package keyed by campaign ID
- mixed Chronica campaign IDs are rejected
- missing cross-file targets become unresolved references
- metadata-only domains such as `stat_groups` do not create standard entity drafts by default

Additional raw export files can be added here directly as parser coverage expands.

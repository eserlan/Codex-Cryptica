# Chronica Grecia Fixtures

This directory documents the observed Chronica `Grecia` export shape used for the `#1557` adapter work.

Current local fixture coverage:

- `export-manifest.json`
- `raw-uploaded-files.txt`
- `chronica.ventures-campaign-Grecia-export-5-characters.json`
- `chronica.ventures-campaign-Grecia-export-13-places.json`

These local files are intentionally small fixture slices, not the complete user upload set. Parser tests may add more domain-specific raw JSON files here as Chronica coverage expands.

First-pass parser policy:

- self-consistent partial campaign imports are allowed
- mixed Chronica campaign IDs are rejected
- missing cross-file targets become unresolved references
- metadata-only domains such as `stat_groups` do not create standard entity drafts

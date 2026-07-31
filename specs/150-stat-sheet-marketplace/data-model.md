# Data Model: Community Stat Sheet Template Directory

## Public Template Package

An immutable, versioned structural payload stored separately from listing
metadata:

- `schemaVersion`: integer package format version.
- `template`: name, description, free-form system, controlled category, labels,
  and ordered value-free fields.
- `fields[]`: field `id`, `label`, supported `type`, optional `formula`, `min`,
  `max`, and `step`; no entity value or collapsed UI state.
- `publishedAt`: server timestamp for auditing.

Validation requires a non-empty name, description, one system or category,
usable fields, supported field types, valid counter bounds, safe dice formulas,
bounded strings/arrays, and no unknown keys. Migrations return the current
canonical shape or a typed unsupported-version error.

The current Stat Sheet model represents sections with ordered `heading` fields;
their labels and positions are part of the published structural data.

## Community Template Listing

The public metadata record contains a stable generated `listingId`, title,
description, system, category, labels, optional owner display name, package
version, timestamps, and optional usage metadata. Active/delisted status is an
internal lifecycle state; delisted records are excluded from public browse.

The private owner token is stored in R2 object metadata or the local publish
registry, never in the public listing/package response.

## Local Stat Sheet Template

The existing vault-scoped `StatSheetTemplate` remains the source of truth for
local use. An imported template receives a new local ID, keeps its ordered
structural fields and metadata, and is saved through the existing
`StatSheetTemplateStore`. It is not linked live to the remote listing.

## Template Import State

`idle` → `loading` → `validating` → `needs-name` or `saving` → `complete`.
Any state can end in `error` or `cancelled` without mutating local templates.
Name collision handling is explicit rename, supported replacement, or cancel.

## Relationships

`Community Template Listing` 1:1 `Public Template Package` by `listingId`.
`Template Import` creates one `Local Stat Sheet Template` copy. Later remote
updates do not affect existing local copies.

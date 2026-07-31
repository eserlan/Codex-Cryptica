# Research: Community Stat Sheet Template Directory

## Decision: Add a standalone stat-sheet domain package

**Rationale:** The constitution requires major reusable logic to live in a
workspace package. Projection, package validation, migration, and import
normalization are shared by the browser flow and worker boundary.

**Alternatives considered:** Keeping all logic in `apps/web` would make the
worker trust a different implementation. Extending `packages/schema` alone
would mix transport schemas with domain operations.

## Decision: Publish a value-free, versioned package envelope

**Rationale:** The local template model already distinguishes reusable fields
from entity values. The public projection must omit `value` and `collapsed` and
reject unknown fields, while an envelope version allows supported older formats
to migrate deterministically.

**Alternatives considered:** Reusing the whole entity or guest-vault bundle
would violate privacy and couple template import to world publishing.

## Decision: Use independent R2 template objects and owner tokens

**Rationale:** The current directory assumes every listing has a published world
bundle. This feature explicitly allows publishing without a world, so templates
need their own namespace and lifecycle. The existing owner-token pattern still
supports update/unpublish without accounts.

**Alternatives considered:** Attaching templates to a published world violates
the feature clarification. A new user-account system is out of scope.

## Decision: Metadata-first browse with cursor pagination

**Rationale:** Directory cards need enough information for a decision without
downloading the package. Cursor pagination and bounded query parameters reuse
the existing directory shape without adding a database or search service.

**Alternatives considered:** Loading every package in the browser would be slow
and expose unnecessary data.

## Decision: Atomic local import through the existing template store

**Rationale:** Imported templates are independent vault-local copies. Parse,
migrate, normalize the destination name, and only then write one IndexedDB
record; failures leave the existing collection untouched.

**Alternatives considered:** Incrementally saving fields risks partial templates
and updating the remote package would destroy the local-copy guarantee.

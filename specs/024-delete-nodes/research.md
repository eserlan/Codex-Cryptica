# Research: Node Deletion and Relational Integrity

## Decision 1: Relational Cleanup Strategy
**Decision**: When an entity is deleted, we will perform a global scan of all other entities in the vault. For each entity that has a connection to the deleted ID, we will remove that connection from its metadata and resave the file.

**Rationale**: Maintaining a consistent graph is a core principle (Relational-First). Leaving dead links in Markdown files causes "ghost nodes" or broken connections upon vault reload.

**Alternatives considered**: 
- *Lazy Cleanup*: Only remove the link when the referring node is next saved. (Rejected: Leads to inconsistent graph state in the short term).
- *Virtual Cleanup*: Only hide the link in the UI. (Rejected: Violates "Sovereign Data" - the files should be accurate).

## Decision 2: UI Integration
**Decision**: Add a "Delete" button to the `EntityDetailPanel` header or footer, styled with a distinct warning (red border/text).

**Rationale**: The detail panel is the natural place for entity management actions.

## Decision 3: Confirmation Dialog
**Decision**: Use a standard browser `confirm()` for now to keep implementation simple and sub-100ms, with a custom Modal as a future enhancement.

**Rationale**: Meets requirement FR-002 with minimal complexity.

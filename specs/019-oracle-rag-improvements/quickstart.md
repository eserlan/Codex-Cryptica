# Quickstart: Oracle RAG Verification

## 1. Verifying Context Fusion (FR-006)
- Create an NPC with a unique name in the `lore` frontmatter field.
- Ensure the main body does NOT contain that name.
- Ask the Oracle: "Who is [Unique Name]?"
- **Success**: Oracle correctly identifies the NPC and their details.

## 2. Verifying Query Expansion (FR-004)
- Ask: "Tell me about Eldrin the Wise."
- Follow up: "Where does he live?"
- Check `sources` in message metadata (console log).
- **Success**: The second query retrieves the location entity linked to Eldrin, even though "Eldrin" wasn't in the query.

## 3. Verifying Neighborhood Enrichment (FR-003)
- Open a location entity.
- NPC inhabitants should be linked but not necessarily mentioned in the location's body.
- Ask: "Who can I meet at [Location]?"
- **Success**: Oracle lists the NPCs because their chronicles were included in the context.

## 4. Internal Logging (FR-001)
- Inspect the `oracle.messages` state in the Svelte DevTools or console.
- **Success**: Every assistant message has a `sources` array with valid entity IDs.

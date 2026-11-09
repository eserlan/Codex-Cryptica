## 2024-05-18 - Extract Entity Type Mappings

**Learning:** \`packages/generator-engine/src/campaign-generator-registry.ts\` is a very large file (~4500 lines) with mixed responsibilities. Constants and functions related to mapping generators to vault entity types (\`GENERATOR_ENTITY_TYPE\`, \`FALLBACK_CATEGORY\`, \`resolveEntityType\`) are a distinct, cohesive concept that can be safely extracted to its own file.

**Action:** Extracted \`GENERATOR_ENTITY_TYPE\`, \`FALLBACK_CATEGORY\`, and \`resolveEntityType\` to \`packages/generator-engine/src/generator-entity-types.ts\` and re-exported them from \`campaign-generator-registry.ts\` to preserve the existing public API.

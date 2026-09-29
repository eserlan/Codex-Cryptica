/**
 * Extra built-in templates offered alongside the standard one for a type.
 * Theme-independent, read-only, and never the default: "Standard <Type>" stays
 * the starting point until someone chooses otherwise.
 */
export interface ExtraBuiltinTemplate {
  /** Unique within its type; the template id is `builtin:{type}:{slug}`. */
  slug: string;
  entityType: string;
  name: string;
  markdown: string;
}

/**
 * The compact NPC "table card": the five-element anatomy the public NPC
 * generator uses, for an NPC you improvise mid-session and can introduce in
 * thirty seconds.
 */
const TABLE_CARD = `## Summary
One sentence: who they are and what they want from the party right now.

## The Five Elements
- **Immediate Want**: something urgent they need from the party this scene (one line)
- **Physical Mannerism**: a habit or vocal cadence you can portray easily (one line)
- **Sharp Contradiction**: a trait that cuts against their role or look (one line)
- **Relationship Hook**: a debt, rival, family tie or faction link (one line)
- **Sensory Tag**: a scent, sound or visual mark players will remember (one line)

## Table Delivery
How to introduce them in thirty seconds of dialogue (two or three sentences).
`;

export const EXTRA_BUILTIN_TEMPLATES: ExtraBuiltinTemplate[] = [
  {
    slug: "table-card",
    entityType: "character",
    name: "Table Card",
    markdown: TABLE_CARD,
  },
];

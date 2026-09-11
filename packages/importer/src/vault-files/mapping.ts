import type { MappingRuleSet } from "../cc/mapping";
import type { EntityDraft } from "../cc/package";

/**
 * Entity "types" in Codex Cryptica are free-form, per-vault categories
 * (EntityTypeSchema = z.string(), Flexible Categories) — not a fixed enum.
 * A dropped file already carries its own real type, so this derives a pure
 * passthrough rule per distinct `sourceType` actually present in the batch,
 * rather than a static hardcoded list that would mis-map any custom
 * category not on it. Drafts with no `sourceType` fall through to
 * `defaultType` ("note"), matching `DEFAULT_MAPPING_RULES`' behavior.
 */
export function buildVaultFilesMappingRules(
  drafts: EntityDraft[],
): MappingRuleSet {
  const seen = new Set<string>();
  const rules: MappingRuleSet["rules"] = [];

  for (const draft of drafts) {
    const sourceType = draft.sourceType;
    if (!sourceType || seen.has(sourceType)) continue;
    seen.add(sourceType);
    rules.push({ when: { sourceType }, thenType: sourceType });
  }

  return { rules, defaultType: "note" };
}

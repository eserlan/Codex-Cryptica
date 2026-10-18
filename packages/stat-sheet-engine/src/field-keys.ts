import { StatSheetFieldKeySchema } from "schema";
import type { StatSheetField } from "schema";

/**
 * User-friendly field keys (#3180). A key is an optional human-readable alias
 * for a field's immutable internal `id`. Resolution always ends at the id:
 * authoring surfaces accept either, storage keeps ids, so renaming a key can
 * never corrupt saved data or references — a stale key simply stops
 * resolving (the same visible-missing behavior as a typo today).
 */

/** Derives a key suggestion from a label: `Strength` → `strength`. */
export function slugifyFieldKey(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  const keyed = /^[a-z_]/.test(slug) ? slug : `field_${slug}`;
  return keyed.replace(/_+$/g, "") || "field";
}

/** Shape of the key format rule, mirroring the schema for editor UX. */
export function validateFieldKeyFormat(key: string): string | null {
  const parsed = StatSheetFieldKeySchema.safeParse(key);
  return parsed.success
    ? null
    : (parsed.error.issues[0]?.message ?? "Invalid key");
}

/**
 * Returns a key unique within `usedKeys` (exact, case-sensitive match),
 * suffixing `base_2`, `base_3`, … on collision.
 */
export function uniqueFieldKey(
  base: string,
  usedKeys: Iterable<string>,
): string {
  const used = new Set(usedKeys);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** Finds a field by id first, then by key. Returns undefined when neither matches. */
export function resolveFieldByKeyOrId(
  fields: readonly Pick<StatSheetField, "id" | "key">[],
  ref: string,
): StatSheetField | undefined {
  const trimmed = ref.trim();
  if (!trimmed) return undefined;
  const fieldList = fields as readonly StatSheetField[];
  return (
    fieldList.find((f) => f.id === trimmed) ??
    fieldList.find((f) => f.key === trimmed)
  );
}

/**
 * Validates every key in a field list. Returns human-readable errors for
 * malformed keys and exact-duplicate keys within the list. Empty/absent keys
 * are always fine (back-compat: pre-key templates validate clean).
 */
export function validateFieldKeys(
  fields: readonly Pick<StatSheetField, "id" | "key" | "label">[],
): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  fields.forEach((field, index) => {
    const label = field.label || `Field ${index + 1}`;
    if (field.key == null || field.key === "") return;
    const formatError = validateFieldKeyFormat(field.key);
    if (formatError) {
      errors.push(`"${label}" key: ${formatError}.`);
      return;
    }
    const idClash = fields.some(
      (other) => other.id !== field.id && other.id === field.key,
    );
    if (idClash) {
      errors.push(
        `"${label}" key "${field.key}" conflicts with another field's stable ID. Keys must not reuse field IDs.`,
      );
      return;
    }
    const clash = seen.get(field.key);
    if (clash !== undefined) {
      errors.push(
        `"${label}" key "${field.key}" is already used by "${clash}". Keys must be unique within a template.`,
      );
      return;
    }
    seen.set(field.key, label);
  });
  return errors;
}

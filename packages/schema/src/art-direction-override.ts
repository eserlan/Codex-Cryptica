/**
 * Art Direction v2 — vault-authored style overrides.
 *
 * An entity's `## Art Direction` block replaces the shipped theme layer. That
 * is right when a subject belongs to a different world than the vault theme
 * describes, and blunt when it belongs to the same world and merely looks
 * different in it: omitting a field does not fall back to the theme, it
 * deletes it. A faction written as materials, palette and light lost its
 * medium and rendered in a different technique from every other entity in the
 * vault.
 *
 * So a block may instead name the fields it means. The theme layer is already
 * exactly these four, and a named field replaces its counterpart while the
 * rest are supplied as usual:
 *
 *   Materials: black-lacquered plate, oxblood wool, verdigris bronze
 *   Palette: black, oxblood and bone-ash with sickly green as the only cool note
 *   Lighting: low guttering torchlight from below
 *
 * A block with no recognised key keeps the original replace-everything
 * behaviour, so nothing written before this existed changes meaning.
 */

/** Theme fields a vault-authored block may name. */
export interface ArtDirectionOverrideFields {
  medium?: string;
  materials?: string;
  palette?: string;
  lighting?: string;
  /**
   * Style lineage. Any override suppresses the theme's own lineage — a shipped
   * tradition carries a place and a century with it, which is usually the
   * thing being overridden — so this is how a block asks for one back.
   */
  style?: string;
}

export interface ParsedArtDirectionOverride {
  /** True when at least one field was named, i.e. layer rather than replace. */
  layered: boolean;
  fields: ArtDirectionOverrideFields;
  /** Anything outside the keyed lines, kept so prose is never dropped. */
  remainder: string;
}

const FIELD_PATTERN =
  /^[ \t]*(medium|materials?|palette|colou?rs?|lighting|light|style|tradition)[ \t]*:[ \t]*(.+?)[ \t]*$/i;

const FIELD_ALIASES: Record<string, keyof ArtDirectionOverrideFields> = {
  medium: "medium",
  material: "materials",
  materials: "materials",
  palette: "palette",
  color: "palette",
  colors: "palette",
  colour: "palette",
  colours: "palette",
  lighting: "lighting",
  light: "lighting",
  style: "style",
  tradition: "style",
};

/**
 * Splits a vault-authored block into named theme fields and leftover prose.
 *
 * Unrecognised keys are left in the remainder rather than dropped: a line like
 * "Mood: oppressive" is still direction, and belongs in the prompt even though
 * no theme field owns it.
 */
export function parseArtDirectionOverride(
  text?: string,
): ParsedArtDirectionOverride {
  const source = (text || "").trim();
  if (!source) return { layered: false, fields: {}, remainder: "" };

  const fields: ArtDirectionOverrideFields = {};
  const leftover: string[] = [];

  for (const line of source.split("\n")) {
    const match = line.match(FIELD_PATTERN);
    const key = match && FIELD_ALIASES[match[1].toLowerCase()];
    if (!key || !match?.[2]) {
      if (line.trim()) leftover.push(line.trim());
      continue;
    }
    // First mention wins, so a stray later line cannot quietly redefine a field.
    if (fields[key] === undefined) fields[key] = match[2].trim();
  }

  const layered = Object.keys(fields).length > 0;
  return {
    layered,
    fields,
    // A block with no keys is a replacement, and its whole text is the layer.
    remainder: layered ? leftover.join(" ") : source,
  };
}

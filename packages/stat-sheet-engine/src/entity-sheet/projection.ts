import type { StatSheet, StatSheetField, StatSheetTemplate } from "schema";
import type {
  SheetAudience,
  SheetCapabilityRegistry,
  SheetProjectionContext,
} from "./capabilities";

/**
 * A detached, deeply frozen copy of an entity's sheet values prepared for one
 * audience (#3960). It shares no references with the vault entity, so a
 * consumer — a catalogue view, a VTT share, an AI context builder — can never
 * write back through it.
 */
export interface EntitySheetProjection {
  readonly audience: SheetAudience;
  readonly templateId: string | null;
  readonly capabilities: readonly string[];
  readonly fields: readonly Readonly<StatSheetField>[];
}

export class SheetProjectionError extends Error {
  readonly code = "SHEET_PROJECTION_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SheetProjectionError";
  }
}

// Sheet fields are plain JSON by schema. A JSON round trip (unlike
// structuredClone) also copies Svelte 5 `$state` proxies, which is what
// callers holding a reactive entity will pass in.
function cloneFields(fields: readonly StatSheetField[]): StatSheetField[] {
  return JSON.parse(JSON.stringify(fields)) as StatSheetField[];
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/**
 * Builds the read-only projection of a sheet. Each capability the template
 * declares may narrow the fields through its `project` function, in
 * declaration order; templates without capabilities project to an exact copy
 * of their fields.
 *
 * Fails closed: if any projector throws or returns something other than a
 * field list, this throws `SheetProjectionError` rather than returning
 * partially filtered data.
 */
export function projectEntitySheet(
  sheet: Pick<StatSheet, "templateId" | "fields"> | null | undefined,
  template: StatSheetTemplate | null | undefined,
  audience: SheetAudience,
  registry: SheetCapabilityRegistry,
): EntitySheetProjection {
  const context: SheetProjectionContext = {
    audience,
    template: template ?? null,
  };
  let fields: StatSheetField[] = cloneFields(sheet?.fields ?? []);

  for (const capability of registry.resolve(template).active) {
    if (!capability.project) continue;
    let projected: unknown;
    try {
      projected = capability.project(fields, context);
    } catch (cause) {
      throw new SheetProjectionError(
        `Capability "${capability.id}" failed to project the sheet`,
        { cause },
      );
    }
    if (!Array.isArray(projected)) {
      throw new SheetProjectionError(
        `Capability "${capability.id}" did not return a field list`,
      );
    }
    fields = cloneFields(projected);
  }

  return deepFreeze({
    audience,
    templateId: sheet?.templateId ?? null,
    capabilities: [...(template?.capabilities ?? [])],
    fields,
  });
}

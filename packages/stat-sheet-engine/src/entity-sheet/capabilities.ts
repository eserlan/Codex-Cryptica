import {
  SheetCapabilityIdSchema,
  type SheetCapabilityId,
  type StatSheetField,
  type StatSheetTemplate,
} from "schema";

/**
 * Entity Sheet capability contract (#3960).
 *
 * A Stat Sheet template opts into extra behaviour by listing capability ids
 * in `StatSheetTemplate.capabilities`. The id is the only thing stored in the
 * vault; everything a capability can do is declared here, in code, and
 * registered with a `SheetCapabilityRegistry`. Template Markdown never
 * carries executable logic. See docs/entity-sheets.md.
 */

/** Who a read-only projection of a sheet is being prepared for. */
export type SheetAudience = "gm" | "player";

export interface SheetProjectionContext {
  readonly audience: SheetAudience;
  readonly template: StatSheetTemplate | null;
}

/**
 * Narrows the fields an audience may see. Receives a private copy of the
 * fields, so it may return a filtered or redacted array, but it must be pure:
 * no vault reads or writes, no network.
 */
export type SheetFieldProjector = (
  fields: StatSheetField[],
  context: SheetProjectionContext,
) => StatSheetField[];

/**
 * An allowlisted action a capability exposes on a sheet (for example a
 * merchant's "buy"). This is a declaration only: the handler that performs
 * it is wired up by the app, and any action with `mutates: true` must be
 * explicitly confirmed by the user before it runs.
 */
export interface SheetActionDefinition {
  /** Unique within its capability; lowercase words joined by hyphens. */
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly mutates: boolean;
}

export interface SheetCapabilityDefinition {
  readonly id: SheetCapabilityId;
  readonly label: string;
  readonly description?: string;
  /**
   * Entity categories the capability is designed for. Used to suggest it,
   * never to stop a template from loading. Omit for "any category".
   */
  readonly categories?: readonly string[];
  readonly actions?: readonly SheetActionDefinition[];
  readonly project?: SheetFieldProjector;
}

export interface RegisteredSheetAction {
  /** `<capability id>:<action id>`, unique across the registry. */
  readonly qualifiedId: string;
  readonly capabilityId: SheetCapabilityId;
  readonly action: SheetActionDefinition;
  readonly requiresConfirmation: boolean;
}

export interface ResolvedSheetCapabilities {
  /** Registered capabilities the template declares, in declaration order. */
  readonly active: readonly SheetCapabilityDefinition[];
  /**
   * Declared ids this client has no definition for (for example a template
   * made by a newer version). They are reported, never removed from the
   * template, and contribute no behaviour.
   */
  readonly unknown: readonly string[];
}

export class SheetCapabilityError extends Error {
  readonly code = "SHEET_CAPABILITY_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "SheetCapabilityError";
  }
}

const ACTION_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

function declaredIds(
  source: Pick<StatSheetTemplate, "capabilities"> | null | undefined,
): string[] {
  return [...new Set(source?.capabilities ?? [])];
}

export class SheetCapabilityRegistry {
  private readonly definitions = new Map<string, SheetCapabilityDefinition>();

  register(definition: SheetCapabilityDefinition): void {
    if (!SheetCapabilityIdSchema.safeParse(definition.id).success) {
      throw new SheetCapabilityError(
        `Invalid capability id "${definition.id}"`,
      );
    }
    if (this.definitions.has(definition.id)) {
      throw new SheetCapabilityError(
        `Capability "${definition.id}" is already registered`,
      );
    }
    const actionIds = new Set<string>();
    for (const action of definition.actions ?? []) {
      if (!ACTION_ID_PATTERN.test(action.id)) {
        throw new SheetCapabilityError(
          `Invalid action id "${action.id}" on capability "${definition.id}"`,
        );
      }
      if (actionIds.has(action.id)) {
        throw new SheetCapabilityError(
          `Duplicate action "${action.id}" on capability "${definition.id}"`,
        );
      }
      actionIds.add(action.id);
    }
    this.definitions.set(definition.id, definition);
  }

  has(id: string): boolean {
    return this.definitions.has(id);
  }

  get(id: string): SheetCapabilityDefinition | undefined {
    return this.definitions.get(id);
  }

  list(): SheetCapabilityDefinition[] {
    return [...this.definitions.values()];
  }

  resolve(
    template: Pick<StatSheetTemplate, "capabilities"> | null | undefined,
  ): ResolvedSheetCapabilities {
    const active: SheetCapabilityDefinition[] = [];
    const unknown: string[] = [];
    for (const id of declaredIds(template)) {
      const definition = this.definitions.get(id);
      if (definition) active.push(definition);
      else unknown.push(id);
    }
    return { active, unknown };
  }

  actionsFor(
    template: Pick<StatSheetTemplate, "capabilities"> | null | undefined,
  ): RegisteredSheetAction[] {
    return this.resolve(template).active.flatMap((capability) =>
      (capability.actions ?? []).map((action) => ({
        qualifiedId: `${capability.id}:${action.id}`,
        capabilityId: capability.id,
        action,
        requiresConfirmation: action.mutates,
      })),
    );
  }
}

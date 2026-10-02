import { z } from "zod";
import { ActionRefSchema, type ActionRef } from "../actions/types";
import {
  HELP_AREAS,
  HELP_ENTITY_KINDS,
  HELP_ROUTE_TEMPLATES,
  HELP_TABS,
} from "../context";

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const WorkflowSchema = z
  .object({
    id: z.string().regex(kebab).max(60),
    title: z.string().min(1).max(80),
    steps: z.array(z.string().min(1).max(160)).min(1).max(10),
    actionIds: z.array(z.string()).max(6),
  })
  .strict();

export const FeatureEntrySchema = z
  .object({
    id: z.string().regex(kebab).max(60),
    title: z.string().min(1).max(80),
    summary: z.string().min(1).max(280),
    /** Staging-only entries are dropped from production bundles. */
    channel: z.enum(["production", "staging"]),
    routes: z.array(z.enum(HELP_ROUTE_TEMPLATES)).min(1),
    areas: z.array(z.enum(HELP_AREAS)).min(1),
    kinds: z.union([z.literal("any"), z.array(z.enum(HELP_ENTITY_KINDS))]),
    tabs: z.array(z.enum(HELP_TABS)),
    workflows: z.array(WorkflowSchema),
    /** Existing help articles this feature draws on. References, never copies. Optional. */
    helpIds: z.array(z.string().min(1)).default([]),
    related: z.array(z.string().regex(kebab)).default([]),
    actions: z.array(ActionRefSchema),
  })
  .strict();

export type Workflow = z.infer<typeof WorkflowSchema>;
export type FeatureEntry = z.infer<typeof FeatureEntrySchema>;

export interface RegistryValidationDeps {
  /** Existing help article IDs. Injected so this package never imports from `apps/web`. */
  helpIds: ReadonlySet<string>;
}

function parseEntries(
  entries: readonly unknown[],
  errors: string[],
): FeatureEntry[] {
  const parsed: FeatureEntry[] = [];
  entries.forEach((raw, i) => {
    const result = FeatureEntrySchema.safeParse(raw);
    if (result.success) {
      parsed.push(result.data);
      return;
    }
    const id =
      raw && typeof raw === "object" && "id" in raw
        ? String((raw as { id: unknown }).id)
        : `#${i}`;
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`)
      .join("; ");
    errors.push(`Feature ${id}: ${issues}`);
  });
  return parsed;
}

function duplicateIdErrors(entries: readonly FeatureEntry[]): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const entry of entries) {
    if (seen.has(entry.id)) errors.push(`Duplicate feature id: ${entry.id}`);
    seen.add(entry.id);
  }
  return errors;
}

function actionErrors(
  entry: FeatureEntry,
  helpIds: ReadonlySet<string>,
  seenActionIds: Set<string>,
): string[] {
  const errors: string[] = [];
  for (const ref of entry.actions) {
    if (seenActionIds.has(ref.id)) {
      errors.push(`Feature ${entry.id}: duplicate action id "${ref.id}"`);
    }
    seenActionIds.add(ref.id);
    for (const step of [ref.action, ref.action.then]) {
      if (step?.type === "openHelp" && !helpIds.has(step.helpId)) {
        errors.push(
          `Feature ${entry.id}: action "${ref.id}" opens unknown help "${step.helpId}"`,
        );
      }
    }
  }
  return errors;
}

function workflowErrors(entry: FeatureEntry): string[] {
  const actionIds = new Set(entry.actions.map((a: ActionRef) => a.id));
  return entry.workflows.flatMap((workflow) =>
    workflow.actionIds
      .filter((actionId) => !actionIds.has(actionId))
      .map(
        (actionId) =>
          `Feature ${entry.id}: workflow "${workflow.id}" uses action "${actionId}" not listed in its actions`,
      ),
  );
}

function referenceErrors(
  entry: FeatureEntry,
  featureIds: ReadonlySet<string>,
  helpIds: ReadonlySet<string>,
  seenActionIds: Set<string>,
): string[] {
  return [
    ...entry.helpIds
      .filter((helpId) => !helpIds.has(helpId))
      .map((helpId) => `Feature ${entry.id}: unknown help article "${helpId}"`),
    ...entry.related
      .filter((related) => !featureIds.has(related))
      .map(
        (related) =>
          `Feature ${entry.id}: unknown related feature "${related}"`,
      ),
    ...actionErrors(entry, helpIds, seenActionIds),
    ...workflowErrors(entry),
  ];
}

/**
 * Cross-reference validation. Returns human-readable errors; an empty array
 * means the registry is consistent. Run in unit tests and in the bundle build,
 * so a broken reference is a build failure and never a runtime guess.
 */
export function validateRegistry(
  entries: readonly unknown[],
  deps: RegistryValidationDeps,
): string[] {
  const errors: string[] = [];
  const parsed = parseEntries(entries, errors);
  errors.push(...duplicateIdErrors(parsed));

  const featureIds = new Set(parsed.map((entry) => entry.id));
  const seenActionIds = new Set<string>();
  for (const entry of parsed) {
    errors.push(
      ...referenceErrors(entry, featureIds, deps.helpIds, seenActionIds),
    );
  }
  return errors;
}

/** Drops staging-only entries from a production build. */
export function filterByChannel(
  entries: readonly FeatureEntry[],
  channel: "production" | "staging",
): FeatureEntry[] {
  return channel === "staging"
    ? [...entries]
    : entries.filter((entry) => entry.channel === "production");
}

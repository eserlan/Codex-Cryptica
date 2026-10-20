/**
 * Business / Enterprise Generator (#3627, spec 180) — staged AI generation.
 * Three stages on one chat session (identity → connections → trouble). Each
 * stage is checked and retried; a stage that stays unusable keeps its local
 * content and its sections are listed in `fallbackSections`.
 */

import { defaultRng, type Rng } from "./random-utils";
import { CRIMINAL_WORDS } from "./business-tables";
import {
  generateBusinessLocal,
  resolveBusinessOptions,
  BUSINESS_STAFF_RANGE,
} from "./business-local";
import {
  checkBusiness,
  sharedSurnameProblems,
  sizeStaffProblem,
  distinctiveProblem,
  hookAudienceProblems,
  findUnintroducedNames,
  repairBusiness,
} from "./business-checks";
import {
  businessStageMessage,
  parseBusinessConnections,
  parseBusinessIdentityFilled,
  parseBusinessTrouble,
} from "./public-business";
import {
  type BusinessDocument,
  type BusinessGeneratorOptions,
  type BusinessPerson,
  type BusinessSectionId,
  type ResolvedBusinessOptions,
} from "./business-state";
import {
  askChecked,
  throwIfAborted,
  withRetryFeedback,
} from "./staged-runtime";
import {
  FIXING_DETAIL,
  ONE_PASS_DETAIL,
  StagedProgress,
  type StagedProgressStep,
} from "./staged-progress";

export type BusinessStepId = "identity" | "connections" | "trouble";

export const BUSINESS_STEPS: ReadonlyArray<{
  id: BusinessStepId;
  label: string;
}> = [
  { id: "identity", label: "Naming the business and its people" },
  { id: "connections", label: "Mapping suppliers and rivals" },
  { id: "trouble", label: "Writing the pressure and hooks" },
];

export interface BusinessStagedDeps {
  /** One chat session: each call is a turn, so later stages see earlier ones. */
  send: (message: string, signal?: AbortSignal) => Promise<string>;
  onProgress?: (steps: StagedProgressStep[]) => void;
  signal?: AbortSignal;
  rng?: Rng;
}

const ALL_SECTIONS: BusinessSectionId[] = [
  "identity",
  "operations",
  "leadership",
  "clientele",
  "dependencies",
  "relationships",
  "reputation",
  "pressure",
  "asset",
  "secret",
  "opportunity",
  "complication",
  "hooks",
];

function staffProblems(count: number, opts: ResolvedBusinessOptions): string[] {
  const [min, max] = BUSINESS_STAFF_RANGE[opts.scale];
  return count >= min && count <= max
    ? []
    : [
        `Give between ${min} and ${max} key staff for a ${opts.scale} business (you gave ${count}).`,
      ];
}

type Turn = (fb: { problems: string[]; previous: unknown }) => Promise<string>;

interface StageContext {
  opts: ResolvedBusinessOptions;
  signal?: AbortSignal;
  progress: StagedProgress<BusinessStepId>;
  failed: BusinessSectionId[];
}

/** Stage 1: names, leadership, staff and clientele. A failed stage keeps the local values. */
async function identityStage(
  doc: BusinessDocument,
  turn: Turn,
  ctx: StageContext,
): Promise<BusinessDocument> {
  const { opts, signal, progress, failed } = ctx;
  throwIfAborted(signal);
  progress.set("identity", "active");
  const result = await askChecked(
    turn,
    (reply) =>
      parseBusinessIdentityFilled(reply, {
        identity: doc.identity,
        operations: doc.operations,
        leadership: doc.leadership,
        staff: doc.staff,
        clientele: doc.clientele,
      }),
    (data) => ({
      hard: [],
      // Mismatches are asked about once, then repaired in place by the final
      // check, so a wrong count never throws away the whole stage.
      soft: [
        ...staffProblems(data.stage.staff.length, opts),
        ...[
          sizeStaffProblem(data.stage.operations.size, data.stage.staff.length),
        ].filter((p): p is string => p !== null),
        ...sharedSurnameProblems([data.stage.leadership, ...data.stage.staff]),
      ],
    }),
    {
      signal,
      unreadable: "the reply was not a usable identity stage",
    },
  );
  if (!result) {
    failed.push(
      "identity",
      "operations",
      "leadership",
      "clientele",
      ...doc.staff.map((p) => `staff:${p.id}` as BusinessSectionId),
    );
    progress.set("identity", "fallback", ONE_PASS_DETAIL);
    return doc;
  }
  const d = result.data.stage;
  failed.push(...result.data.filled);
  // Fit the roster now, so later stages are told the staff the business ends with.
  const { staff, topped } = fitRoster(d.staff, doc.staff, opts.scale);
  failed.push(...topped.map((p) => `staff:${p.id}` as BusinessSectionId));
  progress.set("identity", "done", result.retried ? FIXING_DETAIL : undefined);
  return {
    ...doc,
    identity: d.identity,
    operations: d.operations,
    leadership: {
      ...d.leadership,
      id: "lead",
      role: opts.playersOwn ? "manager" : "owner",
    },
    staff,
    clientele: d.clientele,
  };
}

/**
 * The AI's staff cut to the scale's maximum, and topped up to its minimum with
 * the local base's people (never placeholder names). `topped` lists those added.
 */
function fitRoster(
  ai: BusinessPerson[],
  local: BusinessPerson[],
  scale: ResolvedBusinessOptions["scale"],
): { staff: BusinessPerson[]; topped: BusinessPerson[] } {
  const [min, max] = BUSINESS_STAFF_RANGE[scale];
  const kept = ai.slice(0, max);
  const topped = local
    .slice(0, Math.max(0, min - kept.length))
    .map((p, i) => ({ ...p, id: `staff-${kept.length + i + 1}` }));
  return { staff: [...kept, ...topped], topped };
}

/** A soft problem (one retry) when the text names someone the document never introduced. */
function unintroducedNameProblems(
  candidate: BusinessDocument,
  texts: readonly string[],
): string[] {
  const names = findUnintroducedNames(candidate, texts);
  return names.length
    ? [
        `These names are used without being introduced: ${names.join(", ")}. Refer only to the people and parties in the established facts (a place name is fine; name it as a place).`,
      ]
    : [];
}

/** Stage 2: dependencies, relationships and reputation. */
async function connectionsStage(
  doc: BusinessDocument,
  turn: Turn,
  ctx: StageContext,
): Promise<BusinessDocument> {
  const { signal, progress, failed } = ctx;
  throwIfAborted(signal);
  progress.set("connections", "active");
  const result = await askChecked(
    turn,
    parseBusinessConnections,
    (data) => ({
      hard: [],
      soft: unintroducedNameProblems({ ...doc, ...data }, [
        ...data.dependencies.map((d) => d.ifItFails),
        ...data.relationships.map((r) => r.reason),
        data.reputation.perception,
        data.reputation.consequence,
      ]),
    }),
    {
      signal,
      unreadable: "the reply was not a usable connections stage",
    },
  );
  if (!result) {
    failed.push("dependencies", "relationships", "reputation");
    progress.set("connections", "fallback", ONE_PASS_DETAIL);
    return doc;
  }
  progress.set(
    "connections",
    "done",
    result.retried ? FIXING_DETAIL : undefined,
  );
  return { ...doc, ...result.data };
}

/** The first criminal word in a legitimate business's secret is a hard problem. */
function secretProblems(
  secret: string,
  legitimacy: ResolvedBusinessOptions["legitimacy"],
): string[] {
  const lower = secret.toLowerCase();
  const criminal = CRIMINAL_WORDS.find((w) => lower.includes(w));
  return legitimacy === "legitimate" && criminal
    ? [
        `The secret reads as criminal ("${criminal}"), but this business is fully legitimate.`,
      ]
    : [];
}

/** Stage 3: pressure, secret, opportunity, complication, hooks and management. */
async function troubleStage(
  doc: BusinessDocument,
  turn: Turn,
  ctx: StageContext,
): Promise<BusinessDocument> {
  const { opts, signal, progress, failed } = ctx;
  throwIfAborted(signal);
  progress.set("trouble", "active");
  const result = await askChecked(
    turn,
    (reply) => parseBusinessTrouble(reply, opts.playersOwn),
    (data) => ({
      hard: secretProblems(data.secret, opts.legitimacy),
      soft: [
        ...unintroducedNameProblems({ ...doc, ...data }, [
          data.pressure,
          data.asset,
          data.secret,
          data.opportunity,
          data.complication,
          ...data.hooks,
          ...Object.values(data.management ?? {}).flat(),
        ]),
        ...[distinctiveProblem(doc.identity.distinctive, data.asset)].filter(
          (p): p is string => p !== null,
        ),
        ...hookAudienceProblems(data.hooks),
      ],
    }),
    { signal, unreadable: "the reply was not a usable trouble stage" },
  );
  if (!result) {
    failed.push(
      "pressure",
      "asset",
      "secret",
      "opportunity",
      "complication",
      "hooks",
    );
    if (opts.playersOwn) failed.push("management");
    progress.set("trouble", "fallback", ONE_PASS_DETAIL);
    return doc;
  }
  const d = result.data;
  progress.set("trouble", "done", result.retried ? FIXING_DETAIL : undefined);
  return {
    ...doc,
    pressure: d.pressure,
    asset: d.asset,
    secret: d.secret,
    opportunity: d.opportunity,
    complication: d.complication,
    hooks: d.hooks,
    management: opts.playersOwn ? d.management : undefined,
  };
}

/** Deterministic checks last: repair rebuilds only what still fails. */
function finalise(
  doc: BusinessDocument,
  ctx: StageContext,
  rng: Rng,
): BusinessDocument {
  const { opts, failed } = ctx;
  let next = doc;
  const issues = checkBusiness(next);
  if (issues.length > 0) {
    failed.push(...issues.map((i) => i.section));
    const hooksBefore = next.hooks;
    next = repairBusiness(next, issues, rng);
    // Hooks are rebuilt when a section they name changes, without being an issue.
    if (next.hooks !== hooksBefore) failed.push("hooks");
  }
  if (checkBusiness(next).length > 0) {
    // Last resort: a full local document, which always passes.
    const local = generateBusinessLocal(opts, rng);
    return {
      ...local,
      fallbackSections: [
        ...ALL_SECTIONS,
        ...(opts.playersOwn ? (["management"] as const) : []),
      ],
    };
  }
  const warnings = findUnintroducedNames(next);
  return {
    ...next,
    fallbackSections: [...new Set(failed)],
    ...(warnings.length ? { warnings } : {}),
  };
}

export async function generateBusinessStaged(
  options: BusinessGeneratorOptions,
  deps: BusinessStagedDeps,
): Promise<BusinessDocument> {
  const { send, signal } = deps;
  const rng = deps.rng ?? defaultRng;
  const opts = resolveBusinessOptions(options, rng);
  const ctx: StageContext = {
    opts,
    signal,
    progress: new StagedProgress<BusinessStepId>(
      BUSINESS_STEPS,
      deps.onProgress,
    ),
    failed: [],
  };
  // The local document is the base: a stage that fails simply keeps its values.
  let doc = generateBusinessLocal(opts, rng);
  const turnFor =
    (message: string): Turn =>
    (fb) =>
      send(withRetryFeedback(message, fb.problems, fb.previous), signal);

  doc = await identityStage(
    doc,
    turnFor(businessStageMessage("identity", opts)),
    ctx,
  );
  doc = await connectionsStage(
    doc,
    turnFor(businessStageMessage("connections", opts, doc)),
    ctx,
  );
  doc = await troubleStage(
    doc,
    turnFor(businessStageMessage("trouble", opts, doc)),
    ctx,
  );
  throwIfAborted(signal);
  return finalise(doc, ctx, rng);
}

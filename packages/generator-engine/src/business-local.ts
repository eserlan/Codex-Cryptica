/**
 * Business / Enterprise Generator (#3627, spec 180) — offline generation.
 * Every section is built from business-tables.ts so the output always passes
 * the checks in business-checks.ts.
 */

import { defaultRng, pickFrom, type Rng } from "./random-utils";
import {
  BUSINESS_POOLS,
  BUSINESS_TYPES,
  GENERIC_POOLS,
  genreGroup,
  type BusinessGenreGroup,
} from "./business-tables";
import {
  BUSINESS_ALLOWED_LABELS,
  BUSINESS_LEGITIMACY,
  BUSINESS_SCALES,
  BUSINESS_TONES,
  BUSINESS_WEALTH,
  type BusinessDocument,
  type BusinessGeneratorOptions,
  type BusinessPerson,
  type BusinessRelationship,
  type BusinessRelationshipKind,
  type BusinessRelationshipLabel,
  type BusinessScale,
  type BusinessSectionId,
  type ResolvedBusinessOptions,
} from "./business-state";

/** Staff count range per scale (inclusive). */
export const BUSINESS_STAFF_RANGE: Record<
  BusinessScale,
  readonly [number, number]
> = {
  tiny: [0, 1],
  small: [1, 2],
  established: [2, 3],
  regional: [3, 4],
  major: [3, 4],
};

const CONTEXT_LIMIT = 1200;

/** The default graph label for each kind: the first label its kind allows (FR-011). */
export const BUSINESS_LABEL_FOR_KIND: Record<
  BusinessRelationshipKind,
  BusinessRelationshipLabel
> = Object.fromEntries(
  (Object.keys(BUSINESS_ALLOWED_LABELS) as BusinessRelationshipKind[]).map(
    (kind) => [kind, BUSINESS_ALLOWED_LABELS[kind][0]],
  ),
) as Record<BusinessRelationshipKind, BusinessRelationshipLabel>;

const WEALTH_PHRASE: Record<string, string> = {
  struggling: "scraping by",
  modest: "modest and steady",
  comfortable: "comfortably profitable",
  rich: "well funded, and it shows",
};

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function pickOr<T extends string>(
  value: T | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return value && allowed.includes(value) ? value : fallback;
}

/** Picks `n` distinct items. */
export function pickUnique<T>(pool: readonly T[], n: number, rng: Rng): T[] {
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const i = Math.floor(rng() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function between(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function personName(group: BusinessGenreGroup, rng: Rng): string {
  const { names } = BUSINESS_POOLS[group];
  return `${pickFrom(names.first, rng)} ${pickFrom(names.last, rng)}`;
}

export function resolveBusinessOptions(
  options: BusinessGeneratorOptions = {},
  rng: Rng = defaultRng,
): ResolvedBusinessOptions {
  const genre = clean(options.genre) || "Classic Fantasy";
  const group = genreGroup(genre);
  return {
    genre,
    businessType:
      clean(options.businessType) || pickFrom(BUSINESS_TYPES[group], rng),
    scale: pickOr(options.scale, BUSINESS_SCALES, "small"),
    legitimacy: pickOr(options.legitimacy, BUSINESS_LEGITIMACY, "legitimate"),
    wealth: pickOr(options.wealth, BUSINESS_WEALTH, "modest"),
    clientele: clean(options.clientele),
    location: clean(options.location),
    tone: pickOr(options.tone, BUSINESS_TONES, "grounded"),
    campaignContext: clean(options.campaignContext).slice(0, CONTEXT_LIMIT),
    playersOwn: options.playersOwn === true,
  };
}

interface Ctx {
  opts: ResolvedBusinessOptions;
  group: BusinessGenreGroup;
  rng: Rng;
}

function ctxFor(doc: BusinessDocument, rng: Rng): Ctx {
  return { opts: doc.options, group: genreGroup(doc.options.genre), rng };
}

function makeIdentity({ opts, group, rng }: Ctx): BusinessDocument["identity"] {
  const pools = BUSINESS_POOLS[group];
  const where = opts.location ? ` in ${opts.location}` : " in the district";
  return {
    name: `The ${pickFrom(GENERIC_POOLS.nameAdjectives, rng)} ${pickFrom(GENERIC_POOLS.nameNouns, rng)}`,
    type: opts.businessType,
    description: `${opts.businessType}${where}, ${WEALTH_PHRASE[opts.wealth]}.`,
    reputationLine: pickFrom(GENERIC_POOLS.reputations, rng),
    distinctive: pickFrom(pools.assets, rng),
  };
}

function makeOperations({
  opts,
  group,
  rng,
}: Ctx): BusinessDocument["operations"] {
  void group;
  return {
    provides: pickFrom(GENERIC_POOLS.providesTemplates, rng).replace(
      "{type}",
      opts.businessType.toLowerCase(),
    ),
    payers: opts.clientele || pickFrom(GENERIC_POOLS.clienteleTypical, rng),
    whyHere: pickFrom(GENERIC_POOLS.whyHereTemplates, rng).replace(
      "{location}",
      opts.location || "the district",
    ),
    mainIncome: pickFrom(GENERIC_POOLS.mainIncomeTemplates, rng),
    model: pickFrom(GENERIC_POOLS.modelTemplates, rng),
    size: pickFrom(GENERIC_POOLS.sizeTemplates, rng),
    position: pickFrom(GENERIC_POOLS.positionTemplates, rng),
  };
}

function makeLeadership({ opts, group, rng }: Ctx): BusinessPerson {
  return {
    id: "lead",
    name: personName(group, rng),
    role: opts.playersOwn ? "manager" : "owner",
    goal: pickFrom(GENERIC_POOLS.leaderGoals, rng),
    style: pickFrom(GENERIC_POOLS.leaderStyles, rng),
    trait: pickFrom(GENERIC_POOLS.leaderTraits, rng),
    pressure: pickFrom(GENERIC_POOLS.leaderPressures, rng),
  };
}

function makeStaffPerson(
  { group, rng }: Ctx,
  index: number,
  roles: readonly string[],
): BusinessPerson {
  return {
    id: `staff-${index}`,
    name: personName(group, rng),
    role: roles[index - 1] ?? pickFrom(GENERIC_POOLS.staffRoles, rng),
    goal: pickFrom(GENERIC_POOLS.staffGoals, rng),
    trait: pickFrom(GENERIC_POOLS.staffTraits, rng),
  };
}

function makeStaff(ctx: Ctx): BusinessPerson[] {
  const [min, max] = BUSINESS_STAFF_RANGE[ctx.opts.scale];
  const count = between(min, max, ctx.rng);
  const roles = pickUnique(GENERIC_POOLS.staffRoles, count, ctx.rng);
  return Array.from({ length: count }, (_, i) =>
    makeStaffPerson(ctx, i + 1, roles),
  );
}

function makeClientele({ opts, rng }: Ctx): BusinessDocument["clientele"] {
  const excluded =
    rng() < 0.5 ? pickFrom(GENERIC_POOLS.clienteleExcluded, rng) : undefined;
  return {
    typical: opts.clientele || pickFrom(GENERIC_POOLS.clienteleTypical, rng),
    valuable: pickFrom(GENERIC_POOLS.clienteleValuable, rng),
    undesirable: pickFrom(GENERIC_POOLS.clienteleUndesirable, rng),
    ...(excluded ? { excluded } : {}),
  };
}

function makeDependencies({
  group,
  rng,
}: Ctx): BusinessDocument["dependencies"] {
  const picks = pickUnique(
    BUSINESS_POOLS[group].dependencies,
    between(1, 2, rng),
    rng,
  );
  return picks.map((d, i) => ({ id: `dep-${i + 1}`, ...d }));
}

function makeRelationships({ group, rng }: Ctx): BusinessRelationship[] {
  const picks = pickUnique(
    BUSINESS_POOLS[group].parties,
    between(1, 3, rng),
    rng,
  );
  return picks.map((p, i) => ({
    id: `rel-${i + 1}`,
    name: p.name,
    kind: p.kind,
    label: p.label ?? BUSINESS_LABEL_FOR_KIND[p.kind],
    reason: p.reason,
    partyKind: p.partyKind,
  }));
}

function makeSecret({ opts, group, rng }: Ctx): string {
  const pools = BUSINESS_POOLS[group];
  const criminal =
    opts.legitimacy === "legitimate" || opts.legitimacy === "grey"
      ? false
      : opts.legitimacy === "front"
        ? true
        : rng() < 0.5;
  return pickFrom(criminal ? pools.criminalSecrets : pools.legitSecrets, rng);
}

/** Builds the hooks from the document's own names, so each one is anchored. */
function makeHooks(doc: BusinessDocument): string[] {
  const rel = doc.relationships[0];
  const dep = doc.dependencies[0];
  const relLine = rel
    ? `${rel.name} wants something from the business: ${rel.reason}`
    : `Someone outside the business is pressing on ${doc.pressure.toLowerCase()}`;
  const depLine = dep
    ? `If ${dep.input} fails, ${dep.ifItFails}`
    : `The trouble is worse than it looks: ${doc.pressure}`;
  const personLine = `${doc.leadership.name} is hiding how bad "${doc.pressure}" has become and needs help before it breaks.`;
  return [relLine, personLine, depLine].map((h) =>
    h.replace(/\s+/g, " ").trim(),
  );
}

function makeManagement(rng: Rng): BusinessDocument["management"] {
  const g = GENERIC_POOLS;
  return {
    strengths: pickUnique(g.mgmtStrengths, between(2, 3, rng), rng),
    liabilities: pickUnique(g.mgmtLiabilities, between(2, 3, rng), rng),
    upgrades: pickUnique(g.mgmtUpgrades, between(1, 2, rng), rng),
    obligations: pickUnique(g.mgmtObligations, between(1, 2, rng), rng),
    successAttracts: pickUnique(g.mgmtSuccess, between(1, 2, rng), rng),
  };
}

/**
 * Rebuilds a single section from the tables, leaving every other section as it
 * is. Used by repair and by offline regeneration.
 */
export function localSectionFor(
  doc: BusinessDocument,
  section: BusinessSectionId,
  rng: Rng = defaultRng,
): BusinessDocument {
  const ctx = ctxFor(doc, rng);
  const next: BusinessDocument = {
    ...doc,
    fallbackSections: doc.fallbackSections,
  };
  switch (section) {
    case "identity":
      next.identity = makeIdentity(ctx);
      break;
    case "operations":
      next.operations = makeOperations(ctx);
      break;
    case "leadership": {
      const leader = makeLeadership(ctx);
      next.leadership = { ...leader, id: doc.leadership.id };
      break;
    }
    case "clientele":
      next.clientele = makeClientele(ctx);
      break;
    case "dependencies":
      next.dependencies = makeDependencies(ctx);
      break;
    case "relationships":
      next.relationships = makeRelationships(ctx);
      break;
    case "reputation":
      next.reputation = {
        perception: pickFrom(GENERIC_POOLS.reputations, rng),
        consequence: pickFrom(GENERIC_POOLS.reputationConsequences, rng),
      };
      break;
    case "pressure":
      next.pressure = pickFrom(BUSINESS_POOLS[ctx.group].pressures, rng);
      break;
    case "asset":
      next.asset = pickFrom(BUSINESS_POOLS[ctx.group].assets, rng);
      break;
    case "secret":
      next.secret = makeSecret(ctx);
      break;
    case "opportunity":
      next.opportunity = pickFrom(BUSINESS_POOLS[ctx.group].opportunities, rng);
      break;
    case "complication":
      next.complication = pickFrom(
        BUSINESS_POOLS[ctx.group].complications,
        rng,
      );
      break;
    case "hooks":
      next.hooks = makeHooks(next);
      break;
    case "management":
      next.management = doc.options.playersOwn
        ? makeManagement(rng)
        : undefined;
      break;
    default: {
      if (section.startsWith("staff:")) {
        const id = section.slice("staff:".length);
        next.staff = doc.staff.map((person, i) =>
          person.id === id
            ? {
                ...makeStaffPerson(ctx, i + 1, [person.role]),
                id,
                role: person.role,
              }
            : person,
        );
      }
    }
  }
  return next;
}

export function generateBusinessLocal(
  options: BusinessGeneratorOptions = {},
  rng: Rng = defaultRng,
): BusinessDocument {
  const opts = resolveBusinessOptions(options, rng);
  const ctx: Ctx = { opts, group: genreGroup(opts.genre), rng };
  const doc: BusinessDocument = {
    version: 1,
    options: opts,
    identity: makeIdentity(ctx),
    operations: makeOperations(ctx),
    leadership: makeLeadership(ctx),
    staff: makeStaff(ctx),
    clientele: makeClientele(ctx),
    dependencies: makeDependencies(ctx),
    relationships: makeRelationships(ctx),
    reputation: {
      perception: pickFrom(GENERIC_POOLS.reputations, rng),
      consequence: pickFrom(GENERIC_POOLS.reputationConsequences, rng),
    },
    pressure: pickFrom(BUSINESS_POOLS[ctx.group].pressures, rng),
    asset: pickFrom(BUSINESS_POOLS[ctx.group].assets, rng),
    secret: makeSecret(ctx),
    opportunity: pickFrom(BUSINESS_POOLS[ctx.group].opportunities, rng),
    complication: pickFrom(BUSINESS_POOLS[ctx.group].complications, rng),
    hooks: [],
    fallbackSections: [],
  };
  doc.hooks = makeHooks(doc);
  if (opts.playersOwn) doc.management = makeManagement(rng);
  return doc;
}

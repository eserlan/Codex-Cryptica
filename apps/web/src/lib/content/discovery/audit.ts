import type { DiscoveryEntry } from "./schema";
import { entries as allEntries } from "./entries";
import { claimedIntents, getClusters, normaliseIntent } from "./registry";

/**
 * The audit (#2566).
 *
 * Split deliberately into two severities. `error` findings are the
 * deterministic backstop — duplicate ids, duplicate paths, two indexable pages
 * claiming one intent — and are safe to fail a build on because they are
 * decidable from the data. `warning` findings need a person: they are
 * *possible* overlap, and the issue is explicit that fuzzy matching must not
 * become a brittle hard failure.
 */

export type DiscoveryFindingSeverity = "error" | "warning";

export interface DiscoveryFinding {
  severity: DiscoveryFindingSeverity;
  /** Short machine-readable kind, for grouping in reports. */
  code: string;
  message: string;
  /** Entry ids the finding concerns. */
  entries: string[];
}

/** Ids of the two entries in a pair, order-independent. */
const pairKey = (a: string, b: string) => [a, b].sort().join("|");

function duplicateIds(entries: DiscoveryEntry[]): DiscoveryFinding[] {
  const seen = new Map<string, number>();
  for (const entry of entries) {
    seen.set(entry.id, (seen.get(entry.id) ?? 0) + 1);
  }
  return [...seen]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({
      severity: "error" as const,
      code: "duplicate-id",
      message: `Registry id "${id}" is used ${count} times. Ids must be unique.`,
      entries: [id],
    }));
}

function duplicatePaths(entries: DiscoveryEntry[]): DiscoveryFinding[] {
  const byPath = new Map<string, DiscoveryEntry[]>();
  for (const entry of entries) {
    const bucket = byPath.get(entry.canonicalPath) ?? [];
    bucket.push(entry);
    byPath.set(entry.canonicalPath, bucket);
  }
  return [...byPath]
    .filter(([, group]) => group.length > 1)
    .map(([path, group]) => ({
      severity: "error" as const,
      code: "duplicate-canonical-path",
      message: `${group.length} entries claim ${path}. A canonical path has exactly one owner.`,
      entries: group.map((entry) => entry.id),
    }));
}

/** Pairs whose overlap has been recorded and justified, in either direction. */
function acknowledgedPairs(entries: DiscoveryEntry[]): Set<string> {
  const pairs = new Set<string>();
  for (const entry of entries) {
    for (const overlap of entry.acknowledgedOverlap) {
      pairs.add(pairKey(entry.id, overlap.with));
    }
  }
  return pairs;
}

/**
 * Two *indexable* pages claiming the same phrasing. Retired and non-indexable
 * entries are excluded: a redirect stub is allowed to share an intent with the
 * page it redirects to, which is exactly what makes it a redirect.
 *
 * A group whose every pair carries an `acknowledgedOverlap` reason is reported
 * as a warning rather than an error. That is what lets the registry be adopted
 * on a surface that already has duplication: pre-existing overlap can be
 * recorded with its reason and kept visible, while any *new* collision — the
 * thing this is here to prevent — still fails hard.
 */
function duplicateIntents(entries: DiscoveryEntry[]): DiscoveryFinding[] {
  const indexable = entries.filter(
    (entry) => entry.indexable && entry.status !== "retired",
  );
  const acknowledged = acknowledgedPairs(entries);

  const byIntent = new Map<string, DiscoveryEntry[]>();
  for (const entry of indexable) {
    const bucket = byIntent.get(normaliseIntent(entry.primaryIntent)) ?? [];
    bucket.push(entry);
    byIntent.set(normaliseIntent(entry.primaryIntent), bucket);
  }

  const findings: DiscoveryFinding[] = [];
  for (const [intent, group] of byIntent) {
    if (group.length < 2) continue;

    let everyPairAcknowledged = true;
    for (let i = 0; i < group.length && everyPairAcknowledged; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        if (!acknowledged.has(pairKey(group[i].id, group[j].id))) {
          everyPairAcknowledged = false;
          break;
        }
      }
    }

    const paths = group.map((entry) => entry.canonicalPath).join(", ");
    findings.push(
      everyPairAcknowledged
        ? {
            severity: "warning",
            code: "acknowledged-duplicate-intent",
            message: `Intent "${intent}" is shared by ${group.length} indexable pages (${paths}). The overlap is recorded with a reason — revisit whether both still need to exist.`,
            entries: group.map((entry) => entry.id),
          }
        : {
            severity: "error",
            code: "duplicate-primary-intent",
            message: `Intent "${intent}" is claimed by ${group.length} indexable pages (${paths}). One of them should own it; the others need a distinct intent, an alias, or a recorded acknowledgedOverlap reason.`,
            entries: group.map((entry) => entry.id),
          },
    );
  }
  return findings;
}

/**
 * An alias that another entry has claimed as its primary intent. This is the
 * cannibalisation case the registry is really for: a page quietly absorbing a
 * phrasing that already has an owner.
 */
function aliasCollisions(entries: DiscoveryEntry[]): DiscoveryFinding[] {
  const primaryOwners = new Map<string, DiscoveryEntry>();
  for (const entry of entries) {
    if (!entry.indexable || entry.status === "retired") continue;
    primaryOwners.set(normaliseIntent(entry.primaryIntent), entry);
  }

  const findings: DiscoveryFinding[] = [];
  for (const entry of entries) {
    for (const alias of entry.intentAliases) {
      const owner = primaryOwners.get(normaliseIntent(alias));
      if (owner && owner.id !== entry.id) {
        findings.push({
          severity: "error",
          code: "alias-claims-owned-intent",
          message: `${entry.id} lists "${alias}" as an alias, but ${owner.id} owns it as a primary intent (${owner.canonicalPath}).`,
          entries: [entry.id, owner.id],
        });
      }
    }
  }
  return findings;
}

/** A `relatedIntents` or `acknowledgedOverlap` reference to an id that is gone. */
function danglingReferences(entries: DiscoveryEntry[]): DiscoveryFinding[] {
  const ids = new Set(entries.map((entry) => entry.id));
  const findings: DiscoveryFinding[] = [];
  for (const entry of entries) {
    for (const related of entry.relatedIntents) {
      if (!ids.has(related)) {
        findings.push({
          severity: "error",
          code: "dangling-related-intent",
          message: `${entry.id} lists relatedIntents "${related}", which is not a registered id.`,
          entries: [entry.id],
        });
      }
    }
    for (const overlap of entry.acknowledgedOverlap) {
      if (!ids.has(overlap.with)) {
        findings.push({
          severity: "error",
          code: "dangling-acknowledged-overlap",
          message: `${entry.id} acknowledges overlap with "${overlap.with}", which is not a registered id.`,
          entries: [entry.id],
        });
      }
    }
    if (entry.relatedIntents.includes(entry.id)) {
      findings.push({
        severity: "error",
        code: "self-reference",
        message: `${entry.id} lists itself in relatedIntents.`,
        entries: [entry.id],
      });
    }
  }
  return findings;
}

/**
 * A rationale that only restates the intent is not a rationale. Caught by
 * containment rather than anything cleverer, which is enough to stop the
 * commonest filler ("page about X" for intent "X") without pretending to judge
 * prose quality.
 */
function weakUniqueValue(entries: DiscoveryEntry[]): DiscoveryFinding[] {
  return entries
    .filter((entry) => {
      const value = normaliseIntent(entry.uniqueValue);
      const intent = normaliseIntent(entry.primaryIntent);
      return value === intent || value === `page about ${intent}`;
    })
    .map((entry) => ({
      severity: "error" as const,
      code: "weak-unique-value",
      message: `${entry.id} restates its intent as its uniqueValue. Record what the page does that no other page does.`,
      entries: [entry.id],
    }));
}

/**
 * Words that appear in so many intents that sharing them means nothing. Kept
 * short on purpose — an over-eager stop list hides real collisions.
 */
const GENERIC_TOKENS = new Set([
  "rpg",
  "rpgs",
  "generator",
  "generators",
  "tool",
  "tools",
  "landing",
  "page",
  "free",
  "online",
  "random",
  "for",
  "and",
  "the",
  "a",
  "an",
  "of",
  "in",
  "my",
  "your",
  "do",
  "you",
  "how",
  "what",
  "is",
]);

/** Meaningful words across everything an entry claims. */
function significantTokens(entry: DiscoveryEntry): Set<string> {
  const tokens = new Set<string>();
  for (const intent of claimedIntents(entry)) {
    for (const token of intent.split(" ")) {
      if (token.length > 1 && !GENERIC_TOKENS.has(token)) tokens.add(token);
    }
  }
  return tokens;
}

/**
 * Words that are generic *within one cluster*.
 *
 * Every importer says "import"; every comparison says "vs". Those words are the
 * cluster's subject, so two pages sharing them have shown nothing. A token used
 * by three or more entries in a cluster is treated as its vocabulary rather
 * than as evidence of overlap — which keeps the check from firing on the shape
 * every healthy cluster has.
 */
function clusterGenericTokens(
  tokensById: Map<string, Set<string>>,
): Set<string> {
  const counts = new Map<string, number>();
  for (const tokens of tokensById.values()) {
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return new Set(
    [...counts].filter(([, count]) => count >= 3).map(([token]) => token),
  );
}

/** Two entries aimed at explicitly different readers are differentiated. */
function audiencesDiffer(a: DiscoveryEntry, b: DiscoveryEntry): boolean {
  return Boolean(a.audience && b.audience && a.audience !== b.audience);
}

/**
 * Pages that share a cluster, a user job, *and* vocabulary.
 *
 * All three conditions matter. Sharing a cluster and a job is normal — every
 * `/for` guide is `adopt-workflow`, every generator is `create` — and warning on
 * that alone buries the signal in pairs nobody needs to look at. What actually
 * indicates cannibalisation is two pages doing the same job for the same reader
 * while describing themselves with the same words, which is what this checks.
 *
 * An explicit, differing `audience` clears the pair: that is the field which
 * says "these serve different readers", and it is how the system and genre
 * guides justify existing alongside each other.
 */
function sameJobInCluster(entries: DiscoveryEntry[]): DiscoveryFinding[] {
  const acknowledged = acknowledgedPairs(entries);

  const findings: DiscoveryFinding[] = [];
  for (const [cluster, group] of getClusters(entries)) {
    const live = group.filter(
      (entry) => entry.indexable && entry.status !== "retired",
    );
    const tokens = new Map(
      live.map((entry) => [entry.id, significantTokens(entry)] as const),
    );
    const clusterVocabulary = clusterGenericTokens(tokens);

    for (let i = 0; i < live.length; i += 1) {
      for (let j = i + 1; j < live.length; j += 1) {
        const a = live[i];
        const b = live[j];
        if (a.userJob !== b.userJob) continue;
        if (audiencesDiffer(a, b)) continue;
        if (acknowledged.has(pairKey(a.id, b.id))) continue;

        const aTokens = tokens.get(a.id) as Set<string>;
        const shared = [...(tokens.get(b.id) as Set<string>)].filter(
          (token) => aTokens.has(token) && !clusterVocabulary.has(token),
        );
        if (shared.length === 0) continue;

        findings.push({
          severity: "warning",
          code: "same-job-same-vocabulary",
          message: `${a.canonicalPath} and ${b.canonicalPath} are both "${a.userJob}" in cluster "${cluster}" and share the term(s) ${shared
            .map((token) => `"${token}"`)
            .join(
              ", ",
            )}. Confirm they serve different readers, give one a distinct audience, or acknowledge the overlap with a reason.`,
          entries: [a.id, b.id],
        });
      }
    }
  }
  return findings;
}

/** Entries whose claimed phrasings overlap heavily without being in one cluster. */
function crossClusterEcho(entries: DiscoveryEntry[]): DiscoveryFinding[] {
  const live = entries.filter(
    (entry) => entry.indexable && entry.status !== "retired",
  );
  const acknowledged = acknowledgedPairs(entries);

  const findings: DiscoveryFinding[] = [];
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const a = live[i];
      const b = live[j];
      if (a.parentCluster && a.parentCluster === b.parentCluster) continue;
      if (acknowledged.has(pairKey(a.id, b.id))) continue;

      const aClaims = new Set(claimedIntents(a));
      const shared = claimedIntents(b).filter((intent) => aClaims.has(intent));
      if (shared.length === 0) continue;

      findings.push({
        severity: "warning",
        code: "shared-phrasing-across-clusters",
        message: `${a.canonicalPath} and ${b.canonicalPath} both claim "${shared[0]}" but sit in different clusters. One should own it.`,
        entries: [a.id, b.id],
      });
    }
  }
  return findings;
}

/**
 * Live discovery routes with no registry entry. The caller supplies the paths,
 * because only it knows which routes actually shipped — this module stays
 * free of route imports so it can run in a script, a test or the app.
 */
export function findUnregisteredPaths(
  livePaths: string[],
  entries: DiscoveryEntry[] = allEntries,
): DiscoveryFinding[] {
  const owned = new Set(entries.map((entry) => entry.canonicalPath));
  return livePaths
    .filter((path) => !owned.has(path))
    .map((path) => ({
      severity: "error" as const,
      code: "unregistered-discovery-page",
      message: `${path} is a live, indexable discovery page with no registry entry. Register its intent, user job and unique value.`,
      entries: [],
    }));
}

/** Runs every check that needs only the registry itself. */
export function auditDiscoveryRegistry(
  entries: DiscoveryEntry[] = allEntries,
): DiscoveryFinding[] {
  return [
    ...duplicateIds(entries),
    ...duplicatePaths(entries),
    ...duplicateIntents(entries),
    ...aliasCollisions(entries),
    ...danglingReferences(entries),
    ...weakUniqueValue(entries),
    ...sameJobInCluster(entries),
    ...crossClusterEcho(entries),
  ];
}

export const errorsOnly = (findings: DiscoveryFinding[]) =>
  findings.filter((finding) => finding.severity === "error");

export const warningsOnly = (findings: DiscoveryFinding[]) =>
  findings.filter((finding) => finding.severity === "warning");

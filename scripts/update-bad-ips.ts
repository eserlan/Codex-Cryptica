#!/usr/bin/env bun
/**
 * Auto-populate the Cloudflare `bad_ips` list from observed scan traffic.
 *
 * Pipeline: pull recent zone traffic from the Cloudflare GraphQL Analytics
 * API, flag IPs probing sensitive paths, optionally enrich via AbuseIPDB /
 * GreyNoise, aggregate fleets into /24 ranges, then merge into the account
 * IP list consumed by the "Block shady ips" WAF rule `(ip.src in $bad_ips)`.
 *
 * Safety: dry-run by default; manual list entries are never removed; auto
 * entries carry an expiry in their comment and are pruned once stale; new
 * entries per run and total list size are capped; verified bots and the
 * never-block CIDRs are always excluded.
 *
 * Usage:
 *   bun scripts/update-bad-ips.ts                      # dry-run (needs CF env)
 *   bun scripts/update-bad-ips.ts --file events.json   # dry-run, offline input
 *   bun scripts/update-bad-ips.ts --apply              # write to Cloudflare
 *   bun scripts/update-bad-ips.ts --days 7 --max-new 50
 *
 * Env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_BAD_IPS_TOKEN (Account Rule Lists Edit
 * + Zone Analytics Read), CLOUDFLARE_ZONE_ID. Optional: ABUSEIPDB_API_KEY,
 * GREYNOISE_API_KEY, DISCORD_WEBHOOK_URL (run summary), NEVER_BLOCK_CIDRS
 * (comma-separated CIDRs that must never be listed).
 */

export interface RawEvent {
  ip: string;
  path: string;
  status?: number;
  count?: number;
  asn?: string;
  verifiedBot?: boolean;
}

export interface Candidate {
  ip: string;
  asn?: string;
  probePaths: string[];
  probeHits: number;
  totalRequests: number;
  notFound: number;
}

export interface Enrichment {
  classification?: "malicious" | "noise" | "riot" | "benign" | "unknown";
  knownGood?: boolean;
  abuseConfidence?: number;
}

export interface ProposedEntry {
  ip: string;
  reason: string;
  sourceIps: string[];
}

export interface ListItem {
  ip: string;
  comment?: string;
}

const PROBE_PATTERNS: RegExp[] = [
  /^\/\.env(\.|$|\/)/i,
  /^\/\.git(\/|$)/i,
  /^\/\.aws(\/|$)/i,
  /^\/\.svn(\/|$)/i,
  /^\/wp-(login|admin|content|includes)/i,
  /^\/xmlrpc\.php/i,
  /^\/vendor\/phpunit/i,
  /^\/(phpmyadmin|pma|adminer)/i,
  /^\/actuator(\/|$)/i,
  /^\/(cgi-bin|\.well-known\/security)/i,
  /\/(config|credentials|secrets?)(\.|\/|$)/i,
];

export function isProbePath(path: string): boolean {
  const clean = path.split("?")[0];
  return PROBE_PATTERNS.some((re) => re.test(clean));
}

export function isValidIpv4(ip: string): boolean {
  const parts = ip.split(".");
  return (
    parts.length === 4 &&
    parts.every(
      (p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255,
    )
  );
}

function ipv4ToInt(ip: string): number | null {
  if (!isValidIpv4(ip)) return null;
  return ip.split(".").reduce((acc, p) => acc * 256 + Number(p), 0);
}

// fallow-ignore-next-line complexity -- CIDR validation branches are unit-tested in update-bad-ips.test.ts.
export function cidrContainsIp(cidr: string, ip: string): boolean {
  const target = ipv4ToInt(ip);
  if (target === null) return false;
  const [base, prefixRaw] = cidr.split("/");
  const baseInt = ipv4ToInt(base);
  if (baseInt === null) return false;
  const prefix = prefixRaw === undefined ? 32 : Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (baseInt & mask) === (target & mask);
}

export function subnet24(ip: string): string {
  const parts = ip.split(".");
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}

export interface FindOptions {
  minProbePaths?: number;
  minNotFound?: number;
  neverBlock?: string[];
}

// fallow-ignore-next-line complexity -- detection thresholds and exclusions are unit-tested in update-bad-ips.test.ts.
export function findCandidates(
  events: RawEvent[],
  options: FindOptions = {},
): Candidate[] {
  const minProbePaths = options.minProbePaths ?? 3;
  const minNotFound = options.minNotFound ?? 50;
  const neverBlock = options.neverBlock ?? [];
  const byIp = new Map<string, Candidate>();

  for (const event of events) {
    if (!isValidIpv4(event.ip) || event.verifiedBot) continue;
    if (neverBlock.some((cidr) => cidrContainsIp(cidr, event.ip))) continue;
    const count = event.count ?? 1;
    let candidate = byIp.get(event.ip);
    if (!candidate) {
      candidate = {
        ip: event.ip,
        asn: event.asn,
        probePaths: [],
        probeHits: 0,
        totalRequests: 0,
        notFound: 0,
      };
      byIp.set(event.ip, candidate);
    }
    if (event.asn && !candidate.asn) candidate.asn = event.asn;
    candidate.totalRequests += count;
    if (event.status === 404) candidate.notFound += count;
    if (isProbePath(event.path)) {
      candidate.probeHits += count;
      const clean = event.path.split("?")[0];
      if (!candidate.probePaths.includes(clean))
        candidate.probePaths.push(clean);
    }
  }

  return [...byIp.values()]
    .filter(
      (c) =>
        c.probePaths.length >= minProbePaths ||
        (c.probeHits >= 1 && c.notFound >= minNotFound),
    )
    .sort(
      (a, b) =>
        b.probePaths.length - a.probePaths.length ||
        b.totalRequests - a.totalRequests,
    );
}

export function filterKnownGood(
  candidates: Candidate[],
  enrichment: Map<string, Enrichment>,
): Candidate[] {
  return candidates.filter((c) => {
    const info = enrichment.get(c.ip);
    if (!info) return true;
    return !(
      info.knownGood ||
      info.classification === "riot" ||
      info.classification === "benign"
    );
  });
}

// fallow-ignore-next-line complexity -- range aggregation and ASN suggestion thresholds are unit-tested in update-bad-ips.test.ts.
export function aggregateRanges(
  candidates: Candidate[],
  options: { rangeThreshold?: number; asnThreshold?: number } = {},
): {
  entries: ProposedEntry[];
  suggestedAsns: { asn: string; ips: string[] }[];
} {
  const rangeThreshold = options.rangeThreshold ?? 3;
  const asnThreshold = options.asnThreshold ?? 5;
  const bySubnet = new Map<string, Candidate[]>();
  const byAsn = new Map<string, string[]>();

  for (const candidate of candidates) {
    const subnet = subnet24(candidate.ip);
    bySubnet.set(subnet, [...(bySubnet.get(subnet) ?? []), candidate]);
    if (candidate.asn) {
      byAsn.set(candidate.asn, [
        ...(byAsn.get(candidate.asn) ?? []),
        candidate.ip,
      ]);
    }
  }

  const ranged = new Set<string>();
  const entries: ProposedEntry[] = [];
  for (const [subnet, members] of bySubnet) {
    if (members.length >= rangeThreshold) {
      members.forEach((m) => ranged.add(m.ip));
      entries.push({
        ip: subnet,
        reason: "probe-scan-range",
        sourceIps: members.map((m) => m.ip).sort(),
      });
    }
  }
  for (const candidate of candidates) {
    if (!ranged.has(candidate.ip)) {
      entries.push({
        ip: candidate.ip,
        reason: "probe-scan",
        sourceIps: [candidate.ip],
      });
    }
  }

  const suggestedAsns = [...byAsn.entries()]
    .filter(([, ips]) => new Set(ips).size >= asnThreshold)
    .map(([asn, ips]) => ({ asn, ips: [...new Set(ips)].sort() }))
    .sort((a, b) => b.ips.length - a.ips.length);

  return { entries, suggestedAsns };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function expiryFromComment(comment?: string): string | null {
  const match = comment?.match(/expires=(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export interface MergeOptions {
  now?: Date;
  expiryDays?: number;
  maxNew?: number;
  maxTotal?: number;
}

// fallow-ignore-next-line complexity -- manual-entry preservation, expiry pruning and caps are unit-tested in update-bad-ips.test.ts.
export function mergeListItems(
  existing: ListItem[],
  additions: ProposedEntry[],
  options: MergeOptions = {},
): {
  items: ListItem[];
  added: ProposedEntry[];
  removedExpired: ListItem[];
  removedCovered: ListItem[];
  skippedExisting: ProposedEntry[];
} {
  const now = options.now ?? new Date();
  const today = formatDate(now);
  const expiry = formatDate(
    new Date(now.getTime() + (options.expiryDays ?? 60) * 86_400_000),
  );
  const maxNew = options.maxNew ?? 100;
  const maxTotal = options.maxTotal ?? 10_000;

  const removedExpired: ListItem[] = [];
  const kept: ListItem[] = [];
  for (const item of existing) {
    const expires = expiryFromComment(item.comment);
    if (expires && expires < today) removedExpired.push(item);
    else kept.push(item);
  }

  const newRanges = additions.filter((a) => a.ip.endsWith("/24"));
  const removedCovered: ListItem[] = [];
  const uncovered = kept.filter((item) => {
    const isAuto = item.comment?.startsWith("auto:");
    const covered =
      isAuto &&
      !item.ip.includes("/") &&
      newRanges.some((range) => cidrContainsIp(range.ip, item.ip));
    if (covered) removedCovered.push(item);
    return !covered;
  });

  const byIp = new Map(uncovered.map((item) => [item.ip, item]));
  const added: ProposedEntry[] = [];
  const skippedExisting: ProposedEntry[] = [];

  for (const entry of additions) {
    const prior = byIp.get(entry.ip);
    if (prior) {
      skippedExisting.push(entry);
      if (prior.comment?.startsWith("auto:")) {
        prior.comment = `auto:${entry.reason}; expires=${expiry}`;
      }
      continue;
    }
    if (added.length >= maxNew || byIp.size >= maxTotal) continue;
    const item: ListItem = {
      ip: entry.ip,
      comment: `auto:${entry.reason}; expires=${expiry}`,
    };
    byIp.set(entry.ip, item);
    added.push(entry);
  }

  return {
    items: [...byIp.values()],
    added,
    removedExpired,
    removedCovered,
    skippedExisting,
  };
}

// --- Cloudflare API -------------------------------------------------------

const CF_API = "https://api.cloudflare.com/client/v4";

// fallow-ignore-next-line complexity -- thin Cloudflare API wrapper; decision logic is extracted and unit-tested.
async function cfFetch(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    errors?: unknown;
    result?: unknown;
  } | null;
  if (!res.ok || !body?.success) {
    throw new Error(
      `Cloudflare API ${path} failed (${res.status}): ${JSON.stringify(body?.errors ?? body)}`,
    );
  }
  return body.result;
}

export interface TrafficGroup {
  count: number;
  dimensions: {
    clientIP: string;
    clientRequestPath: string;
    clientAsn?: string | number;
    edgeResponseStatus?: number;
    botManagementDecision?: string;
    verifiedBotCategory?: string;
  };
}

export function mapTrafficGroups(groups: TrafficGroup[]): RawEvent[] {
  return groups.map((g) => ({
    ip: g.dimensions.clientIP,
    path: g.dimensions.clientRequestPath,
    status: g.dimensions.edgeResponseStatus,
    count: g.count,
    asn:
      g.dimensions.clientAsn != null
        ? String(g.dimensions.clientAsn)
        : undefined,
    verifiedBot:
      g.dimensions.botManagementDecision === "verified_bot" ||
      Boolean(g.dimensions.verifiedBotCategory),
  }));
}

// Optional dimensions are plan-gated (clientAsn and botManagementDecision
// need a paid Bot Management plan; verifiedBotCategory is the free-plan
// signal). Try richest first and degrade on field-access errors only.
const TRAFFIC_FIELD_VARIANTS: string[][] = [
  ["clientAsn", "botManagementDecision"],
  ["botManagementDecision"],
  ["verifiedBotCategory"],
  [],
];

// fallow-ignore-next-line complexity -- plan-field degradation loop; response mapping is extracted into mapTrafficGroups and unit-tested.
export async function fetchTrafficEvents(
  token: string,
  zoneId: string,
  days: number,
): Promise<RawEvent[]> {
  let lastError: unknown;
  for (const [index, extraFields] of TRAFFIC_FIELD_VARIANTS.entries()) {
    try {
      return await queryTrafficGroups(token, zoneId, days, extraFields);
    } catch (err) {
      lastError = err;
      const message = String(err).toLowerCase();
      const isFieldAccessError =
        message.includes("field") ||
        message.includes("does not have access") ||
        message.includes("authz");
      if (!isFieldAccessError || index === TRAFFIC_FIELD_VARIANTS.length - 1) {
        throw err;
      }
      console.warn(
        `Traffic fields [${extraFields.join(", ")}] unavailable on this plan; retrying with fewer fields.`,
      );
    }
  }
  throw lastError;
}

// fallow-ignore-next-line complexity -- GraphQL query construction and response mapping; detection logic is extracted and unit-tested.
async function queryTrafficGroups(
  token: string,
  zoneId: string,
  days: number,
  extraFields: string[],
): Promise<RawEvent[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const query = `query {
    viewer { zones(filter: { zoneTag: "${zoneId}" }) {
      httpRequestsAdaptiveGroups(
        limit: 10000
        filter: { datetime_geq: "${since}" }
        orderBy: [count_DESC]
      ) {
        count
        dimensions {
          clientIP
          clientRequestPath
          edgeResponseStatus
          ${extraFields.join("\n          ")}
        }
      }
    } }
  }`;
  const res = await fetch(`${CF_API}/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Cloudflare GraphQL failed (${res.status})`);
  const body = (await res.json()) as {
    data?: {
      viewer?: {
        zones?: { httpRequestsAdaptiveGroups?: TrafficGroup[] }[];
      };
    };
    errors?: unknown;
  };
  if (body.errors) {
    throw new Error(
      `Cloudflare GraphQL errors: ${JSON.stringify(body.errors)}`,
    );
  }
  return mapTrafficGroups(
    body.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? [],
  );
}

// fallow-ignore-next-line complexity -- paginated list fetch wrapper; merge logic is extracted and unit-tested.
export async function fetchListItems(
  token: string,
  accountId: string,
  listName: string,
): Promise<{ listId: string; items: ListItem[] }> {
  const lists = (await cfFetch(
    token,
    `/accounts/${accountId}/rules/lists?name=${encodeURIComponent(listName)}`,
  )) as { id: string; name: string }[];
  const list = lists.find((l) => l.name === listName);
  if (!list) {
    throw new Error(
      `No Cloudflare list named "${listName}" on this account. Create it first (Manage account -> Configurations -> Lists).`,
    );
  }
  const items: ListItem[] = [];
  let page = 1;
  for (;;) {
    const result = (await cfFetch(
      token,
      `/accounts/${accountId}/rules/lists/${list.id}/items?page=${page}&per_page=1000`,
    )) as { ip?: string; comment?: string }[];
    for (const item of result) {
      if (item.ip) items.push({ ip: item.ip, comment: item.comment });
    }
    if (result.length < 1000) break;
    page += 1;
  }
  return { listId: list.id, items };
}

// fallow-ignore-next-line complexity -- bounded poll loop; terminal-state handling is unit-tested in update-bad-ips.test.ts.
export async function waitForBulkOperation(
  token: string,
  accountId: string,
  operationId: string,
  timeoutMs = 60_000,
  pollMs = 2_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = (await cfFetch(
      token,
      `/accounts/${accountId}/rules/lists/bulk-operations/${operationId}`,
    )) as { status?: string; error?: string };
    if (result.status === "completed") return;
    if (result.status === "failed") {
      throw new Error(
        `Cloudflare bulk operation ${operationId} failed: ${result.error ?? "unknown error"}`,
      );
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `Cloudflare bulk operation ${operationId} did not complete within ${timeoutMs}ms (last status: ${result.status ?? "unknown"}).`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

export async function replaceListItems(
  token: string,
  accountId: string,
  listId: string,
  items: ListItem[],
): Promise<void> {
  // List-item replacement is asynchronous: HTTP acceptance only means the
  // bulk operation was queued, so poll it to a terminal state.
  const result = (await cfFetch(
    token,
    `/accounts/${accountId}/rules/lists/${listId}/items`,
    {
      method: "PUT",
      body: JSON.stringify(items),
    },
  )) as { operation_id?: string };
  if (result.operation_id) {
    await waitForBulkOperation(token, accountId, result.operation_id);
  }
}

// --- Optional enrichment ----------------------------------------------------

// fallow-ignore-next-line complexity -- advisory GreyNoise/AbuseIPDB lookups; keep/skip decision is extracted into filterKnownGood and unit-tested.
export async function fetchEnrichment(
  ips: string[],
): Promise<Map<string, Enrichment>> {
  const result = new Map<string, Enrichment>();
  const abuseKey = process.env.ABUSEIPDB_API_KEY;
  const greyKey = process.env.GREYNOISE_API_KEY;
  if (!abuseKey && !greyKey) return result;

  for (const ip of ips.slice(0, 50)) {
    const info: Enrichment = {};
    try {
      if (greyKey) {
        const res = await fetch(`https://api.greynoise.io/v3/community/${ip}`, {
          headers: { key: greyKey },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            classification?: string;
            riot?: boolean;
          };
          if (data.riot) info.classification = "riot";
          else if (data.classification === "malicious")
            info.classification = "malicious";
          else if (data.classification === "benign")
            info.classification = "benign";
        }
      }
      if (abuseKey && info.classification !== "riot") {
        const res = await fetch(
          `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`,
          { headers: { Key: abuseKey, Accept: "application/json" } },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            data?: { abuseConfidenceScore?: number; isWhitelisted?: boolean };
          };
          info.abuseConfidence = data.data?.abuseConfidenceScore;
          if (data.data?.isWhitelisted) info.knownGood = true;
        }
      }
    } catch {
      // Enrichment is advisory only; local probe evidence still decides.
    }
    if (Object.keys(info).length > 0) result.set(ip, info);
  }
  return result;
}

// --- CLI --------------------------------------------------------------------

interface CliOptions {
  apply: boolean;
  file?: string;
  days: number;
  maxNew: number;
}

// fallow-ignore-next-line complexity -- flat CLI flag parsing; behaviour is exercised via the script dry-run paths.
export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { apply: false, days: 1, maxNew: 100 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--apply") options.apply = true;
    else if (argv[i] === "--dry-run") options.apply = false;
    else if (argv[i] === "--file") options.file = argv[++i];
    else if (argv[i] === "--days") options.days = Number(argv[++i]) || 1;
    else if (argv[i] === "--max-new") options.maxNew = Number(argv[++i]) || 100;
  }
  return options;
}

// fallow-ignore-next-line complexity -- CLI orchestration only; every decision step is an extracted, unit-tested helper.
export async function run(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const neverBlock = (process.env.NEVER_BLOCK_CIDRS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let events: RawEvent[];
  if (options.file) {
    const { readFileSync } = await import("node:fs");
    events = JSON.parse(readFileSync(options.file, "utf-8")) as RawEvent[];
  } else {
    const token = process.env.CLOUDFLARE_BAD_IPS_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    if (!token || !zoneId) {
      console.error(
        "Missing CLOUDFLARE_BAD_IPS_TOKEN / CLOUDFLARE_ZONE_ID. See docs/cloudflare-bad-ip-automation.md, or pass --file events.json for an offline dry-run.",
      );
      process.exit(2);
    }
    events = await fetchTrafficEvents(token, zoneId, options.days);
  }
  console.log(`Fetched ${events.length} grouped traffic rows.`);

  const candidates = findCandidates(events, { neverBlock });
  const enrichment = await fetchEnrichment(candidates.map((c) => c.ip));
  const vetted = filterKnownGood(candidates, enrichment);
  const dropped = candidates.length - vetted.length;
  if (dropped > 0) console.log(`Dropped ${dropped} known-good actor(s).`);

  const { entries, suggestedAsns } = aggregateRanges(vetted);
  for (const s of suggestedAsns) {
    console.log(
      `Suggestion: ${s.ips.length} scanners from AS${s.asn}. Consider adding (ip.geoip.asnum eq ${s.asn}) to the WAF rule.`,
    );
  }
  if (entries.length === 0) console.log("No new bad actors found.");

  const token = process.env.CLOUDFLARE_BAD_IPS_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    if (entries.length > 0) {
      console.log("Candidates (no Cloudflare list credentials, report only):");
      for (const e of entries) console.log(`  ${e.ip}  (${e.reason})`);
    }
    return;
  }
  // Even with no new entries, fall through: merging with an empty addition
  // set is what prunes expired auto entries on quiet days.

  const { listId, items: existing } = await fetchListItems(
    token,
    accountId,
    "bad_ips",
  );
  const merged = mergeListItems(existing, entries, { maxNew: options.maxNew });
  console.log(
    `List bad_ips: ${existing.length} -> ${merged.items.length} items; ` +
      `+${merged.added.length} added, ${merged.removedExpired.length} expired, ` +
      `${merged.removedCovered.length} covered, ${merged.skippedExisting.length} already present.`,
  );
  for (const e of merged.added) console.log(`  + ${e.ip} (${e.reason})`);

  if (!options.apply) {
    console.log("Dry-run only. Re-run with --apply to write the list.");
    return;
  }
  // The Lists API replaces all items, so re-read immediately before writing
  // and re-merge: a manual edit made since the first read must not be lost.
  const fresh = await fetchListItems(token, accountId, "bad_ips");
  const finalItems =
    JSON.stringify(fresh.items) === JSON.stringify(existing)
      ? merged.items
      : mergeListItems(fresh.items, entries, { maxNew: options.maxNew }).items;
  await replaceListItems(token, accountId, listId, finalItems);
  console.log("Updated Cloudflare list bad_ips.");

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (webhook && merged.added.length > 0) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content:
          `bad_ips: +${merged.added.length} (` +
          merged.added
            .map((e) => e.ip)
            .slice(0, 20)
            .join(", ") +
          `), ${merged.removedExpired.length} expired.`,
      }),
    }).catch(() => undefined);
  }
}

if (import.meta.main) {
  run().catch((err) => {
    console.error("update-bad-ips failed:", err);
    process.exit(1);
  });
}

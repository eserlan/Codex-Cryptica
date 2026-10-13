/**
 * #4063 — throwaway, data-driven A/B experiment for Oracle retrieval.
 *
 * Run: bunx vitest run --config packages/ai-engine/vitest.config.ts
 *        packages/ai-engine/src/oracle-rag-ab.test.ts
 *
 * A: real SearchEngine -> real ContextRetrievalService, unmodified.
 * B: same engines/10k context budget; only an experimental lexical
 *    multi-entity search planner in the search adapter.
 *
 * Fixture data are SYNTHETIC. This is not a production-Vault evaluation
 * and it does not assess model-generated answers.
 */
import { describe, expect, it } from "vitest";
import { SearchEngine } from "../../search-engine/src/index";
import { DefaultContextRetrievalService } from "./context-retrieval.service";

type Fixture = {
  id: string;
  title: string;
  type: string;
  content: string;
  aliases?: string[];
  lore?: string;
  visibility?: "visible" | "hidden";
  connections?: { target: string; label: string }[];
};
type Case = {
  id: string;
  query: string;
  required: string[];
  focus?: string;
  guest?: boolean;
  forbidden?: string[];
  kind: "direct" | "relationship" | "concept" | "followup" | "permission" | "negative";
};

const repeat = (text: string, times: number) => Array(times).fill(text).join(" ");
const records: Fixture[] = [
  { id: "elara", title: "Elara Voss", type: "character", aliases: ["Grand Archmage"],
    content: "Elara Voss directs the Violet Spire. She suspects the Black Tower conceals an ancient gateway and trusts Captain Maren.", connections: [{ target: "spire", label: "directs" }] },
  { id: "elira", title: "Elira Zöldmező", type: "character",
    content: "Elira Zöldmező is an herbalist in Ashford. She trades willow bark with the river merchants." },
  { id: "tower", title: "Black Tower", type: "location",
    content: "The Black Tower shelters the Moon Gate. It was sealed on the winter solstice after the Ember Crown vanished.",
    connections: [{ target: "crown", label: "once housed" }] },
  { id: "spire", title: "Violet Spire", type: "location",
    content: "The Violet Spire is Elara's observatory, with a sealed astronomical archive underneath." },
  { id: "academy", title: "Royal Academy", type: "faction",
    content: "The Royal Academy is led by Chancellor Varis. Its scholars forbid entry to the Black Tower after the survey." },
  { id: "ashford", title: "Ashford", type: "location",
    content: "Ashford lies on the Thalen River. The cobbled north road leads to the Eastern Gate." },
  { id: "crown", title: "Ember Crown", type: "item",
    content: "The Ember Crown disappeared from the Black Tower during the eclipse. A glowing feather was recovered." },
  { id: "glassmaker", title: "Sera Halden", aliases: ["The Glassmaker"], type: "character",
    content: "Sera Halden supplied violet lenses to the Royal Academy in exchange for old maps." },
  { id: "gate", title: "Eastern Gate", type: "location",
    content: "The Eastern Gate controls the north road to Ashford. Captain Maren holds its keys." },
  { id: "wardenlog", title: "Warden's Log", type: "note",
    content: "The Warden's Log says the Black Tower rang a bell at midnight even though its doors were sealed." },
  { id: "key", title: "Obsidian Key", type: "item",
    content: "The Obsidian Key is hidden beneath the third floorboard of the abandoned mill." },
  { id: "protocol", title: "Cobalt Protocol", type: "note",
    content: "The Cobalt Protocol requires three lanterns to signal a safe approach to the harbour." },
  { id: "captain", title: "Captain Maren", aliases: ["Watch Captain"], type: "character",
    content: "Captain Maren survived the river ambush and was promoted to command the Eastern Gate." },
  { id: "shadow", title: "Shadow Rite", type: "note", visibility: "hidden",
    content: "GM SECRET: The Shadow Rite will open the gateway beneath the Black Tower." },
  { id: "wardenA", title: "Warden Holt", type: "character", aliases: ["The Warden"],
    content: "Warden Holt patrols the northern ridge." },
  { id: "wardenB", title: "Warden Nell", type: "character", aliases: ["The Warden"],
    content: "Warden Nell guards the river docks." },
  ...Array.from({ length: 14 }, (_, i): Fixture => ({
    id: `archive${i}`,
    title: `Archive Fragment ${i + 1}`,
    type: "note",
    content: repeat(
      i % 2 === 0
        ? "An old scroll catalogues the Black Tower alongside scores of unverified stories and distant histories."
        : "The academy's travelling scribes recorded rumours about Elara Voss, the tower, and the northern border.",
      18
    ) + ` A different account is recorded in fragment ${i + 1}.`,
  })),
];

const cases: Case[] = [
  { id: "01", kind: "direct", query: "Tell me about Elara Voss", required: ["elara"] },
  { id: "02", kind: "direct", query: "Who is Elira Zöldmező?", required: ["elira"] },
  { id: "03", kind: "direct", query: "Describe the Black Tower", required: ["tower"] },
  { id: "04", kind: "direct", query: "Tell me about the Violet Spire", required: ["spire"] },
  { id: "05", kind: "direct", query: "What is Ashford?", required: ["ashford"] },
  { id: "06", kind: "direct", query: "What do we know about the Glassmaker?", required: ["glassmaker"] },
  { id: "07", kind: "direct", query: "Who leads the Royal Academy?", required: ["academy"] },
  { id: "08", kind: "direct", query: "Where is the Eastern Gate?", required: ["gate"] },
  { id: "09", kind: "relationship", query: "What does Elara Voss know about the Black Tower?", required: ["elara", "tower"] },
  { id: "10", kind: "relationship", query: "How is Elara Voss connected to the Violet Spire?", required: ["elara", "spire"] },
  { id: "11", kind: "relationship", query: "What does the Royal Academy say about the Black Tower?", required: ["academy", "tower"] },
  { id: "12", kind: "relationship", query: "What connects Elira Zöldmező to Ashford?", required: ["elira", "ashford"] },
  { id: "13", kind: "relationship", query: "What happened to the Ember Crown at the Black Tower?", required: ["crown", "tower"] },
  { id: "14", kind: "relationship", query: "Did the Glassmaker sell to the Royal Academy?", required: ["glassmaker", "academy"] },
  { id: "15", kind: "relationship", query: "Which road links Ashford to the Eastern Gate?", required: ["ashford", "gate"] },
  { id: "16", kind: "relationship", query: "Why does the Warden's Log mention the Black Tower?", required: ["wardenlog", "tower"] },
  { id: "17", kind: "concept", query: "Where was the Obsidian Key hidden?", required: ["key"] },
  { id: "18", kind: "followup", query: "Who are her allies?", focus: "elara", required: ["elara"] },
  { id: "19", kind: "permission", query: "Does Elara Voss know the Shadow Rite?", guest: true, required: ["elara"], forbidden: ["shadow"] },
  { id: "20", kind: "negative", query: "Tell me about the quantum tomato whale engine", required: [] },
];

/** Only the search adapter differs. No model, embeddings, database, or prompt changes. */
function namedCandidates(query: string, guest: boolean): Fixture[] {
  const lower = query.toLocaleLowerCase();
  const named = records.filter((r) => {
    if (guest && r.visibility === "hidden") return false;
    return [r.title, ...(r.aliases || [])].some((name) => {
      if (name.length < 3) return false;
      const escaped = name.toLocaleLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u").test(lower);
    });
  });
  // Do not pin a non-unique alias. The index still handles its normal query.
  return named.filter((r) => {
    const matchingAliases = (r.aliases || []).filter((a) => lower.includes(a.toLocaleLowerCase()));
    return !matchingAliases.some((a) =>
      records.filter((other) =>
        other.visibility !== (guest ? "hidden" : "__none__") &&
        [other.title, ...(other.aliases || [])].some((name) => name.toLocaleLowerCase() === a.toLocaleLowerCase())
      ).length > 1
    );
  }).sort((a, b) => b.title.length - a.title.length);
}

type Result = { id: string; score: number; [key: string]: unknown };
async function evaluate(
  engine: SearchEngine,
  c: Case,
  arm: "baseline" | "planner",
) {
  let searchCalls = 0;
  const search = async (query: string, opts?: { limit?: number; includeDrafts?: boolean }): Promise<Result[]> => {
    if (arm === "baseline" || query.startsWith("art style")) {
      searchCalls++;
      return engine.search(query, opts) as Promise<Result[]>;
    }

    // Original query remains a contender; pinned named candidates are placed
    // first for multi-entity questions, then normal FlexSearch hits follow.
    const candidates = namedCandidates(query, Boolean(c.guest));
    if (candidates.length < 2) {
      searchCalls++;
      return engine.search(query, opts) as Promise<Result[]>;
    }
    const hits: Result[] = [];
    const seen = new Set<string>();
    const push = (h: Result) => {
      if (!seen.has(h.id)) { seen.add(h.id); hits.push(h); }
    };
    for (const ent of candidates.slice(0, 4)) {
      // Exact title lookup with the existing index, not gold fixture IDs.
      searchCalls++;
      const found = await engine.search(ent.title, { ...opts, limit: 8 });
      if (found.some((h) => h.id === ent.id)) {
        push({ id: ent.id, score: 1, matchType: "title" });
      }
    }
    searchCalls++;
    for (const h of await engine.search(query, { ...opts, limit: 8 })) push(h);
    return hits.slice(0, opts?.limit || 8);
  };

  const vault: any = {
    activeVaultId: "rag-ab-synthetic",
    entities: Object.fromEntries(records.map((r) => [r.id, r])),
    allEntities: records,
    inboundConnections: {},
    selectedEntityId: null,
    isGuest: Boolean(c.guest),
    defaultVisibility: "visible",
  };
  const service = new DefaultContextRetrievalService({ search } as any);
  const start = performance.now();
  const retrieved = await service.retrieveContext(c.query, new Set(), vault, c.focus);
  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  const found = c.required.filter((id) => retrieved.sourceIds.includes(id));
  const missing = c.required.filter((id) => !retrieved.sourceIds.includes(id));
  const forbidden = (c.forbidden || []).filter((id) =>
    retrieved.sourceIds.includes(id) || retrieved.content.includes(records.find((r) => r.id === id)!.title)
  );
  const missingFacts = c.required.filter((id) => {
    const fact = records.find((r) => r.id === id)!.content;
    // Did context preserve at least the distinctive end of the source text?
    return !retrieved.content.includes(fact);
  });
  return {
    id: c.id, kind: c.kind, query: c.query,
    primaryEntityId: retrieved.primaryEntityId || null,
    sourceIds: retrieved.sourceIds,
    found, missing, missingFacts, forbidden,
    grounded: missing.length === 0 && missingFacts.length === 0 && forbidden.length === 0,
    contextChars: retrieved.content.length, searchCalls, durationMs,
  };
}

function quantile(nums: number[], percentile: number) {
  const sorted = nums.toSorted((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentile) - 1)];
}

describe("Oracle RAG query planning A/B spike (#4063)", () => {
  it("measures 20 synthetic scenarios with real FlexSearch and context retrieval", async () => {
    expect(cases).toHaveLength(20);
    const engine = new SearchEngine();
    // Search logging is noisy and obscures the actual A/B comparison.
    (engine as any).log = () => {};
    await engine.addBatch(records.map((r) => ({
      id: r.id, title: r.title, aliases: (r.aliases || []).join(" "),
      keywords: r.lore || "", content: r.content, type: r.type,
      status: "published", path: `${r.id}.md`,
    })) as any);
    expect(engine.docCount).toBe(records.length);

    const a = [], b = [];
    for (const testCase of cases) {
      a.push(await evaluate(engine, testCase, "baseline"));
      b.push(await evaluate(engine, testCase, "planner"));
    }
    const sum = (items: typeof a) => ({
      allRequiredSources: items.filter((r) => r.missing.length === 0).length,
      fullyGrounded: items.filter((r) => r.grounded).length,
      totalSourceMatches: items.reduce((n, r) => n + r.found.length, 0),
      totalRequiredSources: cases.reduce((n, c) => n + c.required.length, 0),
      irrelevantSourceCount: items.reduce((n, r, i) =>
        n + r.sourceIds.filter((id) => !cases[i].required.includes(id)).length, 0),
      medianLatencyMs: quantile(items.map((r) => r.durationMs), 0.5),
      p95LatencyMs: quantile(items.map((r) => r.durationMs), 0.95),
      searchCalls: items.reduce((n, r) => n + r.searchCalls, 0),
      contextChars: items.reduce((n, r) => n + r.contextChars, 0),
    });
    const baseline = sum(a), planner = sum(b);
    const details = cases.map((c, i) => ({
      id: c.id, kind: c.kind, query: c.query,
      baselineGrounded: a[i].grounded, plannerGrounded: b[i].grounded,
      baselineMissing: a[i].missing, plannerMissing: b[i].missing,
      baselineMissingFacts: a[i].missingFacts, plannerMissingFacts: b[i].missingFacts,
      baselinePrimary: a[i].primaryEntityId, plannerPrimary: b[i].primaryEntityId,
      baselineSources: a[i].sourceIds, plannerSources: b[i].sourceIds,
      baselineMs: a[i].durationMs, plannerMs: b[i].durationMs,
    }));
    const gained = details.filter((d) => !d.baselineGrounded && d.plannerGrounded).map((d) => d.id);
    const regressed = details.filter((d) => d.baselineGrounded && !d.plannerGrounded).map((d) => d.id);
    const report = {
      note: "Synthetic fixture retrieval-only A/B. No live Vault, human answer review, or LLM accuracy claim.",
      baseline, planner, gained, regressed,
      netGain: planner.fullyGrounded - baseline.fullyGrounded,
      meetsProvisionalGate: planner.fullyGrounded - baseline.fullyGrounded >= 3 && regressed.length === 0,
      details,
    };
    console.info("ORACLE_RAG_AB_REPORT=" + JSON.stringify(report));
    expect(b.find((x) => x.id === "19")!.forbidden).toEqual([]);
    expect(a.find((x) => x.id === "19")!.forbidden).toEqual([]);
    expect(a.every((x) => x.contextChars <= 10500)).toBe(true);
    expect(b.every((x) => x.contextChars <= 10500)).toBe(true);
  });
});

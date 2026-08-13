/// <reference lib="webworker" />
import { aiClientManager, RelayedSessionToken } from "@codex/ai-engine";
import type { CachedToken } from "@codex/ai-engine";
import type { Proposal } from "@codex/proposer";
import { systemClock } from "$lib/utils/runtime-deps";

// This worker has its own isolated aiClientManager instance (Workers don't
// share module state with the main thread) and no DOM, so it can't solve a
// Turnstile challenge itself. The main thread's real session manager relays
// its token here via a "SESSION_TOKEN" message — see session-bootstrap.ts
// and ProposerBridge.setSessionToken().
const sessionToken = new RelayedSessionToken();
aiClientManager.setSessionManager(sessionToken);

function normalizeTargetId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// The rules, JSON schema, and output contract never change between requests
// — only the Source Entity content and target list do — so this is the
// system instruction, not part of the per-request user message. This also
// keeps the request payload's only per-request content the actual data to
// analyze, not several paragraphs of restated instructions around it.
const SYSTEM_INSTRUCTION = `You are a lore expert assisting a writer.
Analyze the given "Source Entity" content and the list of "Available Target Entities".
Identify any POTENTIAL HIDDEN CONNECTIONS between the Source Entity and any Target Entity based on the semantic context.

Criteria for a connection:
1. The Source Entity mentions the Target Entity by name or description.
2. The Source Entity implies a relationship (e.g., location, faction member, rival, family) with the Target.
3. Only suggest connections that are NOT explicitly stated as WikiLinks (assumed).
4. Assign a confidence score (0.0 to 1.0). High confidence means explicit mention; Low means thematic link.
5. IMPORTANT: Output a MAXIMUM of ONE connection per Target Entity. Only provide the single most relevant or strongest connection if multiple exist.
6. CRITICAL: You MUST ONLY use "targetId" values that exactly match one of the IDs given in that request's "Available Target Entities" list. Never invent a target — this task only links entities that already exist, it never names anything new, so there is no name to avoid reusing.

Output a JSON object with this schema:
{
  "connections": [
    {
      "targetId": "string (ID from list)",
      "type": "string (e.g. 'related', 'ally', 'rival', 'located_in')",
      "reason": "string (short explanation)",
      "context": "string (snippet from source text)",
      "confidence": number
    }
  ]
}

Only return the JSON. If no connections are found, return { "connections": [] }.`;

// The response is a JSON object with a "connections" array, not a bare
// top-level array — some providers' structured-output modes (OpenAI's
// json_schema mode included) require the schema root to be an object, so a
// bare-array schema/response gets rejected or refused. This is oracle-proxy's
// own plain-JSON-Schema shape (schema-validation.ts), not the Google SDK's
// `Schema`/`SchemaType` shape, hence the `any` below.
const CONNECTIONS_RESPONSE_SCHEMA: any = {
  type: "object",
  required: ["connections"],
  properties: {
    connections: {
      type: "array",
      items: {
        type: "object",
        required: ["targetId", "type", "reason", "context", "confidence"],
        properties: {
          targetId: { type: "string" },
          type: { type: "string" },
          reason: { type: "string" },
          context: { type: "string" },
          confidence: { type: "number" },
        },
      },
    },
  },
};

async function analyzeEntityWithModel(
  apiKey: string,
  modelName: string,
  vaultId: string,
  entityId: string,
  content: string,
  availableTargets: { id: string; name: string }[],
): Promise<Proposal[]> {
  if (!content.trim() || availableTargets.length === 0) {
    return [];
  }

  const model = await aiClientManager.getModel(
    apiKey,
    modelName,
    SYSTEM_INSTRUCTION,
  );

  // Truncate content to avoid exceeding token limits while keeping key context
  const truncatedContent =
    content.length > 4000 ? content.slice(0, 4000) + "..." : content;

  const targetsList = availableTargets
    .map((t) => `- ${t.name} (ID: ${t.id})`)
    .join("\n");
  const prompt = `Source Entity Content:
"""
${truncatedContent.replace(/"""/g, "''\"")}
"""

Available Target Entities:
${targetsList}`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: CONNECTIONS_RESPONSE_SCHEMA,
    },
  });
  const text = result.response.text();

  let rawProposals: any[];
  try {
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanedText);
    rawProposals = Array.isArray(parsed) ? parsed : parsed?.connections;
  } catch {
    console.warn(
      `ProposerWorker: Failed to parse JSON response for entity ${entityId}. Raw text: ${text.slice(0, 100)}...`,
    );
    return [];
  }

  if (!Array.isArray(rawProposals)) return [];

  const proposals: Proposal[] = [];
  const validTargetIds = new Set(availableTargets.map((t) => t.id));
  const idToIdMap = new Map(
    availableTargets.map((t) => [t.id.toLowerCase(), t.id]),
  );
  const nameToIdMap = new Map(
    availableTargets.map((t) => [t.name.toLowerCase(), t.id]),
  );
  const slugToIdMap = new Map(
    availableTargets.map((t) => [normalizeTargetId(t.name), t.id]),
  );
  const bestProposalsByTarget = new Map<string, any>();

  for (let i = 0; i < rawProposals.length; i++) {
    const p = rawProposals[i];
    if (p.confidence < 0.6) continue;

    let resolvedId = p.targetId;
    if (!validTargetIds.has(resolvedId)) {
      const normalized = String(resolvedId).trim().toLowerCase();
      const slugified = normalizeTargetId(normalized);
      const matchId =
        idToIdMap.get(normalized) ||
        nameToIdMap.get(normalized) ||
        slugToIdMap.get(normalized) ||
        slugToIdMap.get(slugified);

      if (matchId) {
        resolvedId = matchId;
        p.targetId = resolvedId;
      } else {
        continue;
      }
    }

    const existing = bestProposalsByTarget.get(resolvedId);
    if (!existing || p.confidence > existing.confidence) {
      bestProposalsByTarget.set(resolvedId, p);
    }
  }

  for (const p of bestProposalsByTarget.values()) {
    proposals.push({
      id: `${vaultId}:${entityId}:${p.targetId}`,
      vaultId,
      sourceId: entityId,
      targetId: p.targetId,
      type: p.type || "related",
      context: p.context || "",
      reason: p.reason || "AI detected semantic link",
      confidence: p.confidence,
      status: "pending",
      timestamp: systemClock.now(),
    });
  }

  return proposals;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data || {};

  // Fire-and-forget push from the main thread's session manager — has no
  // request id to correlate a response to, so it's handled before the
  // id-required guard below.
  if (type === "SESSION_TOKEN") {
    sessionToken.setToken((payload as CachedToken | null) ?? null);
    return;
  }

  if (!type || !id) {
    console.warn("ProposerWorker: Received malformed message", e.data);
    return;
  }

  try {
    if (type === "ANALYZE") {
      const {
        apiKey,
        modelName,
        vaultId,
        entityId,
        content,
        availableTargets,
      } = payload;
      const proposals = await analyzeEntityWithModel(
        apiKey,
        modelName,
        vaultId,
        entityId,
        content,
        availableTargets,
      );
      self.postMessage({ type: "ANALYZE_RESULT", payload: proposals, id });
    } else if (type === "SHUTDOWN") {
      self.close();
    }
  } catch (err: any) {
    self.postMessage({ type: "ERROR", payload: err.message, id });
  }
};

export {};

/// <reference lib="webworker" />
import { aiClientManager } from "../services/ai/client-manager";
import type { Proposal } from "@codex/proposer";

function normalizeTargetId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function analyzeEntityWithModel(
  apiKey: string,
  modelName: string,
  entityId: string,
  content: string,
  availableTargets: { id: string; name: string }[],
): Promise<Proposal[]> {
  if (!content.trim() || availableTargets.length === 0) {
    return [];
  }

  const model = aiClientManager.getModel(apiKey, modelName);

  let truncatedContent = content.slice(0, 15000);
  if (content.length > 15000) {
    const lastPeriod = truncatedContent.lastIndexOf(".");
    if (lastPeriod > 10000) {
      truncatedContent = truncatedContent.slice(0, lastPeriod + 1);
    }
  }

  const targetsList = availableTargets
    .map((t) => `- ${t.name} (ID: ${t.id})`)
    .join("\n");
  const prompt = `You are a lore expert assisting a writer.
Analyze the following "Source Entity" content and the list of "Available Target Entities".
Identify any POTENTIAL HIDDEN CONNECTIONS between the Source Entity and any Target Entity based on the semantic context.

Criteria for a connection:
1. The Source Entity mentions the Target Entity by name or description.
2. The Source Entity implies a relationship (e.g., location, faction member, rival, family) with the Target.
3. Only suggest connections that are NOT explicitly stated as WikiLinks (assumed).
4. Assign a confidence score (0.0 to 1.0). High confidence means explicit mention; Low means thematic link.
5. IMPORTANT: Output a MAXIMUM of ONE connection per Target Entity. Only provide the single most relevant or strongest connection if multiple exist.
6. CRITICAL: You MUST ONLY use "targetId" values that exactly match the IDs in the "Available Target Entities" list. Do not invent your own entities.

Source Entity Content:
"""
${truncatedContent.replace(/"""/g, "''\"")}
"""

Available Target Entities:
${targetsList}

Output a JSON array of objects with this schema:
[
  {
    "targetId": "string (ID from list)",
    "type": "string (e.g. 'related', 'ally', 'rival', 'located_in')",
    "reason": "string (short explanation)",
    "context": "string (snippet from source text)",
    "confidence": number
  }
]

Only return the JSON. If no connections are found, return empty array [].`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
  const text = result.response.text();

  let rawProposals: any[];
  try {
    const cleanedText = text.replace(/```json|```/g, "").trim();
    rawProposals = JSON.parse(cleanedText);
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
      id: `${entityId}:${p.targetId}`,
      sourceId: entityId,
      targetId: p.targetId,
      type: p.type || "related",
      context: p.context || "",
      reason: p.reason || "AI detected semantic link",
      confidence: p.confidence,
      status: "pending",
      timestamp: Date.now(),
    });
  }

  return proposals;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data || {};

  if (!type || !id) {
    console.warn("ProposerWorker: Received malformed message", e.data);
    return;
  }

  try {
    if (type === "ANALYZE") {
      const { apiKey, modelName, entityId, content, availableTargets } =
        payload;
      const proposals = await analyzeEntityWithModel(
        apiKey,
        modelName,
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

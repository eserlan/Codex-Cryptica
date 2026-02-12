import type { IProposerService, Proposal, ProposerConfig } from "./types";
import { openDB, type IDBPDatabase } from "idb";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DB_NAME = "CodexCryptica";
const DB_VERSION = 6;
const PROPOSAL_STORE = "proposals";

export class ProposerService implements IProposerService {
  private dbPromise: Promise<IDBPDatabase<any>>;
  private config: ProposerConfig = {
    minConfidence: 0.6,
    maxHistory: 20,
  };

  private dbName: string;

  constructor(dbName: string = DB_NAME) {
    this.dbName = dbName;
    this.dbPromise = openDB(this.dbName, DB_VERSION);
  }

  async analyzeEntity(
    apiKey: string,
    modelName: string,
    entityId: string,
    content: string,
    availableTargets: { id: string; name: string }[],
  ): Promise<Proposal[]> {
    if (!apiKey || !content.trim() || availableTargets.length === 0) {
      return [];
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

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

Source Entity Content:
"""
${content.slice(0, 15000)}
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

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      let rawProposals: any[] = [];
      try {
        rawProposals = JSON.parse(text);
      } catch {
        console.warn("Proposer: Failed to parse JSON", text);
        return [];
      }

      if (!Array.isArray(rawProposals)) return [];

      const proposals: Proposal[] = [];

      // Filter duplicates against *existing* proposals in DB?
      // The caller handles deduplication against *actual* connections.
      // Here we just format them.

      for (const p of rawProposals) {
        if (p.confidence < this.config.minConfidence) continue;

        const proposal: Proposal = {
          id: `${entityId}:${p.targetId}`,
          sourceId: entityId,
          targetId: p.targetId,
          type: p.type || "related",
          context: p.context || "",
          reason: p.reason || "AI detected semantic link",
          confidence: p.confidence,
          status: "pending",
          timestamp: Date.now(),
        };
        proposals.push(proposal);
      }

      return proposals;
    } catch (err) {
      console.error("Proposer AI Error:", err);
      return [];
    }
  }

  async getProposals(entityId: string): Promise<Proposal[]> {
    const db = await this.dbPromise;
    const allProposals = await db.getAllFromIndex(
      PROPOSAL_STORE,
      "by-source",
      entityId,
    );
    return allProposals.filter((p: Proposal) => p.status === "pending");
  }

  async getHistory(entityId: string): Promise<Proposal[]> {
    const db = await this.dbPromise;
    const allProposals = await db.getAllFromIndex(
      PROPOSAL_STORE,
      "by-source",
      entityId,
    );
    return allProposals
      .filter((p: Proposal) => p.status === "rejected")
      .sort((a: Proposal, b: Proposal) => b.timestamp - a.timestamp)
      .slice(0, this.config.maxHistory);
  }

  async applyProposal(proposalId: string): Promise<void> {
    const db = await this.dbPromise;
    const proposal = await db.get(PROPOSAL_STORE, proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    proposal.status = "accepted";
    proposal.timestamp = Date.now();
    await db.put(PROPOSAL_STORE, proposal);
  }

  async dismissProposal(proposalId: string): Promise<void> {
    const db = await this.dbPromise;
    const proposal = await db.get(PROPOSAL_STORE, proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    proposal.status = "rejected";
    proposal.timestamp = Date.now();
    await db.put(PROPOSAL_STORE, proposal);
  }

  async reEvaluateProposal(proposalId: string): Promise<void> {
    const db = await this.dbPromise;
    const proposal = await db.get(PROPOSAL_STORE, proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    proposal.status = "pending";
    proposal.timestamp = Date.now();
    await db.put(PROPOSAL_STORE, proposal);
  }

  async saveProposals(proposals: Proposal[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(PROPOSAL_STORE, "readwrite");
    await Promise.all(proposals.map((p) => tx.store.put(p)));
    await tx.done;
  }
}

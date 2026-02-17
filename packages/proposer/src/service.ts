import type { IProposerService, Proposal, ProposerConfig } from "./types";
import { openDB, type IDBPDatabase } from "idb";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DB_NAME = "CodexCryptica";
const DB_VERSION = 7;
const PROPOSAL_STORE = "proposals";

export class ProposerService implements IProposerService {
  private dbPromise: Promise<IDBPDatabase<any>> | undefined;
  private config: ProposerConfig = {
    minConfidence: 0.6,
    maxHistory: 20,
  };

  private dbName: string;
  private dbVersion: number;

  constructor(
    dbName: string = DB_NAME,
    dbVersion: number = DB_VERSION,
    externalDbPromise?: Promise<IDBPDatabase<any>>,
  ) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    if (externalDbPromise) {
      this.dbPromise = externalDbPromise;
    }
  }

  private getDB() {
    if (!this.dbPromise) {
      this.dbPromise = openDB(this.dbName, this.dbVersion, {
        // This upgrade handler is for standalone usage of ProposerService (e.g., unit tests).
        // When used within the web app, the main `idb.ts`'s upgrade handler is responsible
        // for creating the 'proposals' store.
        upgrade(db, _oldVersion) {
          if (!db.objectStoreNames.contains(PROPOSAL_STORE)) {
            const store = db.createObjectStore(PROPOSAL_STORE, {
              keyPath: "id",
            });
            store.createIndex("by-source", "sourceId");
            store.createIndex("by-status", "status");
          }
        },
        blocking: () => {
          console.warn(
            "[ProposerService] DB Upgrade requested. Closing connection.",
          );
          if (this.dbPromise) {
            this.dbPromise.then((db) => db.close());
            this.dbPromise = undefined;
          }
        },
        terminated: () => {
          console.error("[ProposerService] DB Connection terminated.");
          this.dbPromise = undefined;
        },
      });
    }
    return this.dbPromise;
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

      // Truncate content intelligently (max 15000 chars, try to break at sentence)
      let truncatedContent = content.slice(0, 15000);
      if (content.length > 15000) {
        const lastPeriod = truncatedContent.lastIndexOf(".");
        if (lastPeriod > 10000) {
          // Ensure we keep a significant chunk
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

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      let rawProposals: any[] = [];
      try {
        const cleanedText = text.replace(/```json|```/g, "").trim();
        rawProposals = JSON.parse(cleanedText);
      } catch {
        console.warn(
          `Proposer: Failed to parse JSON response for entity ${entityId}. Raw text: ${text.slice(0, 100)}...`,
        );
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
    const db = await this.getDB();
    const allProposals = await db.getAllFromIndex(
      PROPOSAL_STORE,
      "by-source",
      entityId,
    );
    return allProposals.filter((p: Proposal) => p.status === "pending");
  }

  async getHistory(entityId: string): Promise<Proposal[]> {
    const db = await this.getDB();
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
    const db = await this.getDB();
    const proposal = await db.get(PROPOSAL_STORE, proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    proposal.status = "accepted";
    proposal.timestamp = Date.now();
    await db.put(PROPOSAL_STORE, proposal);
  }

  async dismissProposal(proposalId: string): Promise<void> {
    const db = await this.getDB();
    const proposal = await db.get(PROPOSAL_STORE, proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    proposal.status = "rejected";
    proposal.timestamp = Date.now();
    await db.put(PROPOSAL_STORE, proposal);
  }

  async generateConnectionProposal(
    apiKey: string,
    modelName: string,
    sourceContent: string,
    targetContent: string,
    sourceTitle: string,
    targetTitle: string,
  ): Promise<import("./types").ConnectionProposal> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `Analyze the following two entities from a fantasy world and propose a thematic connection type and label.
    
SOURCE ENTITY: ${sourceTitle}
${sourceContent.length > 5000 ? sourceContent.slice(0, 5000) + "..." : sourceContent}

TARGET ENTITY: ${targetTitle}
${targetContent.length > 5000 ? targetContent.slice(0, 5000) + "..." : targetContent}

INSTRUCTIONS:
1. Identify the most likely relationship between them based on the provided lore.
2. Select a base type from: 'related_to' (default), 'neutral' (ambiguous/formal), 'friendly' (allies/positive), 'enemy' (rivals/negative).
3. Provide a specific short label (e.g., "Former Student", "Sworn Enemy", "Occasional Ally").
4. Provide a brief 1-sentence explanation.

Output JSON:
{
  "type": "related_to" | "neutral" | "friendly" | "enemy",
  "label": "string",
  "explanation": "string"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    try {
      const cleanedText = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanedText);
    } catch {
      console.warn("Proposer: Failed to parse proposal JSON", text);
      return {
        type: "related_to",
        label: "Related",
        explanation:
          "AI detected a potential link but failed to format the response.",
      };
    }
  }

  async parseConnectionIntent(
    apiKey: string,
    modelName: string,
    input: string,
  ): Promise<{
    sourceName: string;
    targetName: string;
    type?: string;
    label?: string;
  }> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `Extract the source entity, target entity, and the relationship type/label from the following natural language connection request.
    
USER INPUT: "${input}"

INSTRUCTIONS:
1. Identify the "From" (source) entity and "To" (target) entity. The user often uses the pattern "<from> <relationship> <to>" (e.g., "General leader of the army").
2. If a relationship type is implied, map it to one of: 'related_to', 'neutral', 'friendly', 'enemy'.
3. Extract the specific relationship label (e.g., "leader of", "master of", "rival of").

Output JSON:
{
  "sourceName": "string",
  "targetName": "string",
  "type": "related_to" | "neutral" | "friendly" | "enemy" (optional),
  "label": "string" (optional)
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    try {
      const cleanedText = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanedText);
    } catch {
      console.warn("Proposer: Failed to parse intent JSON", text);
      return { sourceName: "", targetName: "" };
    }
  }

  async parseMergeIntent(
    apiKey: string,
    modelName: string,
    input: string,
  ): Promise<{
    sourceName: string;
    targetName: string;
  }> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `Extract the source entity and the target entity from the following natural language merge request.
    
USER INPUT: "${input}"

INSTRUCTIONS:
1. Identify the "Source" entity (the one being absorbed/deleted) and the "Target" entity (the one being kept/updated). 
2. The user often uses patterns like "merge A into B" (Source=A, Target=B) or "combine A and B" (Source=A, Target=B). If order is ambiguous, prioritize the entity that appears first as the Source.

Output JSON:
{
  "sourceName": "string",
  "targetName": "string"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    try {
      const cleanedText = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanedText);
    } catch {
      console.warn("Proposer: Failed to parse merge intent JSON", text);
      return { sourceName: "", targetName: "" };
    }
  }

  async reEvaluateProposal(proposalId: string): Promise<void> {
    const db = await this.getDB();
    const proposal = await db.get(PROPOSAL_STORE, proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    proposal.status = "pending";
    proposal.timestamp = Date.now();
    await db.put(PROPOSAL_STORE, proposal);
  }

  async saveProposals(proposals: Proposal[]): Promise<void> {
    if (proposals.length === 0) return;
    const db = await this.getDB();
    const tx = db.transaction(PROPOSAL_STORE, "readwrite");

    await Promise.all(
      proposals.map(async (p) => {
        const existing = await tx.store.get(p.id);
        // Only put if it's new OR if the existing one is still pending (update metadata/confidence)
        if (!existing || existing.status === "pending") {
          await tx.store.put(p);
        }
      }),
    );

    await tx.done;
  }
}

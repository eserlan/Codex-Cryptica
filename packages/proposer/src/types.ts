export interface Proposal {
  id: string; // ${sourceId}:${targetId}
  sourceId: string;
  targetId: string;
  type: string;
  context: string;
  reason: string;
  confidence: number;
  status: "pending" | "accepted" | "rejected";
  timestamp: number;
}

export interface ProposerConfig {
  minConfidence: number; // 0.0 - 1.0
  maxHistory: number; // Max items in rejected history
}

export interface ConnectionProposal {
  type: "related_to" | "neutral" | "friendly" | "enemy";
  label: string;
  explanation: string;
}

export interface IProposerService {
  analyzeEntity(
    apiKey: string,
    modelName: string,
    entityId: string,
    content: string,
    availableTargets: { id: string; name: string }[],
  ): Promise<Proposal[]>;

  /**
   * Generates a connection proposal between two entities.
   * Requires full entity content for semantic comparison.
   */
  generateConnectionProposal(
    apiKey: string,
    modelName: string,
    sourceContent: string,
    targetContent: string,
    sourceTitle: string,
    targetTitle: string,
  ): Promise<ConnectionProposal>;

  /**
   * Parses a natural language string into connection components.
   */
  parseConnectionIntent(
    apiKey: string,
    modelName: string,
    input: string,
  ): Promise<{
    sourceName: string;
    targetName: string;
    type?: string;
    label?: string;
  }>;

  getProposals(entityId: string): Promise<Proposal[]>;
  getHistory(entityId: string): Promise<Proposal[]>;

  applyProposal(proposalId: string): Promise<void>;
  dismissProposal(proposalId: string): Promise<void>;
  reEvaluateProposal(proposalId: string): Promise<void>;

  saveProposals(proposals: Proposal[]): Promise<void>;
}

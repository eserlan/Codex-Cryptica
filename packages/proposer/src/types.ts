export interface Proposal {
  id: string; // ${vaultId}:${sourceId}:${targetId}
  vaultId: string;
  sourceId: string;
  targetId: string;
  type: string;
  context: string;
  reason: string;
  confidence: number;
  status: "pending" | "accepted" | "rejected" | "verified";
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
    vaultId: string,
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

  /**
   * Parses a natural language string into merge components (source and target).
   */
  parseMergeIntent(
    apiKey: string,
    modelName: string,
    input: string,
  ): Promise<{
    sourceName: string;
    targetName: string;
  }>;

  getProposals(vaultId: string, entityId: string): Promise<Proposal[]>;
  getHistory(vaultId: string, entityId: string): Promise<Proposal[]>;
  getAllAcceptedProposals(vaultId: string): Promise<Proposal[]>;
  getAllPendingProposals(vaultId: string): Promise<Proposal[]>;
  getAllVerifiedProposals(vaultId: string): Promise<Proposal[]>;

  applyProposal(proposalId: string): Promise<void>;
  dismissProposal(proposalId: string): Promise<void>;
  verifyProposal(proposalId: string): Promise<void>;
  reEvaluateProposal(proposalId: string): Promise<void>;

  saveProposals(proposals: Proposal[]): Promise<void>;
  clearVault(vaultId: string): Promise<void>;
}

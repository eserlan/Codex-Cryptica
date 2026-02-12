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

export interface IProposerService {
  analyzeEntity(
    apiKey: string,
    modelName: string,
    entityId: string,
    content: string,
    availableTargets: { id: string; name: string }[]
  ): Promise<Proposal[]>;
  
  getProposals(entityId: string): Promise<Proposal[]>;
  getHistory(entityId: string): Promise<Proposal[]>;
  
  applyProposal(proposalId: string): Promise<void>;
  dismissProposal(proposalId: string): Promise<void>;
  reEvaluateProposal(proposalId: string): Promise<void>;
  
  saveProposals(proposals: Proposal[]): Promise<void>;
}

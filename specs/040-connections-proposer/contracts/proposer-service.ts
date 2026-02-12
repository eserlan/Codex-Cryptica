export interface IProposerService {
  /**
   * Scans an entity's content using AI to identify hidden connections.
   * @param sourceId The entity to analyze.
   * @returns A list of potential connection proposals.
   */
  analyzeEntity(sourceId: string): Promise<ProposedConnection[]>;

  /**
   * Marks a proposal as accepted and creates the actual connection in the vault.
   * @param proposalId The ID of the proposal (${sourceId}:${targetId}).
   */
  applyProposal(proposalId: string): Promise<void>;

  /**
   * Marks a proposal as rejected and moves it to history.
   * @param proposalId The ID of the proposal.
   */
  dismissProposal(proposalId: string): Promise<void>;

  /**
   * Returns the active proposals for a specific entity.
   */
  getProposalsForEntity(entityId: string): Promise<ProposedConnection[]>;

  /**
   * Returns the last 20 rejected proposals for history review.
   */
  getRejectedHistory(entityId: string): Promise<ProposedConnection[]>;
}

export interface ProposedConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  reason: string;
  confidence: number;
  status: "pending" | "accepted" | "rejected";
  timestamp: number;
}

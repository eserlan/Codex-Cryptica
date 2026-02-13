export interface IMergeRequest {
  sourceNodeIds: string[]; // IDs of nodes to be merged (will be deleted)
  targetNodeId: string;    // ID of the primary node (will be updated)
  strategy: 'ai' | 'concat'; // AI generation or simple concatenation
}

export interface IMergedContent {
  id: string; // The ID of the resulting node (usually targetNodeId)
  frontmatter: Record<string, any>;
  body: string;
}

export interface INodeMergeService {
  /**
   * Validates if the selected nodes can be merged.
   * Throws error if < 2 nodes or invalid IDs.
   */
  validateMerge(nodeIds: string[]): Promise<void>;

  /**
   * Generates a proposal for merging the content of the given nodes.
   * Uses AI if strategy is 'ai', otherwise concatenates.
   */
  proposeMerge(request: IMergeRequest): Promise<IMergedContent>;

  /**
   * Executes the merge operation:
   * 1. Updates target node content.
   * 2. Re-routes connections in graph.
   * 3. Updates backlinks in other files.
   * 4. Deletes source nodes.
   */
  executeMerge(finalContent: IMergedContent, sourceIds: string[]): Promise<void>;
}

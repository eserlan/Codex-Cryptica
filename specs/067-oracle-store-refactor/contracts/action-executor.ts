export interface IOracleActionExecutor {
  /**
   * Execute the identified intent.
   * This is where side effects (vault changes, AI calls) occur.
   */
  execute(
    intent: OracleIntent,
    context: {
      vault: any;
      aiService: any;
      diceEngine: any;
      searchService: any;
      nodeMergeService: any;
      tier: "lite" | "advanced";
      apiKey: string | null;
      isDemoMode: boolean;
    },
  ): Promise<void>;

  /**
   * Specialized execution for drawing an entity directly from UI.
   */
  drawEntity(entityId: string, context: any): Promise<void>;
}

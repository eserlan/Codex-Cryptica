export type OracleIntent =
  | { type: "chat"; query: string; isAIIntent: boolean }
  | { type: "roll"; formula: string; title?: string }
  | {
      type: "create";
      entityName: string;
      entityType: string;
      isDrawing: boolean;
    }
  | { type: "connect"; sourceName: string; label: string; targetName: string }
  | { type: "merge"; sourceName: string; targetName: string }
  | { type: "plot"; query: string }
  | { type: "help" }
  | { type: "clear" };

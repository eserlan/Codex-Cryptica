export * from "./ai/index";

// Legacy AIService instance for backward compatibility during migration
import { AIService } from "./ai/legacy-adapter";
export const aiService = new AIService();

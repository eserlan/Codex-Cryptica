import { GENERIC_TEMPLATES } from "schema";

export interface AISearchService {
  search(
    query: string,
    options?: { limit?: number; includeDrafts?: boolean },
  ): Promise<Array<{ id: string; score: number; matchType?: string }>>;
}

export type TemplateResolver = (type: string, themeId?: string) => string;

const emptySearchService: AISearchService = {
  async search() {
    return [];
  },
};

let configuredSearchService: AISearchService = emptySearchService;
let configuredTemplateResolver: TemplateResolver = (type) =>
  GENERIC_TEMPLATES[type.toLowerCase()] ?? "";

export function configureAIEngine(options: {
  searchService?: AISearchService;
  templateResolver?: TemplateResolver;
}): void {
  if (options.searchService) configuredSearchService = options.searchService;
  if (options.templateResolver)
    configuredTemplateResolver = options.templateResolver;
}

export function getAISearchService(): AISearchService {
  return configuredSearchService;
}

export function resolveAITemplate(type: string, themeId?: string): string {
  return configuredTemplateResolver(type, themeId);
}

export const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

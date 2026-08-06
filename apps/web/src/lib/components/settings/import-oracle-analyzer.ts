import type { DiscoveredEntity } from "@codex/importer";
import {
  OracleAnalyzer,
  getRegistry,
  markChunkComplete,
  splitTextIntoChunks,
} from "@codex/importer";

export interface OracleAnalysisRunnerDeps {
  aiClientManager: any;
  apiKey: string;
  vaultAllEntities: { title: string; id: string }[];
  importQueue: any;
  setStatusMessage: (msg: string) => void;
  setShowResumeToast: (show: boolean) => void;
  setTotalChunks: (total: number) => void;
  setCurrentFileHash: (hash: string) => void;
  extractedAssets: Map<string, any>;
  addDiscoveredEntities: (entities: DiscoveredEntity[]) => void;
  rejectFile: (name: string, reason: string) => void;
  getMarkdownFrontmatterValidator: () => Promise<any>;
}

export async function runOracleFileAnalysis(
  file: File,
  parsedResult: { text: string; assets: any[] },
  hash: string,
  isMarkdown: boolean,
  signal: AbortSignal,
  deps: OracleAnalysisRunnerDeps,
): Promise<void> {
  const analyzer = new OracleAnalyzer((modelName: string) =>
    deps.aiClientManager.getModel(deps.apiKey, modelName),
  );

  if (isMarkdown) {
    const validateMarkdownFrontmatter =
      await deps.getMarkdownFrontmatterValidator();
    const validation = validateMarkdownFrontmatter(parsedResult.text);
    if (!validation.success) {
      deps.rejectFile(file.name, "Invalid YAML frontmatter");
      return;
    }
  }

  parsedResult.assets.forEach((asset) => {
    deps.extractedAssets.set(asset.placementRef, asset);
  });

  const knownEntities: Record<string, string> = {};
  for (const e of deps.vaultAllEntities) {
    knownEntities[e.title] = e.id;
  }

  const chunks = splitTextIntoChunks(parsedResult.text);
  deps.setTotalChunks(chunks.length);
  const registry = await getRegistry(hash, file.name, chunks.length);

  if (registry.completedIndices.length > 0) {
    if (registry.completedIndices.length === chunks.length) {
      deps.setStatusMessage(`Already processed: ${file.name}.`);
      return;
    }
    deps.setShowResumeToast(true);
    setTimeout(() => deps.setShowResumeToast(false), 5000);
  }

  deps.importQueue.activeItemChunks = {};
  registry.completedIndices.forEach((idx) => {
    deps.importQueue.updateChunkStatus(idx, "skipped");
  });

  if (signal.aborted) return;

  deps.setStatusMessage(`Analyzing ${file.name} with Oracle...`);
  await analyzer.analyze(parsedResult.text, {
    signal,
    knownEntities,
    completedIndices: registry.completedIndices,
    onChunkActive: (idx) => {
      deps.importQueue.updateChunkStatus(idx, "active");
      deps.setStatusMessage(`Analyzing chunk ${idx + 1}/${chunks.length}...`);
    },
    onChunkProcessed: async (idx, res) => {
      await markChunkComplete(hash, idx);
      deps.importQueue.updateChunkStatus(idx, "completed");
      deps.addDiscoveredEntities(res.entities);
    },
  });
}

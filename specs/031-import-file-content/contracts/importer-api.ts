export interface FileParser {
  /**
   * Checks if this parser handles the given file type
   */
  accepts(file: File): boolean;

  /**
   * Parses the file into raw text and assets
   */
  parse(file: File): Promise<ParseResult>;
}

export interface ParseResult {
  text: string;
  assets: ExtractedAsset[];
  metadata: Record<string, any>;
}

export interface ExtractedAsset {
  id: string;
  blob: Blob;
  name: string;
  type: string; // MIME
}

export interface OracleAnalyzer {
  /**
   * Analyzes text to find discrete entities and structured data
   */
  analyze(text: string, options?: AnalysisOptions): Promise<AnalysisResult>;
}

export interface AnalysisOptions {
  batchContext?: string[]; // Names of other files in batch
  knownEntities?: string[]; // Names of existing graph nodes
}

export interface AnalysisResult {
  entities: GeneratedEntity[];
}

export interface GeneratedEntity {
  title: string;
  type: string;
  markdownContent: string;
  frontmatter: Record<string, any>;
  suggestedFilename: string;
}

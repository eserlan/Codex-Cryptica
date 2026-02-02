export interface ImportSession {
  id: string; // UUID
  timestamp: number;
  status: 'parsing' | 'extracting' | 'reviewing' | 'finalizing' | 'complete' | 'error';
  items: ImportItem[];
}

export interface ImportItem {
  id: string; // UUID
  file: File; // Browser File object
  status: 'pending' | 'parsing' | 'analyzing' | 'ready' | 'saved' | 'error';

  // Phase 1: Raw Parse
  parsedText?: string;
  extractedAssets?: ImportAsset[]; // Images found in doc

  // Phase 2: AI Analysis
  detectedEntities?: DiscoveredEntity[]; // What the Oracle found

  error?: string;
}

export interface DiscoveredEntity {
  id: string; // Temp ID
  suggestedTitle: string;
  suggestedType: 'Character' | 'Location' | 'Item' | 'Lore' | 'Unknown';
  content: string; // Markdown body
  frontmatter: Record<string, any>;
  confidence: number; // 0-1
  suggestedFilename: string; // Added for persistence

  // Relationships
  detectedLinks: string[]; // Names of other entities mentioned
}

export interface ImportAsset {
  id: string;
  originalName: string;
  blob: Blob;
  mimeType: string;
  placementRef: string; // e.g., "image1.png" used in Markdown
}

export interface FileParser {
  accepts(file: File): boolean;
  parse(file: File): Promise<ParseResult>;
}

export interface ParseResult {
  text: string;
  assets: ImportAsset[];
  metadata: Record<string, any>;
}

export interface OracleAnalyzerEngine {
  analyze(text: string, options?: AnalysisOptions): Promise<AnalysisResult>;
}

export interface AnalysisOptions {
  batchContext?: string[];
  knownEntities?: string[];
}

export interface AnalysisResult {
  entities: DiscoveredEntity[];
}
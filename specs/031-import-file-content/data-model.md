# Data Model: Import Engine

## Entities

### 1. ImportSession (Client-Side State)

Represents a user's action of dropping files to import.

```typescript
interface ImportSession {
  id: string; // UUID
  timestamp: number;
  status: 'parsing' | 'extracting' | 'reviewing' | 'finalizing' | 'complete' | 'error';
  items: ImportItem[];
}
```

### 2. ImportItem

Represents a single source file being processed.

```typescript
interface ImportItem {
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
```

### 3. DiscoveredEntity

A potential Node identified by the Oracle.

```typescript
interface DiscoveredEntity {
  id: string; // Temp ID
  suggestedTitle: string;
  suggestedType: 'Character' | 'Location' | 'Item' | 'Lore' | 'Unknown';
  content: string; // Markdown body
  frontmatter: Record<string, any>;
  confidence: number; // 0-1
  
  // Relationships
  detectedLinks: string[]; // Names of other entities mentioned
}
```

### 4. ImportAsset

Binary asset extracted from a document.

```typescript
interface ImportAsset {
  id: string;
  originalName: string;
  blob: Blob;
  mimeType: string;
  placementRef: string; // e.g., "image1.png" used in Markdown
}
```

## Data Flow

1.  **Upload**: User drops files -> `ImportSession` created -> `ImportItem` per file.
2.  **Parse**: `ImportItem` passes through `DocxParser` / `PdfParser` -> Populates `parsedText` and `extractedAssets`.
3.  **Analyze**: `parsedText` sent to Oracle -> Returns list of `DiscoveredEntity` items.
4.  **Review (Optional)**: User sees list of `DiscoveredEntity` items to confirm/reject.
5.  **Commit**: System writes `DiscoveredEntity` to OPFS as `.md` files + writes `ImportAsset` to media folder.

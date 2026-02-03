<script lang="ts">
  import ImportDropzone from './ImportDropzone.svelte';
  import ReviewList from './ReviewList.svelte';
  import { 
    TextParser, 
    DocxParser,
    JsonParser, 
    OracleAnalyzer, 
    generateMarkdownFile 
  } from "@codex/importer";
  import type { ImportSession, ImportItem, DiscoveredEntity } from "@codex/importer";
  
  interface Props {
    apiKey: string;
    onPersist: (data: { filename: string, content: string }) => void;
    onClose: () => void;
  }

  let { apiKey, onPersist, onClose }: Props = $props();

  let step = $state<'upload' | 'processing' | 'review' | 'complete'>('upload');
  let session = $state<ImportSession>({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    status: 'parsing',
    items: []
  });

  let discoveredEntities = $state<DiscoveredEntity[]>([]);
  let statusMessage = $state('');

  const parsers = [
    new TextParser(),
    new DocxParser(),
    new JsonParser(),
    // new PdfParser()
  ];

  const handleFiles = async (files: File[]) => {
    step = 'processing';
    const analyzer = new OracleAnalyzer(apiKey);
    
    statusMessage = `Processing ${files.length} files...`;

    for (const file of files) {
      const item: ImportItem = {
        id: crypto.randomUUID(),
        file,
        status: 'parsing'
      };
      session.items.push(item);

      // Find Parser
      const parser = parsers.find(p => p.accepts(file));
      if (!parser) {
        item.status = 'error';
        item.error = 'Unsupported file type';
        continue;
      }

      try {
        statusMessage = `Parsing ${file.name}...`;
        const result = await parser.parse(file);
        item.parsedText = result.text;
        item.extractedAssets = result.assets;
        
        statusMessage = `Analyzing content with Oracle...`;
        const analysis = await analyzer.analyze(result.text, {
            onProgress: (current, total) => {
                statusMessage = `Analyzing content with Oracle (Chunk ${current}/${total})...`;
            }
        });
        item.detectedEntities = analysis.entities;
        
        discoveredEntities = [...discoveredEntities, ...analysis.entities];
        item.status = 'ready';
      } catch (err: any) {
        item.status = 'error';
        item.error = err.message;
      }
    }

    step = 'review';
  };

  const handleSave = async (toSave: DiscoveredEntity[]) => {
    statusMessage = `Saving ${toSave.length} items...`;
    
    // In a real app, this would call a store action to write to OPFS
    // For now, we simulate success or emit event up
    for (const entity of toSave) {
       const content = generateMarkdownFile(entity);
       // Dispatch save event to parent container which handles actual File System access
       onPersist({ filename: entity.suggestedFilename, content });
    }

    step = 'complete';
    setTimeout(() => onClose(), 1500);
  };
</script>

<div class="import-modal">
  <div class="header">
    <h2>Import Content</h2>
    <button class="close" onclick={onClose}>&times;</button>
  </div>

  <div class="body">
    {#if step === 'upload'}
      <ImportDropzone onFileSelect={handleFiles} />
    {:else if step === 'processing'}
      <div class="loading">
        <div class="spinner"></div>
        <p>{statusMessage}</p>
        <div class="progress">
           <!-- Simple visual progress could go here -->
        </div>
      </div>
    {:else if step === 'review'}
      <ReviewList 
        entities={discoveredEntities} 
        onSave={handleSave} 
        onCancel={() => step = 'upload'} 
      />
    {:else if step === 'complete'}
      <div class="success">
        <h3>Import Complete!</h3>
        <p>{discoveredEntities.length} items added to Codex.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .import-modal {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    width: 600px;
    max-width: 90vw;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .loading, .success {
    text-align: center;
    padding: 2rem;
  }

  .spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>

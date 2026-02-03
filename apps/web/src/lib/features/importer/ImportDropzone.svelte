<script lang="ts">
  import { htmlToMarkdown } from '@codex/importer';

  interface Props {
    onFileSelect: (files: File[]) => void;
  }

  let { onFileSelect }: Props = $props();

  let dragging = $state(false);
  let content = $state('');
  let editorRef: HTMLDivElement;

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    dragging = false;
    
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFileSelect(files);
    }
  };

  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      onFileSelect(files);
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    // We let the browser handle the HTML insertion to preserve formatting
    // But we stop propagation to prevent bubbling if necessary
    e.stopPropagation();
  };

  const handleInput = () => {
    if (editorRef) {
      content = editorRef.innerHTML;
    }
  };

  const processText = () => {
    if (!content.trim()) return;
    
    const markdown = htmlToMarkdown(content);
    const file = new File([markdown], "pasted-content.md", { type: "text/markdown" });
    onFileSelect([file]);
    
    // Clear
    if (editorRef) editorRef.innerHTML = '';
    content = '';
  };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="dropzone-container {dragging ? 'dragging' : ''}"
  ondragover={(e) => { e.preventDefault(); dragging = true; }}
  ondragleave={() => dragging = false}
  ondrop={handleDrop}
>
  <div 
    class="editor"
    contenteditable="true"
    bind:this={editorRef}
    oninput={handleInput}
    onpaste={handlePaste}
    role="textbox"
    tabindex="0"
    aria-label="Paste text or drag files here"
    aria-multiline="true"
  ></div>

  {#if !content.trim()}
    <div class="placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <p>Drag files here or paste content</p>
      <button class="upload-btn" onclick={() => document.getElementById('file-input')?.click()}>
        Browse Files
      </button>
    </div>
  {/if}

  <input 
    id="file-input"
    type="file" 
    multiple 
    accept=".pdf,.docx,.txt,.md,.json"
    onchange={handleFileSelect}
    class="hidden-input"
  />

  {#if content.trim()}
    <div class="actions">
      <button class="primary" onclick={processText}>
        Analyze Text
      </button>
    </div>
  {/if}
</div>

<style>
  .dropzone-container {
    border: 2px dashed var(--theme-border, #ccc);
    border-radius: 8px;
    background: var(--theme-bg, #fafafa);
    position: relative;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    transition: all 0.2s;
  }

  .dropzone-container.dragging {
    border-color: var(--theme-primary, #3b82f6);
    background: var(--theme-primary, #3b82f61a);
  }

  .editor {
    flex: 1;
    padding: 1.5rem;
    outline: none;
    z-index: 10;
    font-family: var(--font-body, sans-serif);
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--theme-text);
    overflow-y: auto;
    max-height: 400px;
  }

  /* Placeholder Styling */
  .placeholder {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    pointer-events: none;
    opacity: 0.6;
  }

  /* Hide placeholder when editor has focus or content */
  .editor:focus + .placeholder,
  .editor:not(:empty) + .placeholder {
    display: none;
  }

  /* But we want placeholder to show if empty even when focused? 
     Usually yes, but simple CSS :empty check works for content. 
     The logic above {#if !content} handles it better in Svelte.
  */

  .icon {
    width: 32px;
    height: 32px;
    color: var(--theme-muted, #9ca3af);
  }

  p {
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-text);
  }

  .upload-btn {
    pointer-events: auto; /* Enable clicking */
    background: transparent;
    border: 1px solid var(--theme-border);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.7rem;
    text-transform: uppercase;
    cursor: pointer;
    color: var(--theme-text);
  }

  .hidden-input {
    display: none;
  }

  .actions {
    padding: 1rem;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid var(--theme-border);
    background: var(--theme-surface);
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
  }

  button.primary {
    background: var(--theme-primary, #3b82f6);
    color: var(--theme-bg, #fff);
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: bold;
    font-size: 0.8rem;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>



<script lang="ts">
  interface Props {
    onFileSelect: (files: File[]) => void;
  }

  let { onFileSelect }: Props = $props();

  let dragging = $state(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    dragging = false;
    
    if (e.dataTransfer?.files) {
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
</script>

<div 
  class="dropzone {dragging ? 'dragging' : ''}"
  ondragover={(e) => { e.preventDefault(); dragging = true; }}
  ondragleave={() => dragging = false}
  ondrop={handleDrop}
  role="button"
  tabindex="0"
>
  <div class="content">
    <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
    <p>Drag files here or click to upload</p>
    <input 
      type="file" 
      multiple 
      accept=".pdf,.docx,.txt,.md,.json"
      onchange={handleFileSelect}
    />
  </div>
</div>

<style>
  .dropzone {
    border: 2px dashed var(--theme-border, #ccc);
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    transition: all 0.2s;
    background: var(--theme-bg, #fafafa);
    position: relative;
    cursor: pointer;
  }

  .dropzone:hover, .dropzone.dragging {
    border-color: var(--theme-primary, #3b82f6);
    background: var(--theme-primary, #3b82f61a);
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    pointer-events: none;
  }

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

  input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    pointer-events: all;
  }
</style>

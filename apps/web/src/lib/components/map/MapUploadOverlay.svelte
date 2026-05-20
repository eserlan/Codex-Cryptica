<script lang="ts">
  let {
    mapName = $bindable(""),
    files = $bindable<FileList | null>(null),
    isDragging = false,
    onDragOver,
    onDragLeave,
    onDrop,
    onUpload,
    onCancel,
  }: {
    mapName?: string;
    files?: FileList | null;
    isDragging?: boolean;
    onDragOver: (event: DragEvent) => void;
    onDragLeave: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
    onUpload: () => void | Promise<void>;
    onCancel: () => void;
  } = $props();

  const hasSelectedFile = $derived(Boolean(files?.[0]));
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="absolute inset-0 z-50 bg-theme-bg/80 backdrop-blur-sm flex items-center justify-center p-6"
  role="dialog"
  aria-modal="true"
  aria-labelledby="map-upload-title"
  tabindex="-1"
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
>
  <div
    class="w-full max-w-md bg-theme-surface border rounded-xl p-8 shadow-2xl transition-colors duration-200 {isDragging
      ? 'border-theme-primary'
      : 'border-theme-border'}"
  >
    <h3
      id="map-upload-title"
      class="text-xl font-bold text-theme-text mb-6 uppercase font-header tracking-wider"
    >
      Upload New Map
    </h3>

    <div class="space-y-6">
      <div class="space-y-2">
        <label
          class="text-[10px] font-mono text-theme-muted uppercase tracking-widest"
          for="map-name"
        >
          Map Name
        </label>
        <input
          id="map-name"
          type="text"
          bind:value={mapName}
          placeholder="World Map, City Plan, etc."
          class="w-full bg-theme-surface/50 border border-theme-border text-theme-text px-4 py-3 rounded-lg focus:border-theme-primary outline-none transition-colors"
        />
      </div>

      <div class="space-y-2">
        <label
          class="text-[10px] font-mono text-theme-muted uppercase tracking-widest"
          for="map-file"
        >
          Image File
        </label>
        <input
          id="map-file"
          type="file"
          accept="image/*"
          bind:files
          class="w-full text-xs text-theme-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-theme-primary/10 file:text-theme-primary hover:file:bg-theme-primary/20"
        />
      </div>

      <div class="flex gap-4 pt-4">
        <button
          class="flex-1 px-6 py-3 border border-theme-border text-theme-muted rounded-lg hover:bg-theme-surface transition-colors uppercase text-[10px] font-bold font-header tracking-widest"
          onclick={onCancel}
        >
          Cancel
        </button>
        <button
          class="flex-1 px-6 py-3 bg-theme-primary text-theme-bg rounded-lg font-bold uppercase font-header text-[10px] tracking-widest"
          onclick={onUpload}
          disabled={!hasSelectedFile}
        >
          Upload
        </button>
      </div>
    </div>
  </div>
</div>

<script lang="ts">
  let { show = $bindable(), vaultTitle, onConfirm } = $props();

  function handleConfirm() {
    show = false;
    onConfirm();
  }

  function handleCancel() {
    show = false;
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
  >
    <div
      class="bg-theme-bg border border-red-900/30 w-full max-w-md rounded-lg shadow-2xl overflow-hidden flex flex-col font-body text-theme-text"
      role="dialog"
      aria-modal="true"
    >
      <!-- Header -->
      <div
        class="px-6 py-4 border-b border-theme-border flex justify-between items-center bg-red-950/10"
      >
        <h3
          class="text-md font-bold uppercase font-header tracking-wider text-red-400 flex items-center gap-2"
        >
          <span class="icon-[lucide--alert-triangle] w-5 h-5 text-red-400"
          ></span>
          Unpublish Snapshot
        </h3>
        <button
          type="button"
          onclick={handleCancel}
          class="text-theme-text/60 hover:text-theme-text transition-colors"
          aria-label="Close modal"
        >
          <span class="icon-[lucide--x] w-5 h-5"></span>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-4">
        <p class="text-sm leading-relaxed text-theme-text/80">
          Are you sure you want to unpublish <strong class="text-theme-primary"
            >{vaultTitle || "this campaign"}</strong
          >?
        </p>
        <p
          class="text-sm leading-relaxed text-theme-text/60 bg-red-950/20 border border-red-500/20 p-3 rounded"
        >
          This action will permanently delete the snapshot JSON bundle and all
          associated asset files (images, maps) from the Cloudflare R2 bucket.
          Players and guests using the shared link will immediately receive a
          404 snapshot error.
        </p>
      </div>

      <!-- Footer Buttons -->
      <div
        class="px-6 py-4 border-t border-theme-border bg-theme-bg/30 flex justify-end gap-3"
      >
        <button
          type="button"
          onclick={handleCancel}
          class="px-4 py-2 border border-theme-border text-theme-text/80 hover:text-theme-text text-sm rounded font-bold uppercase font-header tracking-wider transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={handleConfirm}
          class="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded font-bold uppercase font-header tracking-wider transition-all flex items-center gap-2"
        >
          <span class="icon-[lucide--trash-2] w-4 h-4"></span>
          Unpublish & Delete
        </button>
      </div>
    </div>
  </div>
{/if}

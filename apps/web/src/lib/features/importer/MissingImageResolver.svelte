<script lang="ts">
  import type { MissingImageReference } from "@codex/importer";
  import { isFileSystemAccessSupported } from "$lib/utils/fs";

  interface Props {
    refs: MissingImageReference[];
    onAddFile: (ref: MissingImageReference, file: File) => void | Promise<void>;
    onUseFolder: (ref: MissingImageReference) => void | Promise<void>;
  }

  let { refs, onAddFile, onUseFolder }: Props = $props();

  const pending = $derived(
    refs.filter(
      (r) => r.resolution === "unresolved" || r.resolution === "still-missing",
    ),
  );

  const folderSupported = isFileSystemAccessSupported();

  let inputRefs: Record<string, HTMLInputElement> = {};

  const handleFileChange = async (ref: MissingImageReference, e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await onAddFile(ref, file);
    input.value = "";
  };
</script>

{#if pending.length > 0}
  <section
    class="mb-4 rounded border border-amber-500/30 bg-amber-500/10 p-3"
    aria-label="Missing images"
    data-testid="missing-image-resolver"
  >
    <div class="flex items-start gap-2 mb-2">
      <span
        class="icon-[lucide--image-off] mt-0.5 h-4 w-4 shrink-0 text-amber-500"
      ></span>
      <div class="min-w-0">
        <p
          class="font-header text-[10px] font-bold uppercase tracking-widest text-amber-500"
        >
          {pending.length} Image{pending.length === 1 ? "" : "s"} Not Included
        </p>
        <p class="mt-1 text-xs leading-snug text-theme-muted">
          These files reference an image that wasn't part of your drop or
          selection. Add the image directly, or (where supported) let the app
          look in the source folder. You can also continue without them —
          they'll be reported as missing.
        </p>
      </div>
    </div>

    <ul class="flex flex-col gap-2">
      {#each pending as ref (ref.path)}
        <li
          class="flex flex-wrap items-center justify-between gap-2 rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs"
        >
          <span class="truncate text-theme-text" title={ref.path}
            >{ref.path}</span
          >
          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              class="px-2 py-1 text-[10px] font-bold uppercase font-header tracking-wider border border-theme-border rounded hover:bg-theme-surface"
              onclick={() => inputRefs[ref.path]?.click()}
            >
              Add File
            </button>
            <input
              bind:this={inputRefs[ref.path]}
              type="file"
              accept="image/*"
              class="hidden"
              aria-label={`Add the missing image for ${ref.path}`}
              onchange={(e) => handleFileChange(ref, e)}
            />
            {#if folderSupported}
              <button
                type="button"
                class="px-2 py-1 text-[10px] font-bold uppercase font-header tracking-wider border border-theme-border rounded hover:bg-theme-surface"
                onclick={() => onUseFolder(ref)}
              >
                Use Folder
              </button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>

    {#if !folderSupported}
      <p class="mt-2 text-[10px] text-theme-muted leading-snug">
        This browser can't grant folder access to search for missing images
        automatically — add each one directly instead.
      </p>
    {/if}
  </section>
{/if}

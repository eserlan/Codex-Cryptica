<!-- fallow-ignore-file css-broken-reference -- overflow-y-auto is a valid Tailwind utility; the class check misreads it. -->
<script lang="ts">
  /** The sharing consent screen; the owner must accept before anything is sent. */
  import { focusTrap } from "#lib/actions/focusTrap.js";

  let {
    busy,
    onaccept,
    oncancel,
  }: { busy: boolean; onaccept: () => void; oncancel: () => void } = $props();
</script>

<div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
  <button
    type="button"
    class="absolute inset-0 h-full w-full bg-black/85 backdrop-blur-md"
    aria-label="Cancel sharing setup"
    onclick={oncancel}
  ></button>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="share-consent-title"
    tabindex="-1"
    use:focusTrap
    class="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto border border-theme-border bg-theme-surface p-6"
  >
    <h2
      id="share-consent-title"
      class="font-header text-lg font-bold text-theme-text"
    >
      Before you share this vault
    </h2>
    <div
      class="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-theme-text"
    >
      <p>
        <strong>Who can see and change it:</strong> anyone with the link can read
        and change the whole vault, hidden and GM-only notes included.
      </p>
      <p>
        <strong>Syncing:</strong> changes the group makes sync automatically.
      </p>
      <p>
        <strong>Removing people:</strong> a removed member keeps their own copy of
        the vault.
      </p>
      <p>
        <strong>What gets stored:</strong> the shared copy holds the vault's entities,
        notes, labels, connections, images, maps and canvases.
      </p>
      <p>
        <strong>Where:</strong> the copy is stored by Codex Cryptica's hosting provider,
        Cloudflare R2. It is not end-to-end encrypted, so the provider can technically
        read it. It is never sold, forwarded or used to train AI.
      </p>
      <p>
        <strong>What we can see:</strong> Codex Cryptica support can see only backup
        metadata (vault title, size, entry count, last backup time), not the contents.
      </p>
      <p>
        <strong>Turning it off:</strong> you can turn sharing off here at any time,
        which stops the link. Deleting the backup permanently erases the remote copy;
        members' local vaults are not deleted.
      </p>
      <p>
        <strong>Who is in charge:</strong> only the owner's recovery key can replace
        the link, turn sharing off or delete the backup.
      </p>
    </div>
    <div class="mt-6 flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onclick={oncancel}
        class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-text"
      >
        Not now
      </button>
      <button
        type="button"
        onclick={onaccept}
        disabled={busy}
        class="bg-theme-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-theme-on-primary transition-colors hover:bg-theme-primary/90 disabled:opacity-50"
      >
        I understand, share with group
      </button>
    </div>
  </div>
</div>

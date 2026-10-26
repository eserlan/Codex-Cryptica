<script lang="ts">
  import { onMount } from "svelte";
  import {
    createCifChannel,
    type CifChannel,
  } from "$lib/services/help-assistant/cif-popout-protocol";
  import { CifPopoutClient } from "$lib/stores/help-assistant/cif-popout-client.svelte";
  import HelpAssistantPanel from "$lib/components/help-assistant/HelpAssistantPanel.svelte";

  // Cif in its own window. The conversation, the screen it is about and the AI
  // request all live in the main Codex Cryptica window; this page shows them.
  let client = $state<CifPopoutClient>();
  let unsupported = $state(false);

  onMount(() => {
    const channel: CifChannel | null = createCifChannel();
    if (!channel) {
      unsupported = true;
      return;
    }
    const instance = new CifPopoutClient(channel);
    client = instance;
    instance.start();
    const leave = () => instance.stop();
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  });
</script>

<svelte:head>
  <title>Cif | Codex Cryptica</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="min-h-screen bg-chrome-surface text-chrome-text">
  {#if unsupported}
    <p class="p-4 text-body-ui text-chrome-muted">
      This browser cannot link Cif to the main window. Close this window and use
      Cif in Codex Cryptica instead.
    </p>
  {:else if client}
    {#if !client.connected}
      <p
        class="absolute inset-x-0 top-12 z-10 mx-3 rounded border border-chrome-border bg-chrome-surface p-3 text-body-ui text-chrome-muted"
        role="status"
      >
        Waiting for the Codex Cryptica window. Keep it open, and Cif will appear
        here.
      </p>
    {/if}
    <HelpAssistantPanel
      assistant={client}
      variant="window"
      onAccept={() => client?.accept()}
      onOpenArticle={(id) => client?.openArticle(id)}
      onOpenLibrary={() => client?.openLibrary()}
      onClose={() => window.close()}
    />
  {/if}
</main>

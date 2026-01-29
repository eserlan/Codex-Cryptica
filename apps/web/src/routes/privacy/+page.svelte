<script lang="ts">
  import { onMount } from 'svelte';
  import { parse } from 'marked';
  import { base } from '$app/paths';

  let content = $state('');

  onMount(async () => {
    const res = await fetch(`${base}/PRIVACY.md`);
    const text = await res.text();
    content = await parse(text);
  });
</script>

<div class="max-w-3xl mx-auto px-6 py-12 bg-black min-h-screen">
  <div class="mb-8 border-b border-green-900/30 pb-4">
    <a href="{base}/" class="text-green-500 hover:text-green-400 font-mono text-sm flex items-center gap-2">
      <span class="icon-[lucide--arrow-left] w-4 h-4"></span>
      BACK TO CRYPTICA
    </a>
  </div>

  <div class="prose prose-invert prose-green max-w-none font-mono text-green-100/90
    prose-headings:text-green-400 prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-wider
    prose-p:leading-relaxed prose-strong:text-green-300 prose-a:text-green-400 prose-a:underline hover:prose-a:text-green-300">
    {@html content}
  </div>
</div>

<script lang="ts">
    import { onMount } from "svelte";
    import { parse } from "marked";
    import { base } from "$app/paths";

    let { fileName, title } = $props<{ fileName: string; title: string }>();
    let content = $state("");

    onMount(async () => {
        const res = await fetch(`${base}/${fileName}`);
        const text = await res.text();
        content = await parse(text);
        if (title) {
            document.title = `${title} | Codex Cryptica`;
        }
    });
</script>

<div class="max-w-3xl mx-auto px-6 py-12 bg-black min-h-screen">
    <div class="mb-8 border-b border-green-900/30 pb-4">
        <a
            href="{base}/"
            class="text-green-500 hover:text-green-400 font-mono text-sm flex items-center gap-2"
        >
            <span class="icon-[lucide--arrow-left] w-4 h-4"></span>
            BACK TO CRYPTICA
        </a>
    </div>

    <div class="legal-content font-mono text-green-100/90">
        {@html content}
    </div>
</div>

<style>
    .legal-content :global(h1) {
        font-size: 1.75rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--color-accent-primary);
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid rgba(74, 222, 128, 0.2);
    }

    .legal-content :global(h2) {
        font-size: 1.5rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--color-accent-primary);
        margin-top: 4rem;
        margin-bottom: 1.5rem;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid var(--color-border-primary);
    }

    .legal-content :global(h3) {
        font-size: 1.125rem;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--color-accent-primary);
        margin-top: 2.5rem;
        margin-bottom: 1rem;
    }

    .legal-content :global(p) {
        line-height: 1.8;
        margin-bottom: 1.5rem;
        font-size: 1rem;
    }

    .legal-content :global(li) {
        line-height: 1.7;
        margin-bottom: 0.75rem;
        font-size: 1rem;
    }

    .legal-content :global(strong) {
        color: var(--color-accent-primary);
        font-weight: 700;
    }

    .legal-content :global(a) {
        color: var(--color-accent-primary);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 4px;
        transition: all 0.2s;
    }

    .legal-content :global(a:hover) {
        color: #86efac;
        text-decoration-thickness: 2px;
    }

    @media (max-width: 768px) {
        .legal-content :global(h1) {
            font-size: 1.5rem;
        }
        .legal-content :global(h2) {
            font-size: 1.25rem;
        }
    }
</style>
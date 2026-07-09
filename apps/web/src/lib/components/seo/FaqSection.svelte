<script lang="ts">
  let {
    introTitle,
    faqs,
  }: {
    introTitle: string;
    faqs: { question: string; answer: string }[];
  } = $props();
</script>

{#if faqs.length > 0}
  <section class="border-t border-theme-border/60 px-6 py-12">
    <div class="max-w-4xl mx-auto">
      <h2
        class="font-header font-bold text-xl uppercase tracking-wider text-theme-primary mb-6"
      >
        {introTitle} FAQ
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        {#each faqs as faq (faq.question)}
          <article
            class="border border-theme-border/60 bg-theme-surface/30 rounded-xl p-5"
          >
            <h3
              class="font-header font-bold text-sm uppercase tracking-wider mb-2"
            >
              {faq.question}
            </h3>
            <p class="text-sm text-theme-muted leading-relaxed">
              {faq.answer}
            </p>
          </article>
        {/each}
      </div>
    </div>
  </section>
{/if}

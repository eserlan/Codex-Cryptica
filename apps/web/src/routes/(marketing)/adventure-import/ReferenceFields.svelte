<script lang="ts">
  import { REFERENCE_ROWS, REFERENCE_RULES } from "./conversion-guide.js";
</script>

<section
  aria-labelledby="reference-fields-heading"
  class="rounded-2xl border border-theme-border/60 bg-theme-surface/50 p-6 space-y-4"
>
  <h2
    id="reference-fields-heading"
    class="font-header font-bold text-2xl text-theme-text"
  >
    Adventure JSON reference fields
  </h2>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -- Keyboard users need to scroll the table. -->
  <div
    role="region"
    aria-label="Reference fields table"
    tabindex="0"
    class="overflow-x-auto"
  >
    <table class="w-full text-left text-sm text-theme-text">
      <thead>
        <tr>
          <th scope="col" class="p-2">Field</th>
          <th scope="col" class="p-2">Allowed target</th>
          <th scope="col" class="p-2">Cardinality</th>
          <th scope="col" class="p-2">Meaning</th>
        </tr>
      </thead>
      <tbody>
        {#each REFERENCE_ROWS as row (row.path)}
          <tr class="border-t border-theme-border/60">
            <th scope="row" class="p-2 font-mono text-xs">{row.path}</th>
            <td class="p-2">{row.target}</td>
            <td class="p-2">{row.cardinality}</td>
            <td class="p-2">{row.meaning}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#each REFERENCE_RULES as rule (rule)}
    <p class="text-sm leading-relaxed text-theme-text">{rule}</p>
  {/each}
</section>

<script
  lang="ts"
  generics="T extends { id: string; source: import('generator-engine').PrepSource }"
>
  import PrepAiTag from "./PrepAiTag.svelte";
  import { autosize } from "./prep-autosize";
  import {
    prepAddClass,
    prepFieldClass,
    prepRemoveClass,
  } from "./prep-field-styles";

  interface ItemField {
    key: Extract<keyof T, string>;
    label: string;
    multiline?: boolean;
    wide?: boolean;
  }

  let {
    items = $bindable(),
    fields,
    noun,
    locked,
    create,
  }: {
    items: T[];
    fields: ItemField[];
    noun: string;
    locked: boolean;
    create: () => T;
  } = $props();

  const gridClass = $derived(
    fields.length > 1 ? "grid flex-1 gap-1.5 @lg:grid-cols-3" : "grid flex-1",
  );

  const classFor = (field: ItemField) =>
    [
      prepFieldClass,
      field.multiline ? "resize-none" : "",
      field.wide ? "@lg:col-span-2" : "",
    ].join(" ");

  const valueOf = (item: T, field: ItemField) => String(item[field.key] ?? "");

  function update(item: T, field: ItemField, event: Event) {
    const target = event.currentTarget as
      HTMLInputElement | HTMLTextAreaElement;
    (item as Record<string, unknown>)[field.key] = target.value;
    item.source = "gm";
  }
</script>

{#snippet fieldInput(item: T, field: ItemField)}
  {#if field.multiline}
    <textarea
      value={valueOf(item, field)}
      oninput={(event) => update(item, field, event)}
      disabled={locked}
      {@attach autosize(() => valueOf(item, field))}
      rows="1"
      placeholder={field.label}
      aria-label={field.label}
      class={classFor(field)}
    ></textarea>
  {:else}
    <input
      value={valueOf(item, field)}
      oninput={(event) => update(item, field, event)}
      disabled={locked}
      placeholder={field.label}
      aria-label={field.label}
      class={classFor(field)}
    />
  {/if}
{/snippet}

<ul class="space-y-2">
  {#each items as item, index (item.id)}
    <li class="flex items-start gap-1.5">
      <div class={gridClass}>
        {#each fields as field (field.key)}
          {@render fieldInput(item, field)}
        {/each}
      </div>
      <PrepAiTag source={item.source} />
      <button
        type="button"
        onclick={() => (items = items.filter((_, i) => i !== index))}
        disabled={locked}
        class={prepRemoveClass}
        aria-label={`Remove ${noun.toLowerCase()}`}
        title="Remove"
      >
        <span class="icon-[lucide--trash-2] h-3.5 w-3.5" aria-hidden="true"
        ></span>
      </button>
    </li>
  {/each}
</ul>
<button
  type="button"
  onclick={() => (items = [...items, create()])}
  disabled={locked}
  class={prepAddClass}
>
  <span class="icon-[lucide--plus] h-3.5 w-3.5" aria-hidden="true"></span>
  Add {noun.toLowerCase()}
</button>

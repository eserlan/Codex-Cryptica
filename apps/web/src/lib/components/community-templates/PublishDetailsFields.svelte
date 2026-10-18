<script lang="ts">
  import { ENTITY_TEMPLATE_PUBLIC_LIMITS as PUBLIC_LIMITS } from "schema";

  /** The description, labels and display name fields of the publish form. */
  let {
    description = $bindable(""),
    labelText = $bindable(""),
    displayName = $bindable(""),
    labelCount,
  }: {
    description: string;
    labelText: string;
    displayName: string;
    labelCount: number;
  } = $props();

  const field =
    "mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text";
</script>

<div>
  <label class="text-sm text-theme-text" for="publish-description"
    >Description</label
  >
  <textarea
    id="publish-description"
    bind:value={description}
    rows="3"
    class={field}
    placeholder="What is this template good for?"
  ></textarea>
  <p
    class="text-right text-xs text-theme-muted"
    data-testid="description-counter"
  >
    {description.trim().length}/{PUBLIC_LIMITS.descriptionMax}
  </p>
</div>

<div>
  <label class="text-sm text-theme-text" for="publish-labels"
    >Labels (genre or game system)</label
  >
  <input
    id="publish-labels"
    bind:value={labelText}
    class={field}
    placeholder="Fantasy, Pathfinder"
  />
  <p class="text-right text-xs text-theme-muted" data-testid="labels-counter">
    {labelCount}/{PUBLIC_LIMITS.labelsMax} labels
  </p>
</div>

<div>
  <label class="text-sm text-theme-text" for="publish-display-name"
    >Display name (optional)</label
  >
  <input
    id="publish-display-name"
    bind:value={displayName}
    class={field}
    placeholder="Shown as the author"
  />
</div>

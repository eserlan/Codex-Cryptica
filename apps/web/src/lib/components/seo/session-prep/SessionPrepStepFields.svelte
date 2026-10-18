<script lang="ts">
  import {
    CONSEQUENCE_KEYS,
    defaultIdFactory,
    type PrepConsequences,
    type SessionPrep,
    type SessionPrepStep,
  } from "generator-engine";
  import SessionPrepItemList from "./SessionPrepItemList.svelte";
  import SessionPrepClueList from "./SessionPrepClueList.svelte";
  import { prepFieldClass } from "./prep-field-styles";
  import { autosize } from "./prep-autosize";

  let {
    prep = $bindable(),
    step,
    locked,
    aiDisabled,
    bottlenecks,
    routesInFlight,
    routeErrors,
    onSuggestRoutes,
  }: {
    prep: SessionPrep;
    step: SessionPrepStep;
    locked: boolean;
    aiDisabled: boolean;
    bottlenecks: Set<string>;
    routesInFlight: string | null;
    routeErrors: Record<string, string | undefined>;
    onSuggestRoutes: (clueId: string) => void;
  } = $props();

  const CONSEQUENCE_LABELS: Record<keyof PrepConsequences, string> = {
    success: "If they succeed",
    failure: "If they fail",
    delay: "If they delay",
    avoidance: "If they avoid it",
  };

  const newItem = () => ({ id: defaultIdFactory(), source: "gm" as const });
</script>

{#if step === "start"}
  <textarea
    bind:value={prep.start}
    {@attach autosize(() => prep.start)}
    disabled={locked}
    rows="2"
    aria-label="Where play begins"
    class="{prepFieldClass} resize-none"
  ></textarea>
{:else if step === "pressure"}
  <textarea
    bind:value={prep.pressure}
    {@attach autosize(() => prep.pressure)}
    disabled={locked}
    rows="2"
    aria-label="Tonight's pressure"
    class="{prepFieldClass} resize-none"
  ></textarea>
{:else if step === "people"}
  <SessionPrepItemList
    bind:items={prep.people}
    fields={[
      { key: "name", label: "Name" },
      { key: "wants", label: "Wants", multiline: true },
      { key: "doesNext", label: "Does next", multiline: true },
    ]}
    noun="Person"
    {locked}
    create={() => ({ ...newItem(), name: "", wants: "", doesNext: "" })}
  />
{:else if step === "places"}
  <SessionPrepItemList
    bind:items={prep.places}
    fields={[
      { key: "name", label: "Place" },
      {
        key: "detail",
        label: "What is playable there",
        multiline: true,
        wide: true,
      },
    ]}
    noun="Place"
    {locked}
    create={() => ({ ...newItem(), name: "", detail: "" })}
  />
{:else if step === "information"}
  <SessionPrepClueList
    bind:clues={prep.information}
    {locked}
    {aiDisabled}
    {bottlenecks}
    {routesInFlight}
    {routeErrors}
    {onSuggestRoutes}
  />
{:else if step === "complications"}
  <SessionPrepItemList
    bind:items={prep.complications}
    fields={[{ key: "text", label: "Complication", multiline: true }]}
    noun="Complication"
    {locked}
    create={() => ({ ...newItem(), text: "" })}
  />
{:else if step === "consequences"}
  <div class="grid gap-1.5 @md:grid-cols-2">
    {#each CONSEQUENCE_KEYS as key (key)}
      <textarea
        bind:value={prep.consequences[key]}
        {@attach autosize(() => prep.consequences[key])}
        rows="1"
        disabled={locked}
        placeholder={CONSEQUENCE_LABELS[key]}
        aria-label={CONSEQUENCE_LABELS[key]}
        class="{prepFieldClass} resize-none"
      ></textarea>
    {/each}
  </div>
{:else if step === "reserve"}
  <SessionPrepItemList
    bind:items={prep.reserve}
    fields={[{ key: "text", label: "Reserve item", multiline: true }]}
    noun="Reserve item"
    {locked}
    create={() => ({ ...newItem(), text: "" })}
  />
{/if}

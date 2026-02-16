<script lang="ts">
  import type { DiscoveredEntity } from "@codex/importer";
  import { vault } from "$lib/stores/vault.svelte";

  interface Props {
    entities: DiscoveredEntity[];
    onSave: (entities: DiscoveredEntity[]) => void;
    onCancel: () => void;
  }

  let { entities = [], onSave, onCancel }: Props = $props();

  let _selectedIds = $state(new Set<string>());
  let _lastEntities = $state<DiscoveredEntity[]>([]);

  $effect(() => {
    // Only re-initialize if the entities ARRAY identity has changed
    if (entities !== _lastEntities && entities.length > 0) {
      const initialSelection = new Set<string>();
      for (const entity of entities) {
        if (!entity.matchedEntityId) {
          initialSelection.add(entity.id);
        }
      }
      _selectedIds = initialSelection;
      _lastEntities = entities;
    }
  });

  const isExisting = (entity: DiscoveredEntity) => {
    return !!entity.matchedEntityId;
  };

  const getExistingTitle = (entity: DiscoveredEntity) => {
    if (!entity.matchedEntityId) return "";
    return vault.entities[entity.matchedEntityId]?.title || "";
  };

  const toggleSelection = (id: string) => {
    const next = new Set(_selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    _selectedIds = next;
  };

  const handleSave = () => {
    const toSave = entities.filter((e) => _selectedIds.has(e.id));
    onSave(toSave);
  };
</script>

<div class="review-list">
  <div class="header-row">
    <h3>Review Identified Entities</h3>
    <div class="selection-actions">
      <button
        class="text-link"
        onclick={() => (_selectedIds = new Set(entities.map((e) => e.id)))}
        >Select All</button
      >
      <button class="text-link" onclick={() => (_selectedIds = new Set())}
        >Deselect All</button
      >
    </div>
  </div>

  <div class="entities">
    {#each entities as entity}
      <div class="entity-card" class:existing={isExisting(entity)}>
        <label>
          <input
            type="checkbox"
            checked={_selectedIds.has(entity.id)}
            onchange={() => toggleSelection(entity.id)}
          />

          <div class="info">
            <div class="title-group">
              <strong>{entity.suggestedTitle}</strong>

              {#if isExisting(entity)}
                <span
                  class="existing-badge"
                  title="Matching entity found in vault"
                >
                  Already in Vault{#if getExistingTitle(entity) && getExistingTitle(entity).toLowerCase() !== entity.suggestedTitle.toLowerCase()}:
                    {getExistingTitle(entity)}{/if}
                </span>
              {/if}
            </div>

            <span class="badge">{entity.suggestedType}</span>
          </div>
        </label>

        <div class="preview">
          {(entity.chronicle || entity.content || "").slice(0, 100)}...
        </div>
      </div>
    {/each}
  </div>

  <div class="actions">
    <button onclick={onCancel}>Cancel</button>
    <button
      class="primary"
      onclick={handleSave}
      disabled={_selectedIds.size === 0}
    >
      Import {_selectedIds.size} Items
    </button>
  </div>
</div>

<style>
  .review-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 60vh;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .selection-actions {
    display: flex;
    gap: 0.5rem;
  }

  .text-link {
    background: none;
    border: none;
    color: var(--theme-primary, #3b82f6);
    font-size: 0.65rem;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    text-transform: none;
    letter-spacing: normal;
  }

  .entities {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-right: 0.5rem;
  }

  .entity-card {
    border: 1px solid var(--theme-border, #ccc);
    padding: 1rem;
    border-radius: 4px;
    background: var(--theme-surface, #fff);
    transition: opacity 0.2s;
  }

  .entity-card.existing {
    border-color: var(--theme-primary, #3b82f6);
    background: var(--theme-primary-transparent, rgba(59, 130, 246, 0.05));
  }

  label {
    display: flex;
    gap: 1rem;
    cursor: pointer;
  }

  .info {
    display: flex;
    flex-grow: 1;
    justify-content: space-between;
    align-items: center;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .existing-badge {
    font-size: 0.6rem;
    background: var(--theme-primary, #3b82f6);
    color: var(--theme-bg, #fff);
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    font-weight: bold;
    text-transform: uppercase;
  }

  .badge {
    background: var(--theme-bg, #f3f4f6);
    color: var(--theme-text, #1f2937);
    border: 1px solid var(--theme-border, #d1d5db);
    padding: 0.1rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
  }

  .preview {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: var(--theme-muted, #666);
    font-family: var(--font-mono, monospace);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--theme-border, #eee);
  }

  button {
    background: var(--theme-surface);
    border: 1px solid var(--theme-border);
    color: var(--theme-text);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  button.primary {
    background: var(--theme-primary, #3b82f6);
    color: var(--theme-bg, #fff);
    border: none;
  }

  button.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:hover:not(:disabled) {
    opacity: 0.8;
  }
</style>

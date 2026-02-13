<script lang="ts">
  import type { DiscoveredEntity } from "@codex/importer";

  interface Props {
    entities: DiscoveredEntity[];
    onSave: (entities: DiscoveredEntity[]) => void;
    onCancel: () => void;
  }

  let { entities = [], onSave, onCancel }: Props = $props();

  let _selectedIds = $state(new Set(entities.map((e) => e.id)));

  $effect(() => {
    _selectedIds = new Set(entities.map((e) => e.id));
  });

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
  <h3>Review Identified Entities</h3>

  <div class="entities">
    {#each entities as entity}
      <div class="entity-card">
        <label>
          <input
            type="checkbox"
            checked={_selectedIds.has(entity.id)}
            onchange={() => toggleSelection(entity.id)}
          />
          <div class="info">
            <strong>{entity.suggestedTitle}</strong>
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
    <button class="primary" onclick={handleSave}>
      Import {_selectedIds.size} Items
    </button>
  </div>
</div>

<style>
  .review-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 50vh;
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

  .badge {
    background: var(--theme-primary, #3b82f6);
    color: var(--theme-bg, #fff);
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

  button:hover {
    opacity: 0.8;
  }
</style>

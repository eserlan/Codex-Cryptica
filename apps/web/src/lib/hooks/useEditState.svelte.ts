import type { Entity } from "schema";
import { vault as defaultVault } from "../stores/vault.svelte";

/**
 * Minimal interface describing the vault capabilities that `createEditState`
 * depends on.  Accepting this as an optional parameter (rather than importing
 * the global singleton directly) makes the hook independently testable without
 * needing to mock the full `VaultStore`.
 */
export interface VaultLike {
  readonly selectedEntityId: string | null;
  readonly entities: Record<string, any>;
  loadEntityContent(id: string): Promise<void>;
}

export function createEditState(
  _initialEntity: Entity | null,
  vaultInstance: VaultLike = defaultVault,
) {
  let isEditing = $state(false);
  let editTitle = $state(_initialEntity?.title ?? "");
  let editContent = $state(_initialEntity?.content || "");
  let editLore = $state(_initialEntity?.lore || "");
  let editType = $state(_initialEntity?.type ?? "");
  let editImage = $state(_initialEntity?.image || "");
  let editDate = $state<Entity["date"]>(_initialEntity?.date);
  let editStartDate = $state<Entity["start_date"]>(_initialEntity?.start_date);
  let editEndDate = $state<Entity["end_date"]>(_initialEntity?.end_date);

  function start(entity: Entity) {
    editTitle = entity.title;
    editContent = entity.content || "";
    editLore = entity.lore || "";
    editType = entity.type;
    editImage = entity.image || "";
    editDate = entity.date;
    editStartDate = entity.start_date;
    editEndDate = entity.end_date;
    isEditing = true;

    // Ensure content is fully loaded from Dexie before the editor opens.
    // If the entity was populated from the graph-entity cache the content
    // field will be ""; loadEntityContent fills it in reactively.
    const entityId = entity.id;
    vaultInstance
      .loadEntityContent(entityId)
      .then(() => {
        // Guard against the user closing the panel or switching entity while
        // the Dexie read was in flight.
        if (!isEditing || vaultInstance.selectedEntityId !== entityId) return;
        const fresh = vaultInstance.entities[entityId];
        if (fresh) {
          editContent = fresh.content || "";
          editLore = fresh.lore || "";
        }
      })
      .catch(console.warn);
  }

  function cancel() {
    isEditing = false;
  }

  return {
    get isEditing() {
      return isEditing;
    },
    set isEditing(v) {
      isEditing = v;
    },
    get title() {
      return editTitle;
    },
    set title(v) {
      editTitle = v;
    },
    get content() {
      return editContent;
    },
    set content(v) {
      editContent = v;
    },
    get lore() {
      return editLore;
    },
    set lore(v) {
      editLore = v;
    },
    get type() {
      return editType;
    },
    set type(v) {
      editType = v;
    },
    get image() {
      return editImage;
    },
    set image(v) {
      editImage = v;
    },
    get date() {
      return editDate;
    },
    set date(v) {
      editDate = v;
    },
    get startDate() {
      return editStartDate;
    },
    set startDate(v) {
      editStartDate = v;
    },
    get endDate() {
      return editEndDate;
    },
    set endDate(v) {
      editEndDate = v;
    },
    start,
    cancel,
  };
}

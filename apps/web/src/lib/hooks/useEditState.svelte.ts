import type { Entity } from "schema";

export function createEditState(_initialEntity: Entity | null) {
  let isEditing = $state(false);
  let editTitle = $state("");
  let editContent = $state("");
  let editLore = $state("");
  let editType = $state("");
  let editImage = $state("");
  let editDate = $state<Entity["date"]>();
  let editStartDate = $state<Entity["start_date"]>();
  let editEndDate = $state<Entity["end_date"]>();

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

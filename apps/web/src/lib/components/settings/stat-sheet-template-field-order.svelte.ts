import type { StatSheetTemplate } from "schema";
import { statSheetTemplates } from "#lib/stores/stat-sheet-templates.svelte.js";

type Templates = Pick<
  typeof statSheetTemplates,
  "allTemplates" | "updateTemplateFields"
>;

function scheduleFieldFocus(key: string) {
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>(
        `[data-template-field-id="${key}"] [data-testid="stat-sheet-template-drag-handle"]`,
      )
      ?.focus();
  });
}

/** Shared by this panel's previews, including while individual previews are collapsed. */
export class StatSheetTemplateFieldOrder {
  draggedFieldKey = $state<string | null>(null);
  dragOverFieldKey = $state<string | null>(null);
  selectedTemplateFieldKey = $state<string | null>(null);

  constructor(
    private readonly templates: Templates = statSheetTemplates,
    private readonly focusField: (key: string) => void = scheduleFieldFocus,
  ) {}

  isSelected(templateId: string, fieldId: string) {
    return this.selectedTemplateFieldKey === `${templateId}-${fieldId}`;
  }

  rowClass(template: StatSheetTemplate, index: number) {
    const key = `${template.id}-${index}`;
    if (!template.isBuiltIn && this.draggedFieldKey === key)
      return "opacity-40 border-dashed border-theme-primary";
    if (!template.isBuiltIn && this.dragOverFieldKey === key)
      return "border-theme-primary bg-theme-primary/10";
    if (this.isSelected(template.id, template.fields[index].id))
      return "border-theme-primary bg-theme-primary/10 ring-2 ring-theme-primary/40";
    return "";
  }

  handleFieldDragStart(e: DragEvent, templateId: string, index: number) {
    this.draggedFieldKey = `${templateId}-${index}`;
    const fieldId = this.templates.allTemplates.find((t) => t.id === templateId)
      ?.fields[index]?.id;
    if (fieldId) this.selectedTemplateFieldKey = `${templateId}-${fieldId}`;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `${templateId}:${index}`);
    }
  }

  handleFieldDragOver(e: DragEvent, templateId: string, index: number) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    const key = `${templateId}-${index}`;
    if (this.dragOverFieldKey !== key) {
      this.dragOverFieldKey = key;
    }
  }

  async handleFieldDrop(
    e: DragEvent,
    template: StatSheetTemplate,
    targetIndex: number,
  ) {
    e.preventDefault();
    if (
      !this.draggedFieldKey ||
      !this.draggedFieldKey.startsWith(`${template.id}-`)
    ) {
      this.draggedFieldKey = null;
      this.dragOverFieldKey = null;
      return;
    }

    const sourceIndex = Number(this.draggedFieldKey.split("-").pop());
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) {
      this.draggedFieldKey = null;
      this.dragOverFieldKey = null;
      return;
    }

    const nextFields = [...template.fields];
    const [moved] = nextFields.splice(sourceIndex, 1);
    nextFields.splice(targetIndex, 0, moved);

    this.draggedFieldKey = null;
    this.dragOverFieldKey = null;
    this.selectedTemplateFieldKey = `${template.id}-${moved.id}`;
    await this.templates.updateTemplateFields(template.id, nextFields);
  }

  handleFieldDragEnd() {
    this.draggedFieldKey = null;
    this.dragOverFieldKey = null;
  }

  async moveTemplateField(
    template: StatSheetTemplate,
    index: number,
    direction: -1 | 1,
  ) {
    const target = index + direction;
    if (target < 0 || target >= template.fields.length) return;
    const movedId = template.fields[index].id;
    this.selectedTemplateFieldKey = `${template.id}-${movedId}`;
    const nextFields = [...template.fields];
    [nextFields[index], nextFields[target]] = [
      nextFields[target],
      nextFields[index],
    ];
    await this.templates.updateTemplateFields(template.id, nextFields);

    this.focusField(`${template.id}-${movedId}`);
  }

  handleTemplateFieldKeyDown(
    e: KeyboardEvent,
    template: StatSheetTemplate,
    index: number,
  ) {
    if ((e.altKey || e.ctrlKey) && e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      void this.moveTemplateField(template, index, -1);
    } else if ((e.altKey || e.ctrlKey) && e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      void this.moveTemplateField(template, index, 1);
    }
  }

  handleTemplateContainerKeyDown(
    e: KeyboardEvent,
    template: StatSheetTemplate,
  ) {
    if (
      (e.altKey || e.ctrlKey) &&
      (e.key === "ArrowUp" || e.key === "ArrowDown")
    ) {
      if (
        !this.selectedTemplateFieldKey ||
        !this.selectedTemplateFieldKey.startsWith(`${template.id}-`)
      )
        return;
      const fieldId = this.selectedTemplateFieldKey.slice(
        template.id.length + 1,
      );
      const index = template.fields.findIndex((f) => f.id === fieldId);
      if (index === -1) return;
      e.preventDefault();
      e.stopPropagation();
      void this.moveTemplateField(
        template,
        index,
        e.key === "ArrowUp" ? -1 : 1,
      );
    }
  }
}

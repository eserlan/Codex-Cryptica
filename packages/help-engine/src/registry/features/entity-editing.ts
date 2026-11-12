import type { FeatureEntry } from "../schema";

export const entityEditing: FeatureEntry = {
  id: "entity-editing",
  title: "Creating and Editing Entities",
  summary:
    "Create entries with + Create. Edit them with Edit in the header, then Save changes. AI revise description for text and GM notes is in the More menu in the side panel or Zen mode, or use /revise in chat. Review the draft before Apply Changes.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["entity-detail"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "ai-revisions",
      title: "AI-assisted revisions of text and GM notes",
      steps: [
        "Open More in the header of the side panel or Zen mode and choose AI revise description. Zen mode also has it below the text.",
        "In Revise Description, optionally add AI Instructions / Corrections, then click Revise. Cancel closes the dialog without generating a revision.",
        "Review the text and GM notes draft. Apply Changes saves it; Discard keeps the original. Review lore changes may ask which sections to keep.",
        "Alternatively, use /revise in Lore Oracle chat for the selected entity.",
        "AI revisions are unavailable in guest or demo vaults. A failed revision leaves existing text unchanged.",
      ],
      actionIds: ["entity-editing.open-help"],
    },
    {
      id: "create-an-entity",
      title: "Create a new entity",
      steps: [
        "Click + Create in the header.",
        "Choose a category, such as Character or Location.",
        "Type a title and save.",
      ],
      actionIds: ["entity-editing.open-help"],
    },
    {
      id: "edit-an-entity",
      title: "Edit an entity",
      steps: [
        "Open the entity.",
        "Click Edit in the header of the side panel or Zen mode.",
        "Change what you need, then click Save changes.",
      ],
      actionIds: ["entity-editing.open-help"],
    },
  ],
  helpIds: ["creating-and-editing-entities"],
  related: ["entity-connections"],
  actions: [
    {
      id: "entity-editing.open-help",
      action: {
        type: "openHelp",
        helpId: "creating-and-editing-entities",
        label: "Read: Creating and editing entities",
      },
    },
  ],
};

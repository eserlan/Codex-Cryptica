import type { FeatureEntry } from "../schema";

export const entityEditing: FeatureEntry = {
  id: "entity-editing",
  title: "Creating and Editing Entities",
  summary:
    "Create a character, location or other entry with the + Create button, then use EDIT on its page to change it. SAVE CHANGES keeps your edits and CANCEL discards them.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["entity-detail"],
  kinds: "any",
  tabs: [],
  workflows: [
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
        "Click EDIT at the bottom of its page.",
        "Change what you need, then click SAVE CHANGES.",
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

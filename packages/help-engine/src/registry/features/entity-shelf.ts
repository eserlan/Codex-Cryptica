import type { FeatureEntry } from "../schema";

export const entityShelf: FeatureEntry = {
  id: "entity-shelf",
  title: "The Shelf",
  summary:
    "The Shelf carries entries from one vault into another in this browser. Send entries to it, switch vaults, then tick them and choose Import into this vault. It never overwrites anything, it is not a backup, and it does not reach other devices or people.",
  channel: "production",
  // Matched by the flag, not by these; they are labels for a panel that sits
  // beside every screen.
  routes: ["/(app)"],
  areas: ["other"],
  kinds: "any",
  tabs: [],
  whenFlag: "shelf-open",
  workflows: [
    {
      id: "put-on-the-shelf",
      title: "Put entries on the Shelf",
      steps: [
        "Open an entry and choose Send to Shelf in its header, or select several in the graph or the table, right-click and choose Send to Shelf.",
        "Shelving only reads: the vault you shelved from is not changed.",
      ],
      actionIds: ["entity-shelf.open-help"],
    },
    {
      id: "bring-into-another-vault",
      title: "Bring entries into another vault",
      steps: [
        "Switch to the vault you want the entries in.",
        "Open the Shelf from the sidebar and tick the entries you want.",
        "Choose Import into this vault. Entries stay on the Shelf, so you can import them into other vaults too.",
      ],
      actionIds: ["entity-shelf.open-help"],
    },
  ],
  helpIds: ["entity-shelf"],
  related: ["archive-import", "entity-editing"],
  actions: [
    {
      id: "entity-shelf.open-help",
      action: {
        type: "openHelp",
        helpId: "entity-shelf",
        label: "Read: The Shelf",
      },
    },
  ],
};

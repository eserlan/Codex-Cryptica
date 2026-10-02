import type { FeatureEntry } from "../schema";

/**
 * Connections are added from the Status tab; the Connections tab is a
 * read-only one-step picture (see help article `connections-tab`).
 */
export const entityConnections: FeatureEntry = {
  id: "entity-connections",
  title: "Entity Connections",
  summary:
    "Link one entity to another and describe how they relate. Add and edit connections on the Status tab, from the graph, or via chat commands; the Connections tab shows them as a picture.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["entity-detail"],
  kinds: "any",
  tabs: ["status", "connections"],
  workflows: [
    {
      id: "add-connection",
      title: "Connect this entity to another",
      steps: [
        "Open the Status tab.",
        "Under Connections, choose Add.",
        "Pick the entity to connect to, then choose how they relate.",
      ],
      actionIds: ["connections.add-guide", "connections.open-connections"],
    },
    {
      id: "see-connections",
      title: "See what this entity is linked to",
      steps: ["Open the Connections tab to see everything one step away."],
      actionIds: ["connections.open-connections"],
    },
    {
      id: "review-proposals",
      title: "Review suggested connections",
      steps: [
        "Open an entity's detail panel.",
        "Check suggested connections from the Lore Oracle at the bottom.",
        "Click the checkmark to accept and create a suggested connection.",
      ],
      actionIds: [],
    },
  ],
  helpIds: ["connections-tab", "connection-labels", "proposer-guide"],
  related: ["graph-view"],
  actions: [
    {
      id: "connections.add-guide",
      action: {
        type: "openPanel",
        panel: "status-tab",
        label: "Open the Status tab",
        then: {
          type: "highlight",
          target: "add-connection-button",
          label: "Add a connection here",
        },
      },
    },
    {
      id: "connections.open-connections",
      action: {
        type: "openPanel",
        panel: "connections-tab",
        label: "Open the Connections tab",
      },
    },
  ],
};

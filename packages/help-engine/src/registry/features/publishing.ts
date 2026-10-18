import type { FeatureEntry } from "../schema";

export const publishing: FeatureEntry = {
  id: "publishing",
  title: "Share and Publish a World",
  summary:
    "Publish a read-only, player-safe snapshot of your world from Settings, in the Publishing tab, and send players the link. GM-only and private material is left out. Listing in Explore Worlds is a separate opt-in. This is different from a backup.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["settings"],
  kinds: "any",
  tabs: ["publishing"],
  workflows: [
    {
      id: "publish-a-snapshot",
      title: "Share a read-only copy with your players",
      steps: [
        "Open Settings, then the Publishing tab.",
        "Under Player-Safe Snapshot Hosting, click Publish Guest Snapshot.",
        "Check the Publish Preview counts of what is included and left out, then click Publish Snapshot.",
        "When the upload finishes in the background, copy the shareable link and send it to your players.",
      ],
      actionIds: ["publishing.open-settings", "publishing.open-help"],
    },
    {
      id: "update-or-unpublish",
      title: "Update or take down a published snapshot",
      steps: [
        "Open Settings, then the Publishing tab.",
        "Click Publish Update to share your latest changes.",
        "Click Unpublish & Delete to remove the snapshot and make the link stop working.",
      ],
      actionIds: ["publishing.open-settings"],
    },
    {
      id: "list-in-explore-worlds",
      title: "List your world in Explore Worlds (optional)",
      steps: [
        "Publish a snapshot first: listing needs an active Shared Link.",
        "In Public Listing, enter a title, a short description and at least one label. A cover image is optional.",
        "Click List Publicly. Delist World removes the listing but keeps the Shared Link working.",
      ],
      actionIds: ["publishing.open-settings"],
    },
  ],
  helpIds: ["publishing"],
  related: ["backup-and-restore"],
  actions: [
    {
      id: "publishing.open-settings",
      action: {
        type: "openPanel",
        panel: "settings-publishing",
        label: "Open Publishing settings",
      },
    },
    {
      id: "publishing.open-help",
      action: {
        type: "openHelp",
        helpId: "publishing",
        label: "Read: Sharing and Publishing Worlds",
      },
    },
  ],
};

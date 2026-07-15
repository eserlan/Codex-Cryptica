export const entityDetailTabs = [
  "status",
  "lore",
  "map",
  "chats",
  "family",
  "timeline",
] as const;

export type EntityDetailTab = (typeof entityDetailTabs)[number];

export type EntityDetailTabIds = {
  tabIds: Record<EntityDetailTab, string>;
  panelIds: Record<EntityDetailTab, string>;
};

export function createEntityDetailTabIds(prefix: string): EntityDetailTabIds {
  return {
    tabIds: Object.fromEntries(
      entityDetailTabs.map((tab) => [tab, `${prefix}-tab-${tab}`]),
    ) as Record<EntityDetailTab, string>,
    panelIds: Object.fromEntries(
      entityDetailTabs.map((tab) => [tab, `${prefix}-panel-${tab}`]),
    ) as Record<EntityDetailTab, string>,
  };
}

export function getNextEntityDetailTab(
  currentTab: EntityDetailTab,
  key: "ArrowLeft" | "ArrowRight" | "Home" | "End",
): EntityDetailTab {
  return getNextEntityDetailTabInList(entityDetailTabs, currentTab, key);
}

export function getNextEntityDetailTabInList(
  tabs: readonly EntityDetailTab[],
  currentTab: EntityDetailTab,
  key: "ArrowLeft" | "ArrowRight" | "Home" | "End",
): EntityDetailTab {
  if (tabs.length === 0) {
    return currentTab;
  }

  if (key === "Home") {
    return tabs[0];
  }

  if (key === "End") {
    return tabs[tabs.length - 1];
  }

  const currentIndex = tabs.indexOf(currentTab);
  const direction = key === "ArrowRight" ? 1 : -1;
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeIndex + direction + tabs.length) % tabs.length;

  return tabs[nextIndex];
}

export function getTemporalLabel(
  type: string,
  field: "date" | "start" | "end",
): string {
  const t = type.toLowerCase();
  if (field === "date") return "Occurrence";
  if (field === "start") {
    if (["npc", "creature", "character", "monster"].some((x) => t.includes(x)))
      return "Born";
    if (
      ["faction", "location", "city", "organization", "guild"].some((x) =>
        t.includes(x),
      )
    )
      return "Founded";
    if (["item", "artifact", "object", "weapon"].some((x) => t.includes(x)))
      return "Created";
    return "Started";
  }
  if (field === "end") {
    if (["npc", "creature", "character", "monster"].some((x) => t.includes(x)))
      return "Died";
    if (
      ["faction", "location", "city", "organization", "guild"].some((x) =>
        t.includes(x),
      )
    )
      return "Dissolved";
    if (["item", "artifact", "object", "weapon"].some((x) => t.includes(x)))
      return "Destroyed";
    return "Ended";
  }
  return "Date";
}

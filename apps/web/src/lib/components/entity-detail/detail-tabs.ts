export const entityDetailTabs = ["status", "lore", "inventory", "map"] as const;

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
  if (key === "Home") {
    return entityDetailTabs[0];
  }

  if (key === "End") {
    return entityDetailTabs[entityDetailTabs.length - 1];
  }

  const currentIndex = entityDetailTabs.indexOf(currentTab);
  const direction = key === "ArrowRight" ? 1 : -1;
  const nextIndex =
    (currentIndex + direction + entityDetailTabs.length) %
    entityDetailTabs.length;

  return entityDetailTabs[nextIndex];
}

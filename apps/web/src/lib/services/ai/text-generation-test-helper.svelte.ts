export function createReactiveHistory() {
  const history = $state([{ role: "user", content: "Original" }]);
  return history;
}

export function createReactiveTarget() {
  const target = $state({
    title: "OriginalTarget",
    type: "npc",
    content: "body",
    lore: "lore",
  });
  return target;
}

export function createReactiveSources() {
  const sources = $state([
    { title: "OriginalSource", type: "npc", content: "body", lore: "lore" },
  ]);
  return sources;
}

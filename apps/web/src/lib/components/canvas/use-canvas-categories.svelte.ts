export function useCanvasCategories() {
  let activeCategories = $state(new Set<string>());

  function toggleCategoryFilter(categoryId: string) {
    if (activeCategories.has(categoryId)) {
      activeCategories.delete(categoryId);
    } else {
      activeCategories.add(categoryId);
    }
    // Re-assign to trigger Svelte 5 reactivity for Sets if needed
    activeCategories = new Set(activeCategories);
  }

  function clearCategoryFilters() {
    activeCategories = new Set();
  }

  return {
    get activeCategories() {
      return activeCategories;
    },
    toggleCategoryFilter,
    clearCategoryFilters,
  };
}

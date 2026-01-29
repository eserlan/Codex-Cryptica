class UIStore {
    showSettings = $state(false);
    showCategoryManager = $state(false);

    openSettings() {
        this.showSettings = true;
    }

    closeSettings() {
        this.showSettings = false;
    }

    toggleSettings() {
        this.showSettings = !this.showSettings;
    }

    openCategoryManager() {
        this.showCategoryManager = true;
        this.showSettings = false; // Close settings when opening manager
    }

    closeCategoryManager() {
        this.showCategoryManager = false;
    }
}

export const uiStore = new UIStore();

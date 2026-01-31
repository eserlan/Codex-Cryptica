export type SettingsTab = "vault" | "sync" | "intelligence" | "schema" | "about" | "help";

class UIStore {
    showSettings = $state(false);
    activeSettingsTab = $state<SettingsTab>("vault");
    globalError = $state<{ message: string; stack?: string } | null>(null);

    // Read Mode State (Standardized to what's on GitHub, but supporting both naming conventions)
    showReadModal = $state(false);
    readModalEntityId = $state<string | null>(null);

    // Aliases for compatibility with remote branch code
    get readModeNodeId() { return this.readModalEntityId; }
    set readModeNodeId(value: string | null) { this.readModalEntityId = value; }

    setGlobalError(message: string, stack?: string) {
        this.globalError = { message, stack };
    }

    clearGlobalError() {
        this.globalError = null;
    }

    openSettings(tab: SettingsTab = "vault") {
        this.activeSettingsTab = tab;
        this.showSettings = true;
    }

    closeSettings() {
        this.showSettings = false;
    }

    toggleSettings(tab: SettingsTab = "vault") {
        if (this.showSettings && this.activeSettingsTab === tab) {
            this.showSettings = false;
        } else {
            this.activeSettingsTab = tab;
            this.showSettings = true;
        }
    }

    openReadModal(entityId: string) {
        this.readModalEntityId = entityId;
        this.showReadModal = true;
    }

    closeReadModal() {
        this.showReadModal = false;
        this.readModalEntityId = null;
    }

    // Compatibility methods for remote branch
    openReadMode(nodeId: string) {
        this.openReadModal(nodeId);
    }

    closeReadMode() {
        this.closeReadModal();
    }
}

export const uiStore = new UIStore();
export const ui = uiStore;

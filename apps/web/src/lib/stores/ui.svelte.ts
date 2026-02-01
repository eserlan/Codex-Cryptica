export type SettingsTab = "vault" | "sync" | "intelligence" | "schema" | "aesthetics" | "about" | "help";

class UIStore {
    showSettings = $state(false);
    activeSettingsTab = $state<SettingsTab>("vault");
    globalError = $state<{ message: string; stack?: string } | null>(null);

    // Zen Mode State
    showZenMode = $state(false);
    zenModeEntityId = $state<string | null>(null);

    // Compatibility aliases (can be deprecated later)
    /** @deprecated Use zenModeEntityId */
    get readModeNodeId() { return this.zenModeEntityId; }
    set readModeNodeId(value: string | null) { this.zenModeEntityId = value; }
    /** @deprecated Use showZenMode */
    get showReadModal() { return this.showZenMode; }

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

    openZenMode(entityId: string) {
        this.zenModeEntityId = entityId;
        this.showZenMode = true;
    }

    closeZenMode() {
        this.showZenMode = false;
        this.zenModeEntityId = null;
    }

    // Compatibility methods
    openReadModal(entityId: string) {
        this.openZenMode(entityId);
    }

    closeReadModal() {
        this.closeZenMode();
    }

    openReadMode(nodeId: string) {
        this.openZenMode(nodeId);
    }

    closeReadMode() {
        this.closeZenMode();
    }
}

export const uiStore = new UIStore();
export const ui = uiStore;

export type VTTModeMenuPosition = {
  x: number;
  y: number;
};

class VTTModeMenuStore {
  isOpen = $state(false);
  position = $state<VTTModeMenuPosition>({ x: 0, y: 0 });

  openAt(position: VTTModeMenuPosition) {
    this.position = position;
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }
}

const KEY = "__codex_vtt_mode_menu__";

export const vttModeMenu: VTTModeMenuStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new VTTModeMenuStore());

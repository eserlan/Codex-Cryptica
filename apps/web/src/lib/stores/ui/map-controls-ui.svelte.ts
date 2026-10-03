/**
 * Whether the map's secondary controls are revealed on phones. Closed by
 * default so the map stays visible; desktop and tablet always show them.
 */
export class MapControlsUIStore {
  open = $state(false);

  toggle() {
    this.open = !this.open;
  }

  close() {
    this.open = false;
  }
}

export const mapControlsUIStore = new MapControlsUIStore();

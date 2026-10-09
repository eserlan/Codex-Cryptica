/**
 * Map screen UI state that is not part of the map itself.
 *
 * - `open`: whether the map's secondary controls are revealed on phones.
 *   Closed by default so the map stays visible; larger screens always show
 *   them.
 * - `showEncounters`: the Encounter Snapshots dialog is open. Lives here, not
 *   in the button that opens it, so the help assistant can open it too.
 * - `maximized`: hides the app header, navigation and footer so the map uses
 *   all available space. Session-only; it never survives leaving the map.
 */
export class MapControlsUIStore {
  open = $state(false);
  maximized = $state(false);
  showEncounters = $state(false);

  toggle() {
    this.open = !this.open;
  }

  close() {
    this.open = false;
  }

  toggleMaximized() {
    this.maximized = !this.maximized;
  }
}

export const mapControlsUIStore = new MapControlsUIStore();

import { mapStore } from "../../stores/map.svelte";
import { mapSession } from "../../stores/map-session.svelte";
import {
  getKeyboardViewportUpdate,
  getZoomViewportUpdate,
  isClickGesture,
  shouldIgnoreMapKeyboardEvent,
} from "./map-view-helpers";
import type { MapFogPainter } from "./map-fog-painter";
import {
  createMapInteractionHandlers,
  type MapInteractionHandlerOverrides,
  type MapInteractionHandlers,
} from "./interactions/map-interaction-handler-factory";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

type MapInputEvent = MouseEvent | PointerEvent;

export class MapInteractionManager {
  painter: MapFogPainter;
  getContainer: () => HTMLElement | null;
  tokenSelection!: MapInteractionHandlers["tokenSelection"];
  tokenDrag!: MapInteractionHandlers["tokenDrag"];
  tokenRotation!: MapInteractionHandlers["tokenRotation"];
  pinInteractions!: MapInteractionHandlers["pinInteractions"];
  gridInteractions!: MapInteractionHandlers["gridInteractions"];
  measurementInteractions!: MapInteractionHandlers["measurementInteractions"];
  contextMenuInteractions!: MapInteractionHandlers["contextMenuInteractions"];
  tokenResize!: MapInteractionHandlers["tokenResize"];
  boxSelection!: MapInteractionHandlers["boxSelection"];
  fogInteractions!: MapInteractionHandlers["fogInteractions"];
  creationInteractions!: MapInteractionHandlers["creationInteractions"];

  isPanning = $state(false);
  lastMousePos = $state({ x: 0, y: 0 });
  mouseDownPos = { x: 0, y: 0 };
  isAltPressed = $state(false);
  isPointerOver = $state(false);
  get gridFitStart() {
    return this.gridInteractions.gridFitStart;
  }
  get gridFitEnd() {
    return this.gridInteractions.gridFitEnd;
  }
  get boxSelectStart() {
    return this.boxSelection.start;
  }
  get boxSelectEnd() {
    return this.boxSelection.end;
  }
  get pinDragState() {
    return this.pinInteractions.dragState;
  }
  get contextMenu() {
    return this.contextMenuInteractions.contextMenu;
  }
  set contextMenu(value) {
    this.contextMenuInteractions.contextMenu = value;
  }
  selectedPinId = $state<string | null>(null);
  healthBarPopoverTokenId = $state<string | null>(null);
  mapAnnouncement = $state("");

  cachedRect: DOMRect | null = null;
  private activePointerId: number | null = null;
  KEYBOARD_PAN_STEP = 50;
  KEYBOARD_ZOOM_STEP = 0.1;

  visualBrushRadius = $derived(mapStore.brushRadius * mapStore.viewport.zoom);

  constructor(
    opts: {
      painter: MapFogPainter;
      getContainer: () => HTMLElement | null;
    } & MapInteractionHandlerOverrides,
  ) {
    this.painter = opts.painter;
    this.getContainer = opts.getContainer;
    Object.assign(this, createMapInteractionHandlers(this.painter, opts));
  }

  updateCachedRect() {
    const el = this.getContainer();
    if (el) {
      this.cachedRect = el.getBoundingClientRect();
    }
  }

  onKeyDown = (event: KeyboardEvent) => {
    if (shouldIgnoreMapKeyboardEvent(event.target as HTMLElement)) {
      return;
    }

    const { key, altKey } = event;
    this.isAltPressed = altKey;
    const viewport = mapStore.viewport;

    if (!viewport) return;

    if (
      altKey &&
      (key === "ArrowLeft" || key === "ArrowRight") &&
      this.tokenRotation.rotateByStep(key === "ArrowRight" ? 1 : -1)
    ) {
      this.mapAnnouncement = `Token rotated ${key === "ArrowRight" ? "clockwise" : "counterclockwise"}`;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const update = getKeyboardViewportUpdate(key, viewport, {
      panStep: this.KEYBOARD_PAN_STEP,
      zoomStep: this.KEYBOARD_ZOOM_STEP,
    });

    if (update) {
      mapStore.updateViewport(update.pan, update.zoom);
      this.mapAnnouncement = update.announcement;
      event.preventDefault();
      event.stopPropagation();
    }
  };

  onGlobalKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && this.gridInteractions.commitGridMove()) {
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      if (this.gridInteractions.cancelGridMove()) {
        return;
      }
      if (this.gridInteractions.cancelGridFit()) {
        return;
      }
      if (this.boxSelectStart) {
        this.boxSelection.clear();
        return;
      }
      if (mapSession.selectedTokens.size > 1) {
        mapSession.clearSelection();
        return;
      }
    }
  };

  onKeyUp = (event: KeyboardEvent) => {
    this.isAltPressed = event.altKey;
  };

  private handlePointerDown = (e: MapInputEvent) => {
    const target = e.target as Element | null;
    if (
      target?.closest(
        'button, input, select, textarea, a, [role="dialog"], [data-sidebar], .pointer-events-auto',
      )
    ) {
      return;
    }

    if ("pointerId" in e) {
      if (
        this.activePointerId !== null &&
        this.activePointerId !== e.pointerId
      ) {
        return;
      }
      this.activePointerId = e.pointerId;
      const container = this.getContainer();
      if (container?.setPointerCapture) {
        container.setPointerCapture(e.pointerId);
      }
    }

    this.contextMenuInteractions.clear();
    this.updateCachedRect();
    if (this.cachedRect) {
      this.lastMousePos = {
        x: e.clientX - this.cachedRect.left,
        y: e.clientY - this.cachedRect.top,
      };
    }
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
    this.isAltPressed = e.altKey;

    if (
      e.button === 0 &&
      mapSession.vttEnabled &&
      this.cachedRect &&
      this.tokenRotation.begin(this.lastMousePos)
    ) {
      e.preventDefault();
      this.isPanning = false;
      return;
    }

    if (this.cachedRect && this.boxSelection.begin(this.lastMousePos, e)) {
      e.preventDefault();
      this.isPanning = false;
      return;
    }

    if (mapSession.vttEnabled && this.cachedRect) {
      const hitToken = this.tokenDrag.begin(this.lastMousePos);

      if (hitToken) {
        this.tokenSelection.applyModifierSelection(hitToken.id, e);
        this.isPanning = false;
        return;
      }
    }

    if (this.cachedRect && e.button === 0 && !e.altKey) {
      const clickedPin = this.pinInteractions.begin(this.lastMousePos);

      if (clickedPin) {
        this.isPanning = false;
        return;
      }
    }

    if (this.cachedRect && this.gridInteractions.shouldStartGridMove()) {
      e.preventDefault();
      e.stopPropagation();
      this.isPanning = true;
      return;
    }

    if (
      this.cachedRect &&
      this.gridInteractions.startGridFit(this.lastMousePos)
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (
      e.altKey &&
      this.fogInteractions.begin(
        { x: this.lastMousePos.x, y: this.lastMousePos.y },
        e.shiftKey || e.ctrlKey || e.metaKey,
      )
    ) {
      return;
    } else if (e.button === 0) {
      this.isPanning = true;
    }
  };

  onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
  onMouseDown = (e: MouseEvent) => this.handlePointerDown(e);

  private handlePointerMove = (e: MapInputEvent) => {
    if (
      "pointerId" in e &&
      this.activePointerId !== null &&
      e.pointerId !== this.activePointerId
    ) {
      return;
    }

    if (!this.cachedRect) this.updateCachedRect();
    if (!this.cachedRect) return;

    const mouseX = e.clientX - this.cachedRect.left;
    const mouseY = e.clientY - this.cachedRect.top;
    this.isAltPressed = e.altKey;

    if (this.boxSelectStart) {
      this.boxSelection.update({ x: mouseX, y: mouseY });
      this.lastMousePos = { x: mouseX, y: mouseY };
      return;
    }

    if (this.tokenDrag.dragState) {
      this.tokenDrag.move({ x: mouseX, y: mouseY });
      this.lastMousePos = { x: mouseX, y: mouseY };
      return;
    }

    if (this.tokenRotation.rotationState) {
      this.tokenRotation.move({ x: mouseX, y: mouseY });
      this.lastMousePos = { x: mouseX, y: mouseY };
      return;
    }

    if (this.pinDragState) {
      this.pinInteractions.move(
        { x: mouseX, y: mouseY },
        { x: this.mouseDownPos.x, y: this.mouseDownPos.y },
      );
      this.lastMousePos = { x: mouseX, y: mouseY };
      return;
    }

    if (this.gridFitStart) {
      this.gridInteractions.updateGridFit({ x: mouseX, y: mouseY });
      this.lastMousePos = { x: mouseX, y: mouseY };
      return;
    }

    if (
      this.fogInteractions.move(
        { x: mouseX, y: mouseY },
        e.shiftKey || e.ctrlKey || e.metaKey,
      )
    ) {
      this.lastMousePos = { x: mouseX, y: mouseY };
      return;
    } else if (
      !this.measurementInteractions.updateLiveEnd({ x: mouseX, y: mouseY }) &&
      this.isPanning &&
      !this.isAltPressed
    ) {
      // Keep a tap from nudging the map on touch screens. Once the pointer
      // crosses the click threshold, use the original down position so the
      // first real drag movement is preserved.
      if (
        isClickGesture(
          { x: this.mouseDownPos.x, y: this.mouseDownPos.y },
          { x: mouseX, y: mouseY },
        )
      ) {
        return;
      }

      const dx = mouseX - this.lastMousePos.x;
      const dy = mouseY - this.lastMousePos.y;
      mapStore.updateViewport(
        { x: mapStore.viewport.pan.x + dx, y: mapStore.viewport.pan.y + dy },
        mapStore.viewport.zoom,
      );
    }
    this.lastMousePos = { x: mouseX, y: mouseY };
  };

  onPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
  onMouseMove = (e: MouseEvent) => this.handlePointerMove(e);

  onMouseEnter = () => {
    this.isPointerOver = true;
    this.updateCachedRect();
  };

  onMouseLeave = () => {
    this.isPointerOver = false;
  };

  private handlePointerUp = async (e: MapInputEvent) => {
    if (
      "pointerId" in e &&
      this.activePointerId !== null &&
      e.pointerId !== this.activePointerId
    ) {
      return;
    }

    try {
      await this.fogInteractions.finish();

      if (this.boxSelection.commit()) {
        return;
      }

      if (this.tokenDrag.dragState) {
        this.tokenDrag.end();
        this.isPanning = false;
        return;
      }

      if (this.tokenRotation.rotationState) {
        this.tokenRotation.end();
        this.isPanning = false;
        return;
      }

      if (this.pinDragState) {
        const result = await this.pinInteractions.end(
          { x: this.mouseDownPos.x, y: this.mouseDownPos.y },
          { x: e.clientX, y: e.clientY },
        );

        if (result.type === "selected") {
          this.selectedPinId = result.pinId;
        }
        this.isPanning = false;
        return;
      }

      if (this.gridInteractions.commitGridFit()) {
        return;
      }

      if (this.isPanning) {
        if (
          isClickGesture(
            { x: this.mouseDownPos.x, y: this.mouseDownPos.y },
            { x: e.clientX, y: e.clientY },
          )
        ) {
          this.handleMapClick(e);
        }
      }
      this.isPanning = false;
    } finally {
      if ("pointerId" in e) {
        this.activePointerId = null;
      }
    }
  };

  onPointerUp = (e: PointerEvent) => this.handlePointerUp(e);
  onPointerCancel = (e: PointerEvent) => this.handlePointerUp(e);
  onMouseUp = (e: MouseEvent) => this.handlePointerUp(e);

  handleMapClick = (e: MouseEvent) => {
    const el = this.getContainer();
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mapSession.vttEnabled) {
      const hitToken = this.tokenSelection.hitTest({ x, y });

      if (hitToken) {
        this.tokenSelection.selectToken(hitToken.id);
        this.selectedPinId = null;
        return;
      }

      this.tokenSelection.clearSelection();
      this.healthBarPopoverTokenId = null;
      this.measurementInteractions.handleClick({ x, y });
      return;
    }

    const clickedPin = this.pinInteractions.selectAt({ x, y });

    if (clickedPin) {
      this.selectedPinId = clickedPin.id;
    } else {
      this.selectedPinId = null;
    }
  };

  onDoubleClick = (e: MouseEvent) => {
    this.contextMenuInteractions.clear();
    const el = this.getContainer();
    if (!el) return;

    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.closest(
        'button, input, select, textarea, a, [role="dialog"], [data-sidebar], .pointer-events-auto',
      )
    ) {
      return;
    }

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mapSession.vttEnabled) {
      const hitToken = this.tokenSelection.hitTest({ x, y });
      if (hitToken) {
        this.healthBarPopoverTokenId =
          this.healthBarPopoverTokenId === hitToken.id ? null : hitToken.id;
        return;
      }
    }

    this.creationInteractions.handleDoubleClick({ x, y });
  };

  onContextMenu = (e: MouseEvent) => {
    if (this.gridFitStart) {
      this.gridInteractions.cancelGridFit();
      return;
    }

    const el = this.getContainer();
    if (!mapSession.vttEnabled || !el) return;
    e.preventDefault();

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.contextMenuInteractions.open({ x: e.clientX, y: e.clientY }, { x, y });
  };

  onWheel = (e: WheelEvent) => {
    const canResize =
      mapSession.vttEnabled &&
      mapStore.isGMMode &&
      !sessionModeStore.isGuestMode;
    const el = this.getContainer();

    if (e.shiftKey && canResize) {
      if (!el) return;
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (this.tokenResize.resizeAt({ x: mouseX, y: mouseY }, e.deltaY)) {
        return;
      }
    }

    e.preventDefault();
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const update = getZoomViewportUpdate({
      mouse: { x: mouseX, y: mouseY },
      canvasSize: mapStore.canvasSize,
      viewport: mapStore.viewport,
      deltaY: e.deltaY,
      altHeld: e.altKey,
    });

    mapStore.updateViewport(update.pan, update.zoom);
    this.mapAnnouncement = update.announcement;
  };
}

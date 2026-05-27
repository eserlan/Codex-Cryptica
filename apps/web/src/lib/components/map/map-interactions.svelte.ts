import { mapStore } from "../../stores/map.svelte";
import { mapSession } from "../../stores/map-session.svelte";
import { vault } from "../../stores/vault.svelte";
import { p2pGuestService } from "../../cloud-bridge/p2p/guest-service";
import { p2pHost } from "../../cloud-bridge/p2p/host-service.svelte";
import { hitTestToken } from "$lib/utils/vtt-helpers";
import {
  findClickedPin,
  getKeyboardViewportUpdate,
  getZoomViewportUpdate,
  isClickGesture,
  shouldIgnoreMapKeyboardEvent,
} from "./map-view-helpers";
import type { MapFogPainter } from "./map-fog-painter";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

export class MapInteractionManager {
  painter: MapFogPainter;
  getContainer: () => HTMLElement | null;

  isPanning = $state(false);
  lastMousePos = $state({ x: 0, y: 0 });
  mouseDownPos = { x: 0, y: 0 };
  isAltPressed = $state(false);
  isPointerOver = $state(false);
  gridFitStart = $state<{ x: number; y: number } | null>(null);
  gridFitEnd = $state<{ x: number; y: number } | null>(null);
  boxSelectStart = $state<{ x: number; y: number } | null>(null);
  boxSelectEnd = $state<{ x: number; y: number } | null>(null);
  dragState = $state<{
    tokenId: string;
    offset: { x: number; y: number };
  } | null>(null);
  pinDragState = $state<{
    pinId: string;
    offset: { x: number; y: number };
  } | null>(null);
  contextMenu = $state<{
    x: number;
    y: number;
    imgX: number;
    imgY: number;
    tokenId?: string;
  } | null>(null);
  selectedPinId = $state<string | null>(null);
  mapAnnouncement = $state("");

  cachedRect: DOMRect | null = null;
  KEYBOARD_PAN_STEP = 50;
  KEYBOARD_ZOOM_STEP = 0.1;

  visualBrushRadius = $derived(mapStore.brushRadius * mapStore.viewport.zoom);

  constructor(opts: {
    painter: MapFogPainter;
    getContainer: () => HTMLElement | null;
  }) {
    this.painter = opts.painter;
    this.getContainer = opts.getContainer;
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
    if (event.key === "Enter" && mapSession.gridMoveMode) {
      event.preventDefault();
      const viewport = mapStore.viewport;
      const canvasSize = mapStore.canvasSize;
      mapStore.gridOffsetX =
        -((viewport.pan.x + canvasSize.width / 2) / viewport.zoom) %
        mapStore.gridSize;
      mapStore.gridOffsetY =
        -((viewport.pan.y + canvasSize.height / 2) / viewport.zoom) %
        mapStore.gridSize;
      mapSession.gridMoveMode = false;
      notificationStore.clearNotification();
      return;
    }
    if (event.key === "Escape") {
      if (mapSession.gridMoveMode) {
        mapSession.gridMoveMode = false;
        notificationStore.clearNotification();
        return;
      }
      if (mapSession.gridFitMode) {
        mapSession.gridFitMode = false;
        this.gridFitStart = null;
        this.gridFitEnd = null;
        return;
      }
      if (this.boxSelectStart) {
        this.boxSelectStart = null;
        this.boxSelectEnd = null;
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

  onMouseDown = (e: MouseEvent) => {
    this.contextMenu = null;
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
      mapStore.isGMMode &&
      (e.ctrlKey || e.metaKey) &&
      mapSession.vttEnabled &&
      this.cachedRect
    ) {
      e.preventDefault();
      this.boxSelectStart = { x: this.lastMousePos.x, y: this.lastMousePos.y };
      this.boxSelectEnd = this.boxSelectStart;
      this.isPanning = false;
      return;
    }

    if (mapSession.vttEnabled && this.cachedRect) {
      const hitToken = hitTestToken(
        mapSession.allTokens,
        (point) => mapStore.project(point),
        this.lastMousePos.x,
        this.lastMousePos.y,
      );

      if (
        hitToken &&
        mapSession.canMoveToken(
          hitToken.id,
          p2pGuestService.peerId,
          mapStore.isGMMode,
        )
      ) {
        const imgPoint = mapStore.unproject(this.lastMousePos);
        this.dragState = {
          tokenId: hitToken.id,
          offset: {
            x: imgPoint.x - hitToken.x,
            y: imgPoint.y - hitToken.y,
          },
        };
        mapSession.draggingTokenId = hitToken.id;
        if (e.ctrlKey || e.metaKey) {
          mapSession.addToSelection(hitToken.id);
        } else if (e.shiftKey) {
          if (mapSession.selectedTokens.has(hitToken.id)) {
            mapSession.removeFromSelection(hitToken.id);
          } else {
            mapSession.addToSelection(hitToken.id);
          }
        } else {
          mapSession.setSelection(hitToken.id);
        }
        this.isPanning = false;
        return;
      }
    }

    if (this.cachedRect && e.button === 0 && !e.altKey) {
      const clickedPin = findClickedPin(
        mapStore.pins,
        (point) => mapStore.project(point),
        this.lastMousePos.x,
        this.lastMousePos.y,
      );

      if (clickedPin) {
        const imgPoint = mapStore.unproject(this.lastMousePos);
        this.pinDragState = {
          pinId: clickedPin.id,
          offset: {
            x: imgPoint.x - clickedPin.coordinates.x,
            y: imgPoint.y - clickedPin.coordinates.y,
          },
        };
        this.isPanning = false;
        return;
      }
    }

    if (mapSession.gridMoveMode && mapStore.isGMMode && this.cachedRect) {
      e.preventDefault();
      e.stopPropagation();
      this.isPanning = true;
      return;
    }

    if (mapSession.gridFitMode && mapStore.isGMMode && this.cachedRect) {
      e.preventDefault();
      e.stopPropagation();
      this.gridFitStart = { x: this.lastMousePos.x, y: this.lastMousePos.y };
      this.gridFitEnd = this.gridFitStart;
      return;
    }

    if (mapStore.isGMMode && e.altKey) {
      this.painter.begin(
        { x: this.lastMousePos.x, y: this.lastMousePos.y },
        e.shiftKey || e.ctrlKey || e.metaKey,
      );
    } else if (e.button === 0) {
      this.isPanning = true;
    }
  };

  onMouseMove = (e: MouseEvent) => {
    if (!this.cachedRect) this.updateCachedRect();
    if (!this.cachedRect) return;

    const mouseX = e.clientX - this.cachedRect.left;
    const mouseY = e.clientY - this.cachedRect.top;
    this.isAltPressed = e.altKey;

    if (this.boxSelectStart) {
      this.boxSelectEnd = { x: mouseX, y: mouseY };
      this.lastMousePos = { x: mouseX, y: mouseY };
      return;
    }

    if (this.dragState) {
      const imgPoint = mapStore.unproject({ x: mouseX, y: mouseY });
      const nextX = imgPoint.x - this.dragState.offset.x;
      const nextY = imgPoint.y - this.dragState.offset.y;
      if (mapStore.isGMMode) {
        mapSession.moveToken(this.dragState.tokenId, nextX, nextY);
      } else {
        mapSession.requestTokenMove(this.dragState.tokenId, nextX, nextY, true);
        p2pGuestService.requestTokenMove(this.dragState.tokenId, nextX, nextY);
      }
      this.lastMousePos = { x: mouseX, y: mouseY };
      return;
    }

    if (this.pinDragState) {
      const imgPoint = mapStore.unproject({ x: mouseX, y: mouseY });
      const nextX = imgPoint.x - this.pinDragState.offset.x;
      const nextY = imgPoint.y - this.pinDragState.offset.y;
      mapStore.updatePinCoordinatesInMemory(this.pinDragState.pinId, {
        x: nextX,
        y: nextY,
      });
      this.lastMousePos = { x: mouseX, y: mouseY };
      return;
    }

    if (this.gridFitStart) {
      this.gridFitEnd = { x: mouseX, y: mouseY };
      this.lastMousePos = { x: mouseX, y: mouseY };
      return;
    }

    if (this.painter.isPainting) {
      this.painter.move(
        { x: mouseX, y: mouseY },
        e.shiftKey || e.ctrlKey || e.metaKey,
      );
    } else if (
      mapSession.measurement.active &&
      mapSession.measurement.start &&
      !mapSession.measurement.locked
    ) {
      const imgPoint = mapStore.unproject({ x: mouseX, y: mouseY });
      mapSession.setMeasurementEnd(imgPoint, true);
    } else if (this.isPanning && !this.isAltPressed) {
      const dx = mouseX - this.lastMousePos.x;
      const dy = mouseY - this.lastMousePos.y;
      mapStore.updateViewport(
        { x: mapStore.viewport.pan.x + dx, y: mapStore.viewport.pan.y + dy },
        mapStore.viewport.zoom,
      );
    }
    this.lastMousePos = { x: mouseX, y: mouseY };
  };

  onMouseEnter = () => {
    this.isPointerOver = true;
    this.updateCachedRect();
  };

  onMouseLeave = () => {
    this.isPointerOver = false;
  };

  onMouseUp = async (e: MouseEvent) => {
    if (this.painter.isPainting) {
      const finished = await this.painter.finish();
      if (
        finished &&
        mapStore.isGMMode &&
        !sessionModeStore.isGuestMode &&
        mapSession.vttEnabled
      ) {
        void p2pHost.broadcastActiveMapFogSync();
      }
    }

    if (this.boxSelectStart && this.boxSelectEnd && this.cachedRect) {
      const allTokens = mapSession.allTokens;
      const x1 = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
      const y1 = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
      const x2 = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
      const y2 = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);
      const minArea = 100;

      if ((x2 - x1) * (y2 - y1) > minArea) {
        const selected: string[] = [];
        for (const token of allTokens) {
          const projected = mapStore.project({ x: token.x, y: token.y });
          if (
            projected.x >= x1 &&
            projected.x <= x2 &&
            projected.y >= y1 &&
            projected.y <= y2
          ) {
            selected.push(token.id);
          }
        }
        mapSession.setMultiSelection(selected);
      }

      this.boxSelectStart = null;
      this.boxSelectEnd = null;
      return;
    }

    if (this.dragState) {
      if (!mapStore.isGMMode) {
        mapSession.confirmTokenMove(this.dragState.tokenId);
      }
      mapSession.draggingTokenId = null;
      this.dragState = null;
      this.isPanning = false;
      return;
    }

    if (this.pinDragState) {
      const pinId = this.pinDragState.pinId;
      this.pinDragState = null;
      await vault.saveMaps();

      if (
        isClickGesture(
          { x: this.mouseDownPos.x, y: this.mouseDownPos.y },
          { x: e.clientX, y: e.clientY },
        )
      ) {
        this.selectedPinId = pinId;
        const pin = mapStore.pins.find((p) => p.id === pinId);
        if (pin && pin.entityId) {
          vault.selectedEntityId = pin.entityId;
        }
      }
      this.isPanning = false;
      return;
    }

    if (this.gridFitStart && this.gridFitEnd && this.cachedRect) {
      const startImg = mapStore.unproject(this.gridFitStart);
      const endImg = mapStore.unproject(this.gridFitEnd);
      const imgWidth = Math.abs(endImg.x - startImg.x);
      const imgHeight = Math.abs(endImg.y - startImg.y);

      if (imgWidth >= 5 || imgHeight >= 5) {
        const cellSize = Math.round(Math.max(imgWidth, imgHeight));
        mapStore.gridSize = cellSize;
        const gridMinX = Math.min(startImg.x, endImg.x);
        const gridMinY = Math.min(startImg.y, endImg.y);
        mapStore.gridOffsetX = -(gridMinX % cellSize);
        mapStore.gridOffsetY = -(gridMinY % cellSize);
      }

      this.gridFitStart = null;
      this.gridFitEnd = null;
      mapSession.gridFitMode = false;
      mapSession.showGridSettings = true;
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
  };

  handleMapClick = (e: MouseEvent) => {
    const el = this.getContainer();
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mapSession.vttEnabled) {
      const hitToken = hitTestToken(
        mapSession.allTokens,
        (point) => mapStore.project(point),
        x,
        y,
      );

      if (hitToken) {
        mapSession.setSelection(hitToken.id);
        this.selectedPinId = null;
        return;
      }

      mapSession.setSelection(null);
      if (mapSession.measurement.active) {
        const imgCoords = mapStore.unproject({ x, y });
        if (!mapSession.measurement.start) {
          mapSession.setMeasurementStart(imgCoords);
        } else if (!mapSession.measurement.locked) {
          mapSession.setMeasurementEnd(imgCoords);
          mapSession.setMeasurementLocked(true);
        } else {
          mapSession.setMeasurementStart(imgCoords);
        }
      }
      return;
    }

    const clickedPin = findClickedPin(
      mapStore.pins,
      (point) => mapStore.project(point),
      x,
      y,
    );

    if (clickedPin) {
      this.selectedPinId = clickedPin.id;
      if (clickedPin.entityId) {
        vault.selectedEntityId = clickedPin.entityId;
      }
    } else {
      this.selectedPinId = null;
    }
  };

  onDoubleClick = (e: MouseEvent) => {
    this.contextMenu = null;
    const el = this.getContainer();
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const imgCoords = mapStore.unproject({ x, y });
    if (
      mapSession.vttEnabled &&
      mapStore.isGMMode &&
      !sessionModeStore.isGuestMode
    ) {
      mapSession.pendingTokenCoords = imgCoords;
    } else if (!mapSession.vttEnabled) {
      mapStore.pendingPinCoords = imgCoords;
    }
  };

  onContextMenu = (e: MouseEvent) => {
    if (this.gridFitStart) {
      this.gridFitStart = null;
      this.gridFitEnd = null;
      mapSession.gridFitMode = false;
      return;
    }

    const el = this.getContainer();
    if (!mapSession.vttEnabled || !el) return;
    e.preventDefault();

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitToken = hitTestToken(
      mapSession.allTokens,
      (point) => mapStore.project(point),
      x,
      y,
    );

    const imgCoords = mapStore.unproject({ x, y });
    this.contextMenu = {
      x: e.clientX,
      y: e.clientY,
      imgX: imgCoords.x,
      imgY: imgCoords.y,
      tokenId: hitToken?.id,
    };
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

      const hitToken = hitTestToken(
        mapSession.allTokens,
        (point) => mapStore.project(point),
        mouseX,
        mouseY,
      );

      if (hitToken) {
        const gridSize = mapStore.gridSize ?? 50;
        const currentScale = Math.round(hitToken.width / gridSize);
        let nextScale = currentScale + (e.deltaY < 0 ? 1 : -1);
        nextScale = Math.max(1, Math.min(4, nextScale));

        if (nextScale !== currentScale) {
          mapSession.updateToken(hitToken.id, {
            width: nextScale * gridSize,
            height: nextScale * gridSize,
          });
        }
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

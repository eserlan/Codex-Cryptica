import type { Core, NodeSingular } from "cytoscape";

export interface GraphEventHandlers {
  onNodeMouseOver?: (id: string, renderedPos: { x: number; y: number }) => void;
  onNodeMouseOut?: () => void;
  onNodeTap?: (id: string, node: NodeSingular) => void;
  onNodeDoubleTap?: (id: string, node: NodeSingular) => void;
  onEdgeTap?: (data: any) => void;
  onBackgroundTap?: () => void;
  onPositionChange?: (
    id: string,
    renderedPos: { x: number; y: number },
  ) => void;
  onViewportChange?: (id: string | null) => { x: number; y: number } | null;
}

export function setupGraphEvents(cy: Core, handlers: GraphEventHandlers) {
  const HOVER_DELAY = 800;
  let hoverTimeout: number | undefined;

  cy.on("mouseover", "node", (evt: any) => {
    const node = evt.target;
    clearTimeout(hoverTimeout);
    hoverTimeout = window.setTimeout(() => {
      const renderedPos = node.renderedPosition();
      handlers.onNodeMouseOver?.(node.id(), renderedPos);
    }, HOVER_DELAY);
  });

  cy.on("mouseout", "node", (_evt: any) => {
    clearTimeout(hoverTimeout);
    handlers.onNodeMouseOut?.();
  });

  cy.on("position", "node", (evt: any) => {
    const renderedPos = evt.target.renderedPosition();
    handlers.onPositionChange?.(evt.target.id(), renderedPos);
  });

  let lastLod: "low" | "medium" | "high" | null = null;

  const applyViewportPerformance = (notifyViewportChange: boolean) => {
    if (notifyViewportChange && handlers.onViewportChange) {
      handlers.onViewportChange(null);
    }

    if (
      typeof cy.zoom !== "function" ||
      typeof cy.batch !== "function" ||
      typeof cy.elements !== "function"
    ) {
      return;
    }

    // ⚡ LOD (Level of Detail) & Wheel Sensitivity Optimization
    const zoom = cy.zoom();

    // Dynamic wheel sensitivity scaling:
    // Zoomed out (e.g. 0.2) -> Higher sensitivity (up to 3.0) to stay responsive.
    // Zoomed in (e.g. 5.0) -> Lower sensitivity (down to 0.15) for precision.
    const dynamicSensitivity = Math.max(0.15, Math.min(3.0, 1.0 / zoom));
    if (typeof (cy as any).options === "function") {
      (cy as any).options({ wheelSensitivity: dynamicSensitivity });
    }

    let currentLod: typeof lastLod = "high";
    if (zoom < 0.2) currentLod = "low";
    else if (zoom < 0.5) currentLod = "medium";

    if (currentLod !== lastLod) {
      cy.batch(() => {
        if (currentLod === "low") {
          cy.elements().addClass("lod-low").removeClass("lod-medium");
        } else if (currentLod === "medium") {
          cy.elements().addClass("lod-medium").removeClass("lod-low");
        } else {
          cy.elements().removeClass("lod-low lod-medium");
        }
      });
      lastLod = currentLod;
    }
  };

  cy.on("pan zoom", () => applyViewportPerformance(true));
  applyViewportPerformance(false);

  cy.on("tap", "node", (evt: any) => {
    handlers.onNodeTap?.(evt.target.id(), evt.target);
  });

  cy.on("dblclick dbltap", "node", (evt: any) => {
    handlers.onNodeDoubleTap?.(evt.target.id(), evt.target);
  });

  cy.on("tap", "edge", (evt: any) => {
    handlers.onEdgeTap?.(evt.target.data());
  });

  cy.on("tap", (evt: any) => {
    if (evt.target === cy) {
      handlers.onBackgroundTap?.();
    }
  });

  return () => {
    clearTimeout(hoverTimeout);
    cy.off("mouseover mouseout position pan zoom tap dblclick dbltap");
  };
}

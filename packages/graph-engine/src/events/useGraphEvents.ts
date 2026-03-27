import type { Core, NodeSingular } from "cytoscape";

export interface GraphEventHandlers {
  onNodeMouseOver?: (id: string, renderedPos: { x: number; y: number }) => void;
  onNodeMouseOut?: () => void;
  onNodeTap?: (id: string, node: NodeSingular) => void;
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

  cy.on("pan zoom", () => {
    if (handlers.onViewportChange) {
      handlers.onViewportChange(null);
    }

    // ⚡ LOD (Level of Detail) Optimization
    const zoom = cy.zoom();
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
  });

  cy.on("tap", "node", (evt: any) => {
    handlers.onNodeTap?.(evt.target.id(), evt.target);
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
    cy.off("mouseover mouseout position pan zoom tap");
  };
}

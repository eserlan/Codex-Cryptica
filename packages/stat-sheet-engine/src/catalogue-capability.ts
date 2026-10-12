import type { SheetFieldProjector } from "./entity-sheet/capabilities";
import { projectCatalogueFields } from "./catalogue";

/**
 * The `stock-table` capability's projector (#3964). The GM sees the sheet as
 * it is; every other audience gets only the published player catalogue, so a
 * shop that is not published projects to nothing.
 */
export const STOCK_TABLE_PROJECTOR: SheetFieldProjector = (fields, context) =>
  context.audience === "gm" ? fields : projectCatalogueFields(fields);

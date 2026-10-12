import type { Entity, StatSheetField } from "schema";

/**
 * Gathers the words that shape a shop's suggested stock (#3965): the shop's
 * own text, and the text of the places it is connected to. Read-only; it
 * never changes an entity.
 */

const SHOP_TEXT_FIELDS = new Set([
  "speciality",
  "reputation",
  "funds",
  "services",
  "public_notices",
  "gm_notes",
]);
const PLACE_TYPE =
  /location|settlement|place|region|city|town|village|station|district|port/i;
const MAX_PLACES = 5;
const MAX_CONNECTIONS_INSPECTED = 50;
const MAX_CHARS = 1500;

const clip = (text: string | undefined): string =>
  (text ?? "").trim().slice(0, MAX_CHARS);

function sheetText(fields: readonly StatSheetField[]): string {
  return fields
    .filter(
      (field) =>
        SHOP_TEXT_FIELDS.has(field.id) &&
        (field.type === "text" || field.type === "longtext"),
    )
    .map((field) => clip(typeof field.value === "string" ? field.value : ""))
    .join("\n");
}

export interface ShopTextSources {
  shopText: string;
  placeText: string;
}

export function gatherShopText(
  shop: Pick<Entity, "title" | "content" | "lore" | "labels" | "connections">,
  fields: readonly StatSheetField[],
  entityById: (id: string) => Entity | undefined,
): ShopTextSources {
  const shopText = [
    shop.title,
    shop.labels.join(" "),
    clip(shop.content),
    clip(shop.lore),
    sheetText(fields),
  ].join("\n");

  const places: string[] = [];
  let inspected = 0;
  for (const connection of shop.connections) {
    if (places.length >= MAX_PLACES) break;
    if (inspected >= MAX_CONNECTIONS_INSPECTED) break;
    inspected += 1;
    const place = entityById(connection.target);
    if (!place || !PLACE_TYPE.test(place.type)) continue;
    places.push(
      [
        place.title,
        place.labels.join(" "),
        clip(place.content),
        clip(place.lore),
      ].join("\n"),
    );
  }
  return { shopText, placeText: places.join("\n") };
}

import type { MoneyAmount, StockMeta } from "schema";
import { parseMoney } from "./stock";
import { STOCK_KEY, ensureRowIds, type StockRow } from "./stock";

/**
 * Suggested opening stock for a shop (#3965). Pure, deterministic and
 * offline: the shop's own text and its settlement's text pick which goods
 * are plentiful, scarce or irrelevant, so context changes the stock itself
 * and not just the prose. Nothing is saved from here; the GM reviews the
 * proposal line by line and only accepted lines are added, after existing
 * rows, which are never rewritten.
 *
 * The prices are generic starting points and are always labelled as
 * suggestions, never as a published or official price list.
 */

export type StockGenre = "fantasy" | "sci-fi" | "generic";
export type Wealth = "poor" | "modest" | "comfortable" | "rich";
type Rarity = "common" | "uncommon" | "rare";

export const SUGGESTION_NOTE =
  "Suggested starting stock. Not an official price.";

interface CatalogueEntry {
  name: string;
  /** Themes this good belongs to; a match with the context makes it relevant. */
  tags: readonly string[];
  rarity: Rarity;
  /** Base price in whole units of the genre's currency. */
  price: number;
  kind?: "item" | "service";
  condition?: string;
}

const CURRENCY: Record<StockGenre, string> = {
  fantasy: "gp",
  "sci-fi": "cr",
  generic: "gp",
};

const entry = (
  name: string,
  tags: string,
  rarity: Rarity,
  price: number,
  extra: Partial<CatalogueEntry> = {},
): CatalogueEntry => ({
  name,
  tags: tags.split(" "),
  rarity,
  price,
  ...extra,
});

const FANTASY: readonly CatalogueEntry[] = [
  entry("Sack of barley", "grain farm food", "common", 1),
  entry("Smoked river fish", "fish food", "common", 2),
  entry("Salted cod", "fish salt food", "common", 2),
  entry("Block of rock salt", "salt", "common", 3),
  entry("Seasoned oak planks", "timber", "common", 4),
  entry("Hempen rope (50 ft)", "rope timber general", "common", 1),
  entry("Wool cloak", "cloth wool", "common", 5),
  entry("Bolt of linen", "cloth", "common", 6),
  entry("Iron nails (bag)", "iron tools mining", "common", 2),
  entry("Hand axe", "tools weapons timber", "common", 5),
  entry("Iron ingot", "iron mining", "uncommon", 10),
  entry("Steel dagger", "weapons iron", "common", 8),
  entry("Longsword", "weapons iron", "uncommon", 40, { condition: "Good" }),
  entry("Chain shirt", "armour iron", "rare", 150),
  entry("Healing salve", "herbs medicine", "common", 25),
  entry("Dried herbs (bundle)", "herbs medicine", "common", 2),
  entry("Antitoxin vial", "herbs medicine", "uncommon", 50),
  entry("Hooded lantern", "general fuel", "common", 8),
  entry("Lamp oil (flask)", "fuel general", "common", 1),
  entry("Candle (dozen)", "fuel general", "common", 1),
  entry("Livestock: goat", "livestock", "common", 5),
  entry("Riding horse", "livestock", "rare", 75),
  entry("Fine wine (bottle)", "luxury food", "uncommon", 20),
  entry("Silver ring", "luxury", "uncommon", 30),
  entry("Scroll of minor magic", "magic", "rare", 120),
  entry("Potion of vigour", "magic herbs", "rare", 90),
  entry("Backpack", "general", "common", 2),
  entry("Rations (1 day)", "food general", "common", 1),
  entry("Crowbar", "tools general", "common", 2),
  entry("Written letter of passage", "luxury general", "uncommon", 15, {
    kind: "service",
  }),
  entry("Repairs to gear", "tools iron general", "common", 3, {
    kind: "service",
  }),
];

const SCIFI: readonly CatalogueEntry[] = [
  entry("Ration packs (crate)", "food grain general", "common", 15),
  entry("Hydroponic produce", "farm food", "common", 8),
  entry("Fuel cell", "fuel general", "common", 40),
  entry("Reaction mass (tonne)", "fuel", "common", 120),
  entry("Salvaged plating", "salvage metal mining", "common", 30, {
    condition: "Scavenged",
  }),
  entry("Ore sample (refined)", "mining metal", "common", 60),
  entry("Structural alloy ingot", "metal mining", "uncommon", 140),
  entry("Hand tool kit", "tools general", "common", 25),
  entry("Plasma cutter", "tools salvage", "uncommon", 220),
  entry("Datapad", "electronics general", "common", 60),
  entry("Comms relay", "electronics", "uncommon", 180),
  entry("Navigation chip", "electronics luxury", "rare", 450),
  entry("Medkit", "medicine", "common", 80),
  entry("Rad-shield serum", "medicine", "uncommon", 200),
  entry("Stim injector (3 doses)", "medicine herbs", "uncommon", 120),
  entry("Pulse pistol", "weapons", "uncommon", 350),
  entry("Combat armour vest", "armour weapons", "rare", 600),
  entry("Environment suit", "armour general", "uncommon", 400),
  entry("Water filter", "general", "common", 45),
  entry("Fine spirits (bottle)", "luxury food", "uncommon", 70),
  entry("Antique jewellery", "luxury", "rare", 300),
  entry("Ship repair work", "tools salvage metal", "common", 250, {
    kind: "service",
  }),
  entry("Cargo hauling (per crate)", "general", "common", 30, {
    kind: "service",
  }),
];

const GENERIC: readonly CatalogueEntry[] = [
  entry("Basic provisions", "food grain fish farm general", "common", 1),
  entry("Everyday tools", "tools general", "common", 3),
  entry("Rope", "rope timber general", "common", 1),
  entry("Lamp and fuel", "fuel general", "common", 2),
  entry("Plain clothing", "cloth wool general", "common", 3),
  entry("Medicinal remedy", "medicine herbs", "common", 10),
  entry("Sturdy blade", "weapons iron", "uncommon", 20),
  entry("Fine goods", "luxury", "uncommon", 25),
  entry("Local specialities", "general", "common", 5),
  entry("Mending and repairs", "tools general", "common", 3, {
    kind: "service",
  }),
];

const CATALOGUES: Record<StockGenre, readonly CatalogueEntry[]> = {
  fantasy: FANTASY,
  "sci-fi": SCIFI,
  generic: GENERIC,
};

/** Words that put a text about a place or a shop into a theme. */
const THEME_WORDS: Record<string, RegExp> = {
  grain: /\b(grain|barley|wheat|harvest|bread|mill|flour)\w*/i,
  farm: /\b(farm|farming|crops?|fields?|orchards?|agricultur\w*|hydroponic\w*)\b/i,
  fish: /\b(fish\w*|fisher\w*|harbou?r|port|river|cod|herring|coast\w*)\b/i,
  salt: /\b(salt\w*|brine|saltern)\b/i,
  timber: /\b(timber|wood\w*|lumber|forest\w*|saw\s?mill\w*|oak|carpent\w*)\b/i,
  mining: /\b(mine\w*|mining|ore|quarr\w*|smelt\w*|foundry|iron works)\b/i,
  iron: /\b(iron|steel|smith\w*|forge\w*)\b/i,
  metal: /\b(alloy|metal|plating|ingots?)\b/i,
  cloth: /\b(cloth\w*|linen|tailor\w*|textile\w*|weav\w*|dyers?)\b/i,
  wool: /\b(wool\w*|sheep|shepherd\w*)\b/i,
  livestock: /\b(livestock|cattle|horses?|stables?|herds?|goats?)\b/i,
  herbs: /\b(herb\w*|apothecar\w*|alchem\w*|remed\w*)\b/i,
  medicine: /\b(medic\w*|clinic|healer\w*|surgeon\w*|hospital)\b/i,
  weapons:
    /\b(weapon\w*|armou?r\w*|swords?|blades?|soldiers?|garrison|militar\w*|mercenar\w*)\b/i,
  armour: /\b(armou?r\w*|mail|plate)\b/i,
  magic: /\b(magic\w*|arcane|enchant\w*|wizard\w*|spell\w*|mages?)\b/i,
  luxury:
    /\b(luxur\w*|jewel\w*|silk|wine|spice\w*|noble\w*|exclusive|boutique)\b/i,
  fuel: /\b(fuel|oil|lamp\w*|coal|reaction mass|refiner\w*)\b/i,
  tools: /\b(tool\w*|workshop|repair\w*|mechanic\w*|engineer\w*)\b/i,
  electronics: /\b(electronic\w*|data|comms?|circuit\w*|tech\w*|cyber\w*)\b/i,
  salvage: /\b(salvag\w*|scrap\w*|wreck\w*|scaveng\w*)\b/i,
  food: /\b(food|provision\w*|grocer\w*|kitchen|tavern|bakery|ration\w*)\b/i,
};

/** Which genre a pile of text reads as, when the GM has not said. */
const SCIFI_WORDS =
  /\b(sci-fi|science fiction|space opera|starport|spaceport|orbital?|station|credits?|starship|ship yard|asteroid|colony|cyber\w*|android|faster-than-light|hyperspace|reactor)\b/i;
const FANTASY_WORDS =
  /\b(fantasy|medieval|sword\w*|castle|kingdom|wizard\w*|dragon\w*|elves|elf|dwarf|dwarves|guild|tavern|temple|baron|duke|spell\w*|gold pieces?)\b/i;

const SCARCE_CUE =
  /\b(scarc\w*|short(?:age|ages)?|lack\w*|import\w*|blockad\w*|rationed?|shortfall|runs? out|cut off|in demand|dependen\w*|needs?)\b/i;
const PLENTY_CUE =
  /\b(plentiful|abundan\w*|surplus|export\w*|famous for|known for|produces?|rich in|specialis\w*|main industry)\b/i;

const WEALTH_CUES: Array<[Wealth, RegExp]> = [
  ["rich", /\b(wealthy|rich|lavish|opulent|prosperous|affluent)\b/i],
  ["poor", /\b(poor|impoverished|struggling|destitute|hard-up|penniless)\b/i],
  ["comfortable", /\b(comfortable|well-off|thriving|busy)\b/i],
];

export interface ShopContextInput {
  /** Explicit choice; otherwise it is read from the text. */
  genre?: StockGenre;
  /** The shop's own words: speciality, reputation, purchasing power, notes. */
  shopText?: string;
  /** Text from the settlement or place the shop sits in. */
  placeText?: string;
}

export interface ShopContext {
  genre: StockGenre;
  wealth: Wealth;
  /** Themes the shop is about, from its own text. */
  focus: string[];
  /** Themes the place makes easy to get. */
  plentiful: string[];
  /** Themes the place is short of or has to import. */
  scarce: string[];
}

function themesIn(text: string): string[] {
  return Object.entries(THEME_WORDS)
    .filter(([, pattern]) => pattern.test(text))
    .map(([theme]) => theme);
}

/**
 * Reads the shop and place text sentence by sentence: a theme in a sentence
 * about shortages or imports is scarce, one in a sentence about surplus or
 * exports is plentiful, and an unmarked mention counts as plentiful because
 * a place that mentions timber usually has it.
 */
function placeThemes(text: string): { plentiful: string[]; scarce: string[] } {
  const plentiful = new Set<string>();
  const scarce = new Set<string>();
  for (const sentence of text.split(/[.!?\n;]+/)) {
    const themes = themesIn(sentence);
    if (themes.length === 0) continue;
    const short = SCARCE_CUE.test(sentence);
    const plenty = PLENTY_CUE.test(sentence);
    for (const theme of themes) {
      if (short && !plenty) scarce.add(theme);
      else plentiful.add(theme);
    }
  }
  for (const theme of scarce) plentiful.delete(theme);
  return { plentiful: [...plentiful], scarce: [...scarce] };
}

export function inferGenre(text: string): StockGenre {
  const sci = (text.match(new RegExp(SCIFI_WORDS, "gi")) ?? []).length;
  const fan = (text.match(new RegExp(FANTASY_WORDS, "gi")) ?? []).length;
  if (sci === 0 && fan === 0) return "generic";
  return sci > fan ? "sci-fi" : "fantasy";
}

export function deriveShopContext(input: ShopContextInput): ShopContext {
  const shopText = input.shopText ?? "";
  const placeText = input.placeText ?? "";
  const all = `${shopText}\n${placeText}`;
  const place = placeThemes(placeText);
  const wealth =
    WEALTH_CUES.find(([, pattern]) => pattern.test(shopText))?.[0] ?? "modest";
  return {
    genre: input.genre ?? inferGenre(all),
    wealth,
    focus: themesIn(shopText),
    plentiful: place.plentiful,
    scarce: place.scarce,
  };
}

export interface ProposedStockLine {
  /** Stable within one proposal, so the review can track accept and edit. */
  key: string;
  name: string;
  stock: StockMeta;
  /** Why this line is here, in plain words, for the review. */
  reason: string;
  /** Theme tags that made the line relevant. */
  matched: string[];
}

export interface StockProposal {
  context: ShopContext;
  lines: ProposedStockLine[];
  /** One or two things that make this shop's stock interesting. */
  constraints: string[];
}

/** Small seeded generator so a proposal is repeatable and re-rollable. */
function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
};
const RARITY_QUANTITY: Record<Rarity, number> = {
  common: 8,
  uncommon: 3,
  rare: 1,
};
const WEALTH_RANK: Record<Wealth, number> = {
  poor: 0,
  modest: 1,
  comfortable: 2,
  rich: 2,
};

export interface ProposeOptions {
  /** Changes the pick without changing the rules. */
  seed?: string;
  /** How many lines to propose at most. */
  count?: number;
  /** Currency to use when the shop already prices things in one. */
  currency?: string;
  /** Decimal places the shop already prices in; suggestions match it. */
  precision?: number;
}

function scoreEntry(
  item: CatalogueEntry,
  context: ShopContext,
): { score: number; matched: string[] } {
  const matched = item.tags.filter(
    (tag) =>
      context.focus.includes(tag) ||
      context.plentiful.includes(tag) ||
      context.scarce.includes(tag),
  );
  let score = 0;
  for (const tag of item.tags) {
    if (context.focus.includes(tag)) score += 4;
    if (context.scarce.includes(tag)) score += 3;
    if (context.plentiful.includes(tag)) score += 2;
  }
  // A modest generic spread keeps a shop with no context coherent.
  if (item.tags.includes("general")) score += 1;
  return { score, matched };
}

function money(
  price: number,
  currency: string,
  precision: number,
): MoneyAmount {
  const units = Math.round(price * 10 ** precision);
  return { units: Math.max(1, units), currency, precision };
}

interface Supply {
  quantity: number;
  multiplier: number;
  reasons: string[];
}

/** How the place's supply moves a good's quantity and price, and why. */
function supplyFor(
  item: CatalogueEntry,
  context: ShopContext,
  matched: string[],
  quantity: number,
): Supply {
  const among = (themes: string[]) => matched.filter((m) => themes.includes(m));
  const reasons: string[] = [];
  let supply: Pick<Supply, "quantity" | "multiplier"> = {
    quantity,
    multiplier: 1,
  };
  if (item.tags.some((tag) => context.scarce.includes(tag))) {
    supply = {
      quantity: Math.max(1, Math.ceil(quantity / 3)),
      multiplier: 1.5,
    };
    reasons.push(
      `Scarce here (${among(context.scarce).join(", ")}), so few and dear`,
    );
  } else if (item.tags.some((tag) => context.plentiful.includes(tag))) {
    supply = { quantity: Math.ceil(quantity * 1.5), multiplier: 0.8 };
    reasons.push(
      `Plentiful locally (${among(context.plentiful).join(", ")}), so cheaper`,
    );
  }
  if (matched.some((m) => context.focus.includes(m))) {
    reasons.push("Matches what this shop is about");
  }
  if (reasons.length === 0)
    reasons.push("An everyday good for a shop like this");
  return { ...supply, reasons };
}

function lineFor(
  item: CatalogueEntry,
  context: ShopContext,
  matched: string[],
  currency: string,
  precision: number,
  random: () => number,
  key: string,
): ProposedStockLine {
  const baseQty = RARITY_QUANTITY[item.rarity];
  const swing = 1 + Math.floor(random() * Math.max(2, baseQty));
  const supply = supplyFor(item, context, matched, baseQty + swing - 1);

  const service = item.kind === "service";
  const stock: StockMeta = {
    kind: service ? "service" : "item",
    price: money(item.price * supply.multiplier, currency, precision),
    availability:
      supply.quantity <= 1 && supply.multiplier > 1 ? "reserved" : "available",
    note: SUGGESTION_NOTE,
  };
  if (!service) stock.quantity = supply.quantity;
  if (item.condition) stock.condition = item.condition;
  return {
    key,
    name: item.name,
    stock,
    reason: supply.reasons.join(". "),
    matched,
  };
}

function constraintsFor(
  context: ShopContext,
  lines: ProposedStockLine[],
): string[] {
  const out: string[] = [];
  const dear = lines.find((line) =>
    line.matched.some((tag) => context.scarce.includes(tag)),
  );
  if (dear) {
    const tag =
      dear.matched.find((m) => context.scarce.includes(m)) ?? "supplies";
    out.push(
      `Supplies of ${tag} are short here, so those goods are few and cost more.`,
    );
  }
  if (context.wealth === "poor") {
    out.push(
      "The shop is short of money: nothing rare, and few high-value goods.",
    );
  } else if (context.wealth === "rich") {
    out.push(
      "The shop can afford rare goods, and customers expect to pay for them.",
    );
  }
  return out.slice(0, 2);
}

/** Proposes opening stock for a shop. The same input and seed give the same result. */
export function proposeStock(
  context: ShopContext,
  options: ProposeOptions = {},
): StockProposal {
  const random = seeded(options.seed ?? "shop");
  const currency = options.currency?.trim() || CURRENCY[context.genre];
  const precision = Math.min(
    Math.max(Math.trunc(options.precision ?? 0), 0),
    6,
  );
  const maxRarity = WEALTH_RANK[context.wealth];
  const count = Math.min(Math.max(options.count ?? 8, 1), 16);

  const scored = CATALOGUES[context.genre]
    .filter((item) => RARITY_RANK[item.rarity] <= maxRarity)
    .map((item) => ({ item, ...scoreEntry(item, context) }))
    // Relevant goods first; the seed breaks ties and adds a little variety.
    .map((candidate) => ({
      ...candidate,
      rank: candidate.score + random() * 1.5,
    }))
    .sort((a, b) => b.rank - a.rank);

  const hasContext =
    context.focus.length + context.plentiful.length + context.scarce.length > 0;
  const chosen = scored
    .filter((candidate) => !hasContext || candidate.score > 0)
    .slice(0, count);

  const lines = chosen.map((candidate, index) =>
    lineFor(
      candidate.item,
      context,
      candidate.matched,
      currency,
      precision,
      random,
      `s${index}`,
    ),
  );
  return { context, lines, constraints: constraintsFor(context, lines) };
}

/** Lowercased, single-spaced, without a trailing plural "s", for matching. */
export function normaliseStockName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/s$/, "");
}

export type ReviewStatus = "new" | "duplicate";

export interface ReviewedLine extends ProposedStockLine {
  status: ReviewStatus;
  /** An existing Item whose title matches exactly; linking is the GM's choice. */
  itemMatch?: { id: string; title: string };
}

export interface ReviewOptions {
  /** Names of existing linked rows come from here. */
  resolveName?: (entityId: string) => string | undefined;
  /** Finds an existing Item by title. Never creates one. */
  findItem?: (title: string) => { id: string; title: string } | undefined;
}

/**
 * Marks which proposed lines are new and which the shop already stocks.
 * Duplicates are only flagged; the existing row is never touched.
 */
export function reviewProposal(
  existing: readonly StockRow[],
  lines: readonly ProposedStockLine[],
  options: ReviewOptions = {},
): ReviewedLine[] {
  const have = new Set<string>();
  for (const row of existing) {
    const own = typeof row.name === "string" ? row.name : "";
    const linked =
      typeof row.entityId === "string"
        ? options.resolveName?.(row.entityId)
        : "";
    for (const name of [own, linked ?? ""]) {
      if (name.trim()) have.add(normaliseStockName(name));
    }
  }
  return lines.map((line) => {
    const key = normaliseStockName(line.name);
    const duplicate = have.has(key);
    have.add(key);
    const match = duplicate ? undefined : options.findItem?.(line.name);
    return {
      ...line,
      status: duplicate ? "duplicate" : "new",
      ...(match ? { itemMatch: match } : {}),
    };
  });
}

export interface AcceptedLine {
  name: string;
  stock: StockMeta;
  /** Set only when the GM chose to link the matched Item. */
  linkItemId?: string;
}

/**
 * The shop's rows after adding the accepted lines. Existing rows are the same
 * objects in the same order, so their prices, quantities and notes survive.
 * Accepted lines already in the shop are skipped, so re-running never doubles
 * a line.
 */
export function applyAcceptedLines(
  existing: readonly StockRow[],
  accepted: readonly AcceptedLine[],
  options: ReviewOptions = {},
): StockRow[] {
  const fresh = reviewProposal(
    existing,
    accepted.map((line, index) => ({
      key: `a${index}`,
      name: line.name,
      stock: line.stock,
      reason: "",
      matched: [],
    })),
    options,
  );
  const rows: StockRow[] = [];
  fresh.forEach((line, index) => {
    if (line.status === "duplicate") return;
    const source = accepted[index];
    const row: StockRow = {
      name: source.name,
      [STOCK_KEY]: { ...source.stock },
    };
    if (source.linkItemId) row.entityId = source.linkItemId;
    rows.push(row);
  });
  // Only the new rows may gain ids; the shop's own rows are returned as they are.
  const withIds = ensureRowIds([...existing, ...rows]);
  return [...existing, ...withIds.slice(existing.length)];
}

/** The GM's typed changes to a proposed line, as the text they entered. */
export interface LineEdit {
  quantity?: string;
  price?: string;
}

function wholeNumber(
  text: string | undefined,
  min: number,
): number | undefined {
  if (text === undefined || text.trim() === "") return undefined;
  const value = Number(text);
  return Number.isSafeInteger(value) && value >= min ? value : undefined;
}

/** The proposed stock with the GM's edits applied; invalid text is ignored. */
export function editedStock(stock: StockMeta, edit: LineEdit = {}): StockMeta {
  const next: StockMeta = { ...stock };
  const quantity = wholeNumber(edit.quantity, 0);
  if (quantity !== undefined) next.quantity = quantity;
  if (edit.price !== undefined && next.price) {
    const price = parseMoney(
      edit.price,
      next.price.currency,
      next.price.precision,
    );
    if (price && price.units >= 1) next.price = price;
  }
  return next;
}

import type {
  StatSheet,
  StatSheetField,
  StatSheetTemplate,
  StockTradeRecord,
} from "schema";
import {
  SheetCapabilityRegistry,
  appendTradeRecord,
  completeTradeRecord,
  describeTrade,
  planTrade,
  planWalletChange,
  type DuplicateTrade,
  type SheetCapabilityDefinition,
  type TradePlan,
  type TradeCommand,
  type TradeErrorCode,
} from "@codex/stat-sheet-engine";

/**
 * Merchant trade service (#3963). Applies one explicit buy or sell to a
 * shop's stock ledger, optionally moving a wallet number on the other party.
 *
 * The vault saves each entity separately, so a two-entity trade cannot be a
 * single write. It uses a recoverable order instead:
 *
 *  1. Shop: new stock plus the trade logged as `pending` (one write).
 *  2. Other party: wallet balance plus the trade id on the wallet field
 *     (one write).
 *  3. Shop: the trade marked `complete` (one write).
 *
 * If step 2 fails, step 1 is undone. If anything after step 1 cannot be
 * finished or undone, the shop keeps the `pending` record and a retry with
 * the same trade id finishes the job without applying anything twice,
 * because the wallet carries the trade id too. Record-only trades are a
 * single write and need none of this.
 *
 * Nothing here runs unless a person confirms a trade.
 */

export const STOCK_TABLE_CAPABILITY: SheetCapabilityDefinition = {
  id: "stock-table",
  label: "Stock table",
  description:
    "A merchant stock ledger that can record explicit, confirmed trades.",
  categories: ["location", "faction", "organization"],
  actions: [
    {
      id: "purchase",
      label: "Sell to a customer",
      description: "A customer buys a stock line from the shop.",
      mutates: true,
    },
    {
      id: "sell",
      label: "Buy from a customer",
      description: "The shop buys goods from a customer.",
      mutates: true,
    },
  ],
};

export function createCommerceRegistry(): SheetCapabilityRegistry {
  const registry = new SheetCapabilityRegistry();
  registry.register(STOCK_TABLE_CAPABILITY);
  return registry;
}

export interface TradeEntity {
  id: string;
  title: string;
  statSheet?: StatSheet;
}

export interface MerchantTradeDeps {
  getEntity(id: string): TradeEntity | undefined;
  /** Saves one entity's sheet. Resolves false, or throws, when it was not saved. */
  saveSheet(id: string, statSheet: StatSheet): Promise<boolean>;
  getTemplate(templateId: string): StatSheetTemplate | undefined;
  registry: SheetCapabilityRegistry;
  publishCapture(payload: {
    entryType: string;
    content: string;
    sourceRef?: Record<string, unknown>;
  }): void;
  now(): string;
  isReadOnly(): boolean;
}

export type TradeOutcome =
  | {
      status: "done";
      record: StockTradeRecord;
      /** True when this trade was already finished; nothing was applied. */
      alreadyDone: boolean;
      message: string;
    }
  | {
      status: "rejected";
      code: TradeErrorCode | "not-allowed";
      message: string;
    }
  | { status: "failed"; message: string }
  | { status: "needs-recovery"; message: string }
  | { status: "in-progress"; message: string };

export interface TradeRequest {
  shopId: string;
  fieldId: string;
  command: TradeCommand;
}

const replaceField = (
  sheet: StatSheet,
  fieldId: string,
  next: StatSheetField,
): StatSheet => ({
  ...sheet,
  fields: sheet.fields.map((f) => (f.id === fieldId ? next : f)),
});

interface Shop {
  entity: TradeEntity;
  sheet: StatSheet;
  field: StatSheetField;
}

const rejected = (
  code: TradeErrorCode | "not-allowed",
  message: string,
): TradeOutcome => ({ status: "rejected", code, message });

const RECOVERY_WALLET =
  "The shop's stock changed but the wallet update did not finish. Confirm the same trade again to finish it; nothing will be applied twice.";
const RECOVERY_MARK =
  "The trade went through but could not be marked finished. Confirm the same trade again to finish it; nothing will be applied twice.";

export class MerchantTradeService {
  /** Trade ids being applied right now, so a double click runs once. */
  private readonly inFlight = new Set<string>();

  constructor(private readonly deps: MerchantTradeDeps) {}

  async execute(request: TradeRequest): Promise<TradeOutcome> {
    const { tradeId } = request.command;
    if (this.inFlight.has(tradeId)) {
      return {
        status: "in-progress",
        message: "This trade is already being recorded.",
      };
    }
    this.inFlight.add(tradeId);
    try {
      return await this.run(request);
    } finally {
      this.inFlight.delete(tradeId);
    }
  }

  private async save(id: string, sheet: StatSheet): Promise<boolean> {
    try {
      return (await this.deps.saveSheet(id, sheet)) === true;
    } catch {
      return false;
    }
  }

  /** The shop's stock field, if this is a stock ledger. */
  private findShop(request: TradeRequest): Shop | undefined {
    const entity = this.deps.getEntity(request.shopId);
    const sheet = entity?.statSheet;
    const field = sheet?.fields.find(
      (f) => f.id === request.fieldId && f.type === "item-table",
    );
    return entity && sheet && field?.stockLedger
      ? { entity, sheet, field }
      : undefined;
  }

  /** Whether the sheet's template allowlists this trade action. */
  private isAllowed(sheet: StatSheet, kind: TradeRequest["command"]["kind"]) {
    const template = sheet.templateId
      ? this.deps.getTemplate(sheet.templateId)
      : undefined;
    return this.deps.registry
      .actionsFor(template)
      .some((a) => a.qualifiedId === `stock-table:${kind}`);
  }

  /** The shop and its stock field, or the reason this request is refused. */
  private resolve(request: TradeRequest): Shop | TradeOutcome {
    if (this.deps.isReadOnly()) {
      return rejected("not-allowed", "This vault is read-only.");
    }
    const shop = this.findShop(request);
    if (!shop) {
      return rejected("not-allowed", "That is not a shop stock table.");
    }
    if (!this.isAllowed(shop.sheet, request.command.kind)) {
      return rejected("not-allowed", "This sheet does not allow trading.");
    }
    return shop;
  }

  private itemName(row: Record<string, unknown>): string {
    const named = typeof row.name === "string" ? row.name.trim() : "";
    const linked =
      typeof row.entityId === "string"
        ? this.deps.getEntity(row.entityId)?.title
        : undefined;
    return linked || named || "Item";
  }

  /** Checks the other party can take the wallet change, before any write. */
  private preflightWallet(record: StockTradeRecord): TradeOutcome | null {
    const other = record.counterpartyId
      ? this.deps.getEntity(record.counterpartyId)
      : undefined;
    if (!other?.statSheet) {
      return rejected(
        "wallet-unavailable",
        "The other party has no stat sheet. Use record-only instead.",
      );
    }
    const check = planWalletChange(other.statSheet.fields, record.kind, record);
    return check.ok ? null : rejected(check.code, check.message);
  }

  private async run(request: TradeRequest): Promise<TradeOutcome> {
    const shop = this.resolve(request);
    if ("status" in shop) return shop;

    const planned = this.plan(shop, request);
    if (!planned.ok) return rejected(planned.code, planned.message);

    // A retry of a finished trade changes nothing and says so.
    const finished = this.alreadyDone(planned);
    if (finished) return finished;

    const refusal = this.preflight(planned.record);
    if (refusal) return refusal;

    const stopped = await this.apply(request, shop, planned);
    return stopped ?? this.finish(planned.record, shop, request);
  }

  private plan(shop: Shop, request: TradeRequest) {
    return planTrade(
      {
        rows: shop.field.rows ?? [],
        tradeLog: shop.field.tradeLog,
        now: this.deps.now(),
        itemName: (row) => this.itemName(row),
      },
      request.command,
    );
  }

  private alreadyDone(
    planned: TradePlan | DuplicateTrade,
  ): TradeOutcome | null {
    if (!planned.duplicate || planned.record.status !== "complete") {
      return null;
    }
    return {
      status: "done",
      record: planned.record,
      alreadyDone: true,
      message: "That trade was already recorded.",
    };
  }

  /** Checks a wallet trade can proceed, before anything is written. */
  private preflight(record: StockTradeRecord): TradeOutcome | null {
    return record.accounting === "wallet" ? this.preflightWallet(record) : null;
  }

  /** Steps 1 to 3 in order. Null means every part is done. */
  private async apply(
    request: TradeRequest,
    shop: Shop,
    planned: TradePlan | DuplicateTrade,
  ): Promise<TradeOutcome | null> {
    const { record } = planned;
    if (!planned.duplicate) {
      const stopped = await this.writeStock(
        request,
        shop,
        planned.nextRows,
        record,
      );
      if (stopped) return stopped;
    }
    if (record.accounting !== "wallet") return null;
    return this.walletLeg(record, shop, request, planned.duplicate);
  }

  /** Step 1: the stock change and the trade record, in one write. */
  private async writeStock(
    request: TradeRequest,
    shop: Shop,
    nextRows: unknown[],
    record: StockTradeRecord,
  ): Promise<TradeOutcome | null> {
    const written = replaceField(shop.sheet, request.fieldId, {
      ...shop.field,
      rows: nextRows as NonNullable<StatSheetField["rows"]>,
      tradeLog: appendTradeRecord(shop.field.tradeLog, record),
    });
    if (await this.save(request.shopId, written)) return null;
    return {
      status: "failed",
      message: "The trade could not be saved. Nothing was changed.",
    };
  }

  /** Steps 2 and 3: the wallet, then marking the trade complete. */
  private async walletLeg(
    record: StockTradeRecord,
    shop: Shop,
    request: TradeRequest,
    resuming: boolean,
  ): Promise<TradeOutcome | null> {
    return (
      (await this.settleWallet(record, shop, request, resuming)) ??
      (await this.markComplete(request, record.tradeId))
    );
  }

  /** Moves the other party's wallet, once. True when it has been moved. */
  private async applyWallet(record: StockTradeRecord): Promise<boolean> {
    const other = this.deps.getEntity(record.counterpartyId as string);
    if (!other?.statSheet) return false;
    const plan = planWalletChange(other.statSheet.fields, record.kind, record);
    if (!plan.ok) return false;
    if (plan.alreadyApplied) return true;
    return this.save(other.id, { ...other.statSheet, fields: plan.nextFields });
  }

  /** Step 2: the other party's wallet, undoing step 1 if it cannot be saved. */
  private async settleWallet(
    record: StockTradeRecord,
    shop: Shop,
    request: TradeRequest,
    resuming: boolean,
  ): Promise<TradeOutcome | null> {
    if (await this.applyWallet(record)) return null;

    // A fresh trade is undone cleanly when it can be; a resumed one is left
    // pending so the next retry finishes it.
    if (!resuming && (await this.undoStock(request, shop))) {
      return {
        status: "failed",
        message:
          "The wallet could not be updated, so the trade was undone. Nothing was changed.",
      };
    }
    return { status: "needs-recovery", message: RECOVERY_WALLET };
  }

  /** Puts the original stock field back, on the freshest copy of the sheet. */
  private async undoStock(request: TradeRequest, shop: Shop): Promise<boolean> {
    const fresh = this.deps.getEntity(request.shopId)?.statSheet;
    if (!fresh) return false;
    return this.save(
      request.shopId,
      replaceField(fresh, request.fieldId, shop.field),
    );
  }

  /** Step 3: mark the trade complete once every part has been applied. */
  private async markComplete(
    request: TradeRequest,
    tradeId: string,
  ): Promise<TradeOutcome | null> {
    const sheet = this.deps.getEntity(request.shopId)?.statSheet;
    const field = sheet?.fields.find((f) => f.id === request.fieldId);
    if (!sheet || !field) return null;
    const completed = completeTradeRecord(field.tradeLog, tradeId);
    if (completed === field.tradeLog) return null;
    const saved = await this.save(
      request.shopId,
      replaceField(sheet, request.fieldId, { ...field, tradeLog: completed }),
    );
    return saved ? null : { status: "needs-recovery", message: RECOVERY_MARK };
  }

  /** One journal entry for the finished trade, and the result for the form. */
  private finish(
    record: StockTradeRecord,
    shop: Shop,
    request: TradeRequest,
  ): TradeOutcome {
    const finished: StockTradeRecord = { ...record, status: "complete" };
    try {
      this.deps.publishCapture(
        describeTrade(finished, {
          shopId: request.shopId,
          shopName: shop.entity.title,
          counterpartyName: request.command.counterpartyId
            ? this.deps.getEntity(request.command.counterpartyId)?.title
            : undefined,
        }),
      );
    } catch {
      // The journal is a record of the trade, never a reason to fail it.
    }
    return {
      status: "done",
      record: finished,
      alreadyDone: false,
      message:
        record.accounting === "wallet"
          ? "Trade recorded and wallet updated."
          : "Trade recorded. No funds were moved.",
    };
  }
}

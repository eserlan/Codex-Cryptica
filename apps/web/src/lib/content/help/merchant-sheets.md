---
id: merchant-sheets
title: Shops and Merchants
description: Turn a Location or Organisation into a shop with a stock table, then switch between a GM stock manager and a read-only catalogue.
icon: icon-[lucide--store]
rank: 26
tags:
  [
    "shop",
    "merchant",
    "stock",
    "prices",
    "catalogue",
    "stats",
    "templates",
    "gameplay",
  ]
---

# Shops and Merchants

A shop in Codex Cryptica is an ordinary entity, usually a Location or an Organisation, that uses the **Shop / Merchant** stat sheet. It keeps the owner, reputation, services and a stock table on the entity itself. It works for any game system and needs no AI.

## Set up a shop

1. Open the Location or Organisation and choose **Stats**.
2. Open **Templates** and choose **Shop / Merchant**. It sits in the suggested list for Locations.
3. Fill in the owner, speciality, reputation and services. **Purchasing power** is optional.

The template is opt-in. Nothing changes on your other Locations unless you apply it to them.

## Manage the stock

Use the **GM Stock Manager** layout from **Presentations**. Each stock line has:

- **Item**: type a name, or choose **Link Vault Item** to point at an existing Item.
- **Quantity**: use the **+** and **-** buttons or type a number. Stock stops at 0.
- **Shop price**: the price in this shop, with its own unit such as `gp` or `cr`. A linked Item keeps its own price, which shows as a hint.
- **Availability**: Available, Reserved, Sold out or Hidden.
- **Condition** and **Note**: the Note is for you. The catalogue never shows it.

Choose **Open item** on a linked line to jump to that Item. If a linked Item is later deleted, the line keeps the name you saw and stays editable. Use the arrows on a row, or **Ctrl+Up** and **Ctrl+Down**, to reorder lines. Links survive reordering.

A line can also be a **Service** or a **Commission**, which have no quantity.

## Record a trade

Choose **Trade** on a stock line to record a sale or a purchase. Nothing changes until you press **Confirm trade**. The form shows what will happen first: the total, the stock before and after, and whether any funds move.

1. Choose **Customer buys from the shop** or **Customer sells to the shop**.
2. Set the quantity. The price starts as the line's shop price, and you can change it for this trade only.
3. Optionally choose who is trading. Leave it on **No one** to just record the trade.
4. Check the preview, then press **Confirm trade**, or **Cancel** to change nothing.

A trade is refused, with a reason, if there is not enough stock, the line is sold out, reserved or hidden, the quantity is not a whole number, or there is no price. Services and commissions are traded one at a time, and a shop only buys items. When the last unit sells, the line becomes **Sold out**. When the shop buys goods for a sold-out line, it becomes **Available** again.

### Record only, or update a wallet

By default a trade is **record only**: the shop's stock changes and the trade is logged, but **no funds move** and nothing is added to anyone's inventory. The form says so every time.

To move money as well, choose a character and tick **Also update their wallet**. That option appears only when the character has a **number** field with the key `wallet_gp` for gold pieces, `wallet_cr` for credits, and so on. The unit must match the price, because there is no exchange rate. Wallets use whole numbers, so a price with decimals is record only. A purchase is refused if the character cannot afford it.

The shop's own **Purchasing power** is a text note and is never changed by a trade. Moving items into a character's inventory is not automatic; add them yourself.

### If something goes wrong

If saving fails, the form tells you and nothing is changed. If the wallet cannot be updated, the stock change is undone. In the rare case that a trade is left half finished, the button changes to **Finish trade**. Confirm it again and it completes without doing anything twice. Pressing Confirm twice, or confirming a trade that already went through, records it once.

### Journal

While a Session Journal is running, each completed trade adds one **Trade** entry, such as "Mira bought 2× Rope from Tallow's Goods for 4 gp (record only, no funds moved)." A cancelled or refused trade adds nothing.

## Show the catalogue

Switch to **Browse Catalogue** in **Presentations**. It shows the same stock as a compact, read-only list with prices, availability and services. Hidden lines and your notes are left out. Switching layouts never changes your data.

The catalogue is a preview on your own screen. It is not a way to share the shop with players, and the player view is planned separately. Do not treat Hidden or Note as secret from anyone looking at your screen or your vault.

## Make your own shop template

Use **Edit Layout** to add fields to your shop, then save the layout from **Templates**. Saved layouts can be shared like any other template. Saved templates keep the field layout, not your stock.

## Which tool should I use?

| You want                                      | Use                                                               |
| --------------------------------------------- | ----------------------------------------------------------------- |
| Prices and stock you can edit and browse      | A shop with this sheet                                            |
| A quick NPC with wants, quirks and secrets    | The **Table Card** character template                             |
| An invented business with staff and a history | A business generator, which is planned and not part of this sheet |

This sheet only holds what a shop sells and how it looks to a customer. It does not invent the business. You can use more than one tool together: a shopkeeper can be a Table Card NPC who owns a shop with this sheet.

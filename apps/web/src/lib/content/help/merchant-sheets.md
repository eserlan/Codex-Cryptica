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

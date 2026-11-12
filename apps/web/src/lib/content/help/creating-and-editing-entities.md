---
id: creating-and-editing-entities
title: Creating and Editing Entities
description: Add a character, location or any other entry to your vault, then edit manually or review an AI-assisted revision before saving.
icon: icon-[lucide--square-pen]
rank: 2
tags:
  [
    "entity",
    "create",
    "edit",
    "save",
    "cancel",
    "delete",
    "basics",
    "template",
    "link",
    "wiki",
  ]
---

# Creating and Editing Entities

Everything in your world is an **entity**: a character, location, faction, item, event, creature or note. Each one has a page you can read and edit.

## Create an entity

1. Click **+ Create** in the header, or the **+** in the explorer sidebar.
2. Choose a category, such as **Character** or **Location**.
3. Type a title and save.

New entities start from a ready-made layout for their category. See Default Entity Templates to change it.

If you would rather have a draft written for you, use a generator or the Oracle. Those show a draft first, and nothing is added until you keep it.

## Edit an entity

1. Open the entity from the explorer, the graph or search.
2. Click **Edit** in the header of the side panel or Zen mode.
3. Change the title, aliases, labels or text.
4. Click **Save changes**, or **Cancel** to leave the entity as it was.

While you have unsaved edits, the footer shows **Unsaved changes**. Cancelling discards them.

## Rename an entity or entry

To rename an entry, open the entity and click **Edit** in the header of the side panel or Zen mode. Change its
title, then click **Save changes**. **Cancel** leaves the original name unchanged.
Renaming changes the existing entity; it does not create a second entry.

## AI-assisted revisions

You can revise an entity’s text and **GM notes** directly from its entity view.

1. Open the entity in the side panel or **Zen Mode**.
2. Click **AI revise description**. In both views it is in the **More** menu in the header. Zen Mode also has it below the text.
3. In **Revise Description**, optionally enter guidance in **AI Instructions / Corrections (Highest Priority)**. For example: “Keep the history, but explain their alliance more clearly.”
4. Click **Revise**, or press **Ctrl + Enter** (Cmd + Enter on macOS).
5. Review the generated text and GM notes. Click **Apply Changes** to save, or **Discard** to keep the original.

Click **Cancel** in the instructions dialog to leave without generating a revision.
Generating a draft does not save it. When applying a revision changes existing Lore
sections, **Review lore changes** lets you choose what to keep before saving.
If generation fails, your existing entity text remains unchanged.

You can also use **`/revise`** in the **Lore Oracle** chat to revise the selected entity.
The chat command returns suggested text in the conversation. Use the entity-view
sparkle button when you want the instructions dialog and inline draft review. AI revisions are unavailable in guest or demo vaults.

## Link to another entity

Write `[[Name]]` in an entity's text or GM notes, using another entity's title or alias, to link to it. When you read the entity, the name shows as a link without the brackets. If no entity has that name, it shows as plain text. While you edit, the brackets stay visible.

## Delete an entity

Open **More** in the side panel or Zen mode header, choose **Delete**, and confirm. Deleting is permanent. Take a Portable Backup first if you might want it back.

## Guest vaults

A guest or demo vault is read only. Keep the world as your own vault to create and edit.

# UI Contract: Import Files from the File System

## Source selection

- Accept files via drag-and-drop (including a dropped folder) and via a traditional file upload dialog (`<input type="file" multiple>`), from within the current vault, without switching the active vault.
- Show exactly which files were picked up before any write happens; unreadable or unrecognized (non-entity) items are excluded and reported, not silently imported.

## Review

Reuses the existing `packages/importer` review model (`CCImportSession`/`PreviewItem`/`PreviewAsset`, same as CIF/Scabard/Chronica imports):

- State the number of files (and images) that will be added, the number of conflicting paths that will be skipped, and the number of referenced images not present in the drop/selection.
- A matched entity is always shown as "skip" — this source never offers "update" or "create anyway" for a path match, unlike CIF's reimport flow.
- When images are missing, offer to add the missing image file(s) directly or (where supported) grant access to the source folder to resolve them automatically; on unsupported browsers, only the "add directly" option is offered, with a clear explanation why.
- Require an explicit confirmation to write.
- Do not offer overwrite or delete controls.
- Disable the confirm action when nothing would be added (all-skip or all-unreadable selection).

## Result

Reuses the existing `ImportReport` shape:

- On success, keep the current vault active, report `entitiesCreated`/`itemsSkipped`/`assetsImported`/`assetsSkipped` counts, and make imported files immediately visible/searchable (no manual reload — entities are created through the normal live vault write path).
- On cancellation or an all-skip/all-unreadable selection, do not write anything.
- On a partial write failure, `ImportReport.failures` reports exactly what was and wasn't added; never claim a false success, and never leave an existing target entity modified.

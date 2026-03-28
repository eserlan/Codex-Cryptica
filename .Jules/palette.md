## 2026-03-28 - [Accessible Login Input]
**Learning:** Found that custom modals lacking native `<form>` semantics often miss programmatic associations between inputs and their corresponding validation errors.
**Action:** Always link dynamically rendered error messages to their inputs using `aria-invalid` and `aria-describedby` with matching IDs, alongside an explicit `<label>`.

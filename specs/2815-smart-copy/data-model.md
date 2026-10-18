# Data Model: Smart Multi-Format Copy

This feature introduces no persistent data, schema version, database record, or network payload. The model consists only of transient values passed within one user-initiated copy operation.

## SmartCopyContent

Represents alternate clipboard forms of one document-like value.

| Field       | Type     | Required | Rules                                                                                                        |
| ----------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `markdown`  | `string` | Yes      | Canonical `text/plain` and fallback value; copied exactly as supplied after caller-owned document assembly   |
| `html`      | `string` | No       | Optional semantic override; always sanitised by the service before use. If absent, render `markdown` to HTML |
| `imageBlob` | `Blob`   | No       | Existing entity-copy enhancement only; must represent PNG data before being registered as `image/png`        |

### Validation rules

- `markdown` is always the source of `text/plain`, including empty strings.
- HTML never bypasses the service sanitiser.
- Generated HTML is structural and must not depend on Codex Cryptica CSS.
- An invalid or unavailable optional image is omitted; it does not invalidate text representations.
- One operation creates at most one clipboard item containing all available representations.

## ClipboardCapabilities

Constructor-injected runtime collaborators used by `ClipboardService`.

| Capability             | Required at construction | Runtime behaviour                                                              |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| `write(items)`         | No                       | Preferred multi-format path when present                                       |
| `writeText(text)`      | No                       | Required only for fallback; absence yields `false` after rich path cannot run  |
| clipboard-item factory | No                       | Creates the one multi-MIME item; absence skips directly to plain fallback      |
| Markdown parser        | Defaulted                | Produces HTML when no override is supplied                                     |
| HTML sanitiser         | Defaulted                | Sanitises generated and supplied HTML                                          |
| image collaborators    | Defaulted                | Preserve existing entity image preparation and are not used by text-only calls |

## CopyOutcome

The public return remains a boolean for compatibility.

| Value   | Meaning                                                            |
| ------- | ------------------------------------------------------------------ |
| `true`  | Either the multi-format write or the plain-text fallback completed |
| `false` | No available clipboard path completed                              |

The service may log the failed path for diagnosis, but it does not expose content, analytics, or UI state.

## GeneratorCopyDocument

A transient input shape accepted by the generator formatting helper.

| Field                      | Required | Canonical ordering                                                   |
| -------------------------- | -------- | -------------------------------------------------------------------- |
| `title`                    | Yes      | Markdown level-one heading                                           |
| `summary`                  | No       | Emphasised paragraph when not already embedded in historical content |
| `labels`                   | No       | Existing labels line, preserving current copy behaviour              |
| `content`                  | Yes      | Main generator document/section Markdown                             |
| `lore`                     | No       | Appended supporting/“At the Table” Markdown when non-empty           |
| `summaryIncludedInContent` | No       | Prevents the stored Session Hub summary from appearing twice         |

### Relationships

```text
GeneratorOutput / SessionEntity
        -> generator copy document builder
        -> SmartCopyContent.markdown
        -> ClipboardService
        -> one clipboard item (plain + safe HTML [+ optional PNG])
        -> plain fallback when needed
```

### State transitions

```text
idle
  -> preparing
  -> rich-write succeeded -> success -> idle
  -> rich-write unavailable/failed
       -> plain-write succeeded -> success -> idle
       -> plain-write failed/unavailable -> error -> idle
```

Feedback timers remain surface state; they are not part of `ClipboardService`.

## Copy Classification

This is documented audit metadata, not a runtime registry.

| Value              | Meaning                                                                                           | Clipboard policy                         |
| ------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `document-content` | Authored/generated prose whose Markdown structure has meaning                                     | Smart multi-format service               |
| `literal-plain`    | Exact URL, token, secret, prompt, source, log, transcript, identifier, or unformatted short value | Plain text                               |
| `special-binary`   | Image or another non-document export                                                              | Existing format-specific action/fallback |

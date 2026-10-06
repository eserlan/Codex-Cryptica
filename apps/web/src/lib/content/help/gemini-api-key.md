---
id: gemini-api-key
title: Oracle AI Access and Personal Keys
description: Set up the AI provider key used by the Lore Oracle in Codex Cryptica.
tags: [ai, gemini, setup]
rank: 6
---

## Choose your Oracle connection

Open **Settings → Intelligence**. **Connection Mode** shows whether you are using the **System Proxy** or **Direct Connection: Custom Key**.

- **System Proxy** uses the shared service, subject to its usage limits. You do not need a personal key for this mode.
- **Personal key** connects directly to the provider. The current personal-key text connection uses Google Gemini, even where the key field is labelled “OpenAI/Luna”. Keys from different providers are not interchangeable.

### What the System Proxy remembers

The Oracle remembers your chat and the notes it has already seen, so each new question only sends what changed, and replies come back quicker and use less of your quota. To do this on the free System Proxy, your conversation and the notes it references are briefly stored on the AI provider's servers (up to 55 days) and then expire. Your vault always stays on your computer; only the chat does this. To keep everything fully on your device, use your own API key instead of the System Proxy.

### Add or remove a personal key

1. Open **Settings → Intelligence**.
2. Use **Get free key from Google AI Studio** beside the key field to reach the provider’s key page.
3. Paste your Gemini key into the key field and click **Activate Oracle**.
4. To return to the system proxy, click **Remove Key** and confirm.

The key is saved in this browser. Provider access and usage limits depend on your provider account; adding a key does not guarantee a free allowance or faster replies.

### Image generation is configured separately

In the same settings panel, **Image Generation Provider** offers **Cloudflare Workers AI**, a personal-key provider, and **Custom (OpenAI-Compatible)**. A custom image endpoint has its own URL, model and API-key fields. It does not change the Oracle’s text connection.

### Keep AI off when you want local-only work

Turn on **AI Disabled** in Settings. A personal key still sends requests and relevant context to an external provider. Local generator templates and manual editing do not need a key.

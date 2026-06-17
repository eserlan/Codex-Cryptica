# Chrome DevTools MCP — Local Setup

How to get `mcp__chrome-devtools__*` tools working for network and UI inspection during local development.

## Why this is needed

The `mcp__chrome-devtools__*` MCP server connects to Chrome's remote debugging protocol on `localhost:9222`. The catch: if Chrome is already running, passing `--remote-debugging-port=9222` to a new launch connects to the existing instance via its Unix singleton socket — the TCP port never opens. `curl http://localhost:9222/json/version` will refuse.

The `claude-in-chrome` browser extension is an alternative, but it only captures main-thread network requests. The oracle runs in a **Web Worker**, so `sendInteraction` calls to `oracle-proxy.espen-erlandsen.workers.dev` are invisible to it. CDP captures worker requests too.

## Setup

Launch a second Chrome instance with its own profile directory so it has no singleton conflict:

```bash
DISPLAY=:0 WAYLAND_DISPLAY=wayland-0 google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-cdp-session \
  --no-first-run \
  http://localhost:5174/ &>/tmp/chrome-cdp.log &
```

Wait a few seconds, then verify:

```bash
curl -s http://localhost:9222/json/version | head -3
# → { "Browser": "Chrome/...", "Protocol-Version": "1.3", ... }
```

List open pages:

```bash
curl -s http://localhost:9222/json | python3 -c \
  "import sys,json; [print(p['id'], p.get('url','')[:80]) for p in json.load(sys.stdin)]"
```

## Vault access

This new Chrome profile starts with an empty OPFS (Origin Private File System) — the brinesia vault is not present. Load it manually via the in-app vault selector after the window opens, or use the demo vault for testing.

## Using in Claude Code

Once port 9222 is up, the `mcp__chrome-devtools__*` tools connect automatically:

```
mcp__chrome-devtools__list_pages
mcp__chrome-devtools__select_page  { pageId: 1 }
```

### Useful tools

| Tool | Purpose |
|---|---|
| `take_snapshot` | Accessibility tree — use `uid` values to click elements |
| `click` | Click by `uid` from snapshot |
| `wait_for` | Wait for text to appear before continuing |
| `list_network_requests` | All requests; filter with `resourceTypes: ["fetch", "xhr"]` |
| `get_network_request` | Save request + response bodies to disk via `requestFilePath` / `responseFilePath` |
| `take_screenshot` | Visual check |
| `evaluate_script` | Run JS in page context |

### Example: inspect a proxy request

```
# After triggering an AI action:
mcp__chrome-devtools__list_network_requests  { resourceTypes: ["fetch", "xhr"] }
# → find reqid for oracle-proxy.espen-erlandsen.workers.dev

mcp__chrome-devtools__get_network_request  {
  reqid: 112,
  requestFilePath: "/tmp/req.json",
  responseFilePath: "/tmp/res.json"
}
# Then: cat /tmp/req.json | python3 -m json.tool
```

## Teardown

The CDP Chrome is a throw-away session — just close the window or kill the process. The profile at `/tmp/chrome-cdp-session` can be deleted freely.

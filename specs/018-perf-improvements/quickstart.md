# Quickstart: Performance Verification

## 1. Benchmarking Idle CPU
- Open the application.
- Open Chrome/Safari DevTools -> **Performance** tab.
- Click **Record** and let the app sit idle for 5 seconds.
- **Goal**: The "Main" thread should show near-zero activity. The Minimap should not be triggering frames.

## 2. Testing Large Vault Scaling
- Use the script `scripts/generate-stress-vault.sh` (if available) or manually create 50+ notes with links.
- Navigate the graph.
- **Goal**: No "Long Tasks" (>50ms) during panning and zooming.

## 3. Verifying Memory Stability
- Open DevTools -> **Memory** tab.
- Take a heap snapshot.
- Trigger 10-20 thumbnail generations (e.g., by scrolling a list or updating many entities).
- Take another snapshot.
- **Goal**: No significant leak in `HTMLCanvasElement` or `CanvasRenderingContext2D` objects.

## 4. Sync Latency
- Open two tabs side-by-side.
- Send a message in one.
- **Goal**: Instant sync with minimal CPU spike in the receiving tab (due to timestamp skip).

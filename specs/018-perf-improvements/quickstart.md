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

---

## 5. Full Performance Profiling Procedure (Advanced)

To verify the success criteria SC-001 through SC-005, follow these steps:

### A. Graph Interaction (SC-001)
1. Generate a stress vault: `node scripts/generate-stress-vault.js`.
2. In DevTools **Performance** tab, click the **Settings** (gear) icon and set **CPU** to **4x slowdown** (to simulate mid-range mobile).
3. Start recording.
4. Rapidly pan and zoom the graph for 10 seconds.
5. Stop recording.
6. **Analysis**: Look for "Long Tasks" (red bars). Verify that even with CPU throttling, tasks remain under 50ms (real-time) or effectively smooth.

### B. Idle Power Consumption (SC-002)
1. Open the **Performance Monitor** (three dots menu -> More tools -> Performance monitor).
2. Observe **CPU usage**.
3. Let the app sit idle.
4. **Analysis**: CPU usage should drop to 0% and stay there. If it spikes periodically, check if the Minimap or a polling loop is active.

### C. GC Pressure & Memory (SC-003)
1. Open **Memory** tab.
2. Take **Heap Snapshot 1**.
3. Perform an action that triggers thumbnailing (e.g., save a new image to 5 entities).
4. Take **Heap Snapshot 2**.
5. Select **Comparison** view in Snapshot 2.
6. **Analysis**: Search for `HTMLCanvasElement`. While new ones may be created during the async process, verify they are correctly collected and don't accumulate indefinitely if the action is repeated.

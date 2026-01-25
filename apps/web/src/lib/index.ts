// place files you want to import through the `$lib` alias in this folder.
import { workerBridge } from './cloud-bridge/worker-bridge';

export function notifyFileChanged() {
    // Debounce this call in real app
    workerBridge.startSync();
}
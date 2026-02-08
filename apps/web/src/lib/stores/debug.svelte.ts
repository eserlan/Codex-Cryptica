import { writable } from 'svelte/store';

export interface LogEntry {
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: unknown;
}

function createDebugStore() {
    const { subscribe, update } = writable<LogEntry[]>([]);

    const addLog = (level: LogEntry['level'], message: string, data?: any) => {
        update(logs => {
            const newLog = { timestamp: Date.now(), level, message, data };
            return [newLog, ...logs].slice(0, 100); // Keep last 100 logs
        });
    };

    return {
        subscribe,
        log: (msg: string, data?: any) => addLog('info', msg, data),
        warn: (msg: string, data?: any) => addLog('warn', msg, data),
        error: (msg: string, data?: any) => addLog('error', msg, data),
        clear: () => update(() => [])
    };
}

export const debugStore = createDebugStore();
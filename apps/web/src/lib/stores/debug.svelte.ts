import { systemClock } from "$lib/utils/runtime-deps";
export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  message: string;
  data?: unknown;
}

export class DebugStore {
  logs = $state<LogEntry[]>([]);

  log(msg: string, data?: any) {
    this.addLog("info", msg, data);
  }

  warn(msg: string, data?: any) {
    this.addLog("warn", msg, data);
  }

  error(msg: string, data?: any) {
    this.addLog("error", msg, data);
  }

  clear() {
    this.logs = [];
  }

  private addLog(level: LogEntry["level"], message: string, data?: any) {
    const newLog = { timestamp: systemClock.now(), level, message, data };
    this.logs = [newLog, ...this.logs].slice(0, 500);
    if (import.meta.env.DEV) {
      const method =
        level === "error" ? "error" : level === "warn" ? "warn" : "log";
      if (data) {
        console[method](`[DebugStore] ${message}`, data);
      } else {
        console[method](`[DebugStore] ${message}`);
      }
    }
  }
}

export const debugStore = new DebugStore();

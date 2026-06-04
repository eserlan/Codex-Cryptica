export class NotificationStore {
  notification = $state<{
    message: string;
    type: "success" | "info" | "error";
    persistent: boolean;
  } | null>(null);

  private notificationTimeoutId: number | null = null;
  globalError = $state<{ message: string; stack?: string } | null>(null);

  confirmationDialog = $state<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDangerous?: boolean;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    title: "",
    message: "",
    resolve: null,
  });

  notify(
    message: string,
    type: "success" | "info" | "error" = "success",
    persistent = false,
  ) {
    if (this.notificationTimeoutId !== null) {
      clearTimeout(this.notificationTimeoutId);
      this.notificationTimeoutId = null;
    }

    this.notification = { message, type, persistent };
    if (!persistent) {
      this.notificationTimeoutId = setTimeout(() => {
        this.notification = null;
        this.notificationTimeoutId = null;
      }, this.getDisplayDuration(type)) as unknown as number;
    }
  }

  private getDisplayDuration(type: "success" | "info" | "error"): number {
    return type === "error" ? 12000 : 5000;
  }

  clearNotification() {
    if (this.notificationTimeoutId !== null) {
      clearTimeout(this.notificationTimeoutId);
      this.notificationTimeoutId = null;
    }
    this.notification = null;
  }

  setGlobalError(message: string, stack?: string) {
    this.globalError = { message, stack };
  }

  clearGlobalError() {
    this.globalError = null;
  }

  async confirm(options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDangerous?: boolean;
  }): Promise<boolean> {
    if (this.confirmationDialog.open) {
      return Promise.resolve(false);
    }

    this.confirmationDialog = {
      open: true,
      ...options,
      resolve: null,
    };

    return new Promise((resolve) => {
      this.confirmationDialog.resolve = resolve;
    });
  }

  resolveConfirmation(result: boolean) {
    if (this.confirmationDialog.resolve) {
      this.confirmationDialog.resolve(result);
    }
    this.confirmationDialog = {
      open: false,
      title: "",
      message: "",
      resolve: null,
    };
  }

  disconnect() {
    if (this.confirmationDialog.open && this.confirmationDialog.resolve) {
      this.resolveConfirmation(false);
    }
    this.clearNotification();
  }
}

const KEY = "__codex_notification_store__";
export const notificationStore: NotificationStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new NotificationStore());

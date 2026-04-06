export interface SidebarState {
  leftSidebarOpen: boolean;
  activeSidebarTool: "oracle" | "none";
  isMobile: boolean;
}

export interface SidebarActions {
  toggleSidebarTool(tool: "oracle"): void;
  closeSidebar(): void;
}

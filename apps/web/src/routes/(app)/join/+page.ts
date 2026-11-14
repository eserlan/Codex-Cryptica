import { error } from "@sveltejs/kit";
import { isSharedVaultEnabled } from "#lib/config/shared-vault.js";

export const load = () => {
  if (!isSharedVaultEnabled()) error(404, "Not found");
};

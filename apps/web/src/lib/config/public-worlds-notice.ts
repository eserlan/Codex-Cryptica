/**
 * Centralized copy configuration for public worlds copyright and fan-content notices.
 *
 * All notices, disclaimers, and reporting text are defined here to maintain exact legal phrasing,
 * prevent any accidental claims of rights-holder permission or certification (FR-004),
 * and provide clean, natural language across the public directory and guest views (Constitution IX).
 */

export const PUBLIC_WORLDS_NOTICE = {
  /**
   * Compact provenance notice displayed on the public /worlds directory (FR-001, FR-002, FR-003).
   */
  PROVENANCE_HEADER: "World Provenance & Copyright",
  PROVENANCE_TEXT:
    "Worlds listed in this directory are created and published independently by their authors. Some worlds may contain unofficial fan content referencing third-party tabletop settings, rulebooks, or trademarks. Codex Cryptica is not affiliated with, endorsed, sponsored, or approved by any referenced rights holders.",
  AUTHOR_RESPONSIBILITY_TEXT:
    "Authors are solely responsible for ensuring they have the legal right to publish their content and that it does not include unauthorized copied sourcebook text, scans, official artwork, maps, or logos.",
  REPORT_PROMPT:
    "If you believe any public world infringes on your copyright or intellectual property rights, you can report it directly to our moderation team for review.",
  REPORT_ACTION_LABEL: "Report copyright concern",

  /**
   * Default disclaimer displayed on public vault pages when the fan-content flag is enabled (FR-009).
   */
  DEFAULT_FAN_CONTENT_DISCLAIMER:
    "This world is unofficial fan content and is not affiliated with, endorsed, sponsored, or approved by the owners of the referenced setting or franchise.",

  /**
   * Acknowledgement text shown to world owners when enabling or updating public listing (FR-005).
   */
  ACKNOWLEDGEMENT_LABEL:
    "I confirm that I have the right to publish this material and that it does not contain copied sourcebook text, scans, official artwork, maps, logos, or any other protected material that I am not authorized to use.",

  /**
   * Fan-content toggle label in public listing settings (FR-007).
   */
  FAN_CONTENT_TOGGLE_LABEL:
    "This world references third-party intellectual property or is unofficial fan content",
  FAN_CONTENT_TOGGLE_HELP:
    "Enabling this displays an unofficial fan-content disclaimer on your public world view. You may optionally enter specific required disclaimer wording below.",

  /**
   * Custom disclaimer textarea label in public listing settings (FR-010).
   */
  CUSTOM_DISCLAIMER_LABEL: "Custom rights-holder disclaimer wording (optional)",
  CUSTOM_DISCLAIMER_HELP:
    "If a rights holder requires specific disclaimer text under their fan-content policy, enter it here (up to 500 characters, plain text only).",

  /**
   * URL to Terms of Use / publishing guidelines (FR-017).
   * Empty until the page exists — notices must render without broken links,
   * and the link appears once a destination is set here.
   */
  TERMS_OF_USE_URL: "",
  TERMS_OF_USE_LABEL: "Publishing Guidelines & Terms of Use",

  /**
   * Reporting modal and form copy (FR-012, FR-013, FR-014).
   */
  REPORT: {
    MODAL_TITLE: "Report Copyright Concern",
    INTRO_TEXT:
      "Please provide the details below so our operators can review this world. We accept reports without an account.",
    VAULT_URL_LABEL: "Public World URL (*)",
    VAULT_URL_PLACEHOLDER: "https://codexcryptica.com/guest/...",
    RIGHTS_HOLDER_LABEL: "Copyrighted Work or Rights Holder (optional)",
    RIGHTS_HOLDER_PLACEHOLDER:
      "e.g., Wizards of the Coast, Paizo, or specific book/game title",
    MATERIAL_LABEL: "Material Believed to Infringe (optional)",
    MATERIAL_PLACEHOLDER:
      "Describe the specific text, image, or map believed to be infringing",
    REPORTER_CONTACT_LABEL: "Your Contact Email (*)",
    REPORTER_CONTACT_PLACEHOLDER: "name@example.com",
    DETAILS_LABEL: "Additional Explanation or Supporting Evidence (optional)",
    DETAILS_PLACEHOLDER:
      "Provide any additional links or explanation to assist our review",
    SUBMIT_BUTTON: "Submit Report",
    SUBMITTING_BUTTON: "Submitting...",
    SUCCESS_TITLE: "Report Received",
    SUCCESS_TEXT:
      "Your copyright report has been received and will be reviewed by our team. Please note that submission of a report does not guarantee any specific outcome or timeline.",
    CLOSE_BUTTON: "Close",
  },

  /**
   * Neutral unavailability message for disabled/suspended vaults (FR-016).
   */
  SUSPENDED_PUBLIC_MESSAGE: "This world is temporarily unavailable.",
  SUSPENDED_OWNER_BANNER:
    "Public availability of this world is currently suspended pending review.",
} as const;

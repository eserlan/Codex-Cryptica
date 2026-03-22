# Feature Specification: Free Oracle Use (Advanced Tier)

**Feature Branch**: `075-free-oracle-use`  
**Created**: 2026-03-20  
**Status**: Draft  
**Input**: User description: "free use of the oracle (not only a trial, free for now) https://github.com/eserlan/Codex-Cryptica/issues/479"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Frictionless Advanced Oracle Access (Priority: P1)

As a **New User**, I want to use the high-capability **Advanced Tier** Lore Oracle immediately without providing an API key, so I can experience the full power of the sync features without friction.

**Why this priority**: Essential for immediate user engagement. Provides the best possible experience by default. Supersedes previous "Lite Mode" restrictions.

**Independent Test**: Load the app, open the Oracle sidebar, and send a complex message. Verify the Oracle responds using the Advanced model capabilities via the "System" path.

**Acceptance Scenarios**:
1. **Given** I have no API key configured, **When** I send an Oracle message, **Then** the request is successfully processed via the system proxy using Advanced Tier models.
2. **Given** the "System" path is active, **When** I look at the Oracle UI, **Then** I see an indicator that I am using "System Proxy".

---

### User Story 2 - Power User "Custom API Key" (Priority: P1)

As a **Power User**, I want to connect my own Gemini Key to ensure 100% data sovereignty and bypass potential shared system rate limits.

**Why this priority**: Aligns with "Local-First" privacy principles. Allows heavy users to maintain their own bandwidth.

**Independent Test**: Enter a valid Gemini API key in settings, verify the UI reflects "Custom API Key", and check that network requests go directly to Google APIs.

**Acceptance Scenarios**:
1. **Given** I have entered my own API key, **When** I send a message, **Then** the request is sent directly to Google APIs using my key, bypassing the proxy.
2. **Given** I am using a Custom API Key, **When** I open the Oracle sidebar, **Then** I see a "Direct Connection: Custom Key" badge.

---

### Edge Cases

- **Superseding Prior Specs**: This implementation intentionally ignores previous "Lite" vs "Advanced" distinctions. ALL users get Advanced access by default (either via System Proxy or Custom API Key).
- **Proxy Unavailability**: If the Cloudflare proxy is unavailable:
  1. Display error message: "System proxy temporarily unavailable. Add your own API key in Settings to continue."
  2. Show prominent "Add API Key" button in Oracle sidebar
  3. Disable message send button until proxy is restored or key is added

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Implement a **"Dual-Path" fetch service** that defaults to **Advanced Tier** capabilities:
    - **Path A (Custom Key)**: If a user API key exists, POST directly to Google APIs using that key.
    - **Path B (System)**: If no user API key exists, POST to the system proxy at `https://oracle-proxy.codexcryptica.workers.dev`.
- **FR-002**: Update the Oracle Sidebar UI to display the current connection status:
    - "System Proxy" (System Path)
    - "Custom API Key" (Direct Path with User Key)
- **FR-003**: Ensure the system Gemini API key is never exposed to the client; it MUST remain a secret within the Cloudflare Worker environment.
- **FR-004**: The Cloudflare Worker MUST forward requests to the Google API using an Advanced Tier model (Gemini 1.5 Pro or better).

### Non-Functional Requirements

- **NFR-001**: **Security**: The Cloudflare proxy MUST restrict `Access-Control-Allow-Origin` to authorized Codex Cryptica domains.
- **NFR-002**: **Simplified Architecture**: Remove or bypass any existing logic that switches between "Lite" and "Advanced" modes; the system now only operates in Advanced mode.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of users have immediate access to Advanced Tier Oracle features.
- **SC-002**: UI state correctly switches between "System Proxy" and "Custom API Key" modes in real-time.
- **SC-003**: Security audit confirms 0 instances of the "System Key" leaking into client-side code or network traffic.

## Key Entities

- **OracleState**: (Rune) Reactive state tracking `hasCustomKey` and `userApiKey`.
- **ConnectionMode**: `"system-proxy" | "custom-key"`

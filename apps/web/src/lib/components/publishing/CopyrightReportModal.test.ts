/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CopyrightReportModal from "./CopyrightReportModal.svelte";

describe("CopyrightReportModal", () => {
  it("should render required fields and pre-fill vaultUrl", async () => {
    const onClose = vi.fn();
    render(CopyrightReportModal, {
      props: {
        open: true,
        vaultUrl: "https://codexcryptica.com/guest/test-123",
        onClose,
      },
    });

    await waitFor(() => {
      const vaultUrlInput = screen.getByLabelText(
        /vault url/i,
      ) as HTMLInputElement;
      expect(vaultUrlInput.value).toBe(
        "https://codexcryptica.com/guest/test-123",
      );
    });
    expect(screen.getByLabelText(/your contact email/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /submit report/i }),
    ).toBeDefined();
  });

  it("should display validation error when required fields are empty upon submission", async () => {
    const onClose = vi.fn();
    render(CopyrightReportModal, {
      props: {
        open: true,
        vaultUrl: "",
        onClose,
      },
    });

    const submitBtn = screen.getByRole("button", { name: /submit report/i });
    const form = submitBtn.closest("form")!;
    await fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(
          /please enter both the vault url and your contact email/i,
        ),
      ).toBeDefined();
    });
  });

  it("should submit report and render success receipt on successful submission", async () => {
    const onClose = vi.fn();
    const mockSubmitReport = vi.fn().mockResolvedValue({
      reportId: "report-uuid-999",
      receivedAt: "2026-07-10T14:00:00.000Z",
    });
    const mockGetTurnstileToken = vi.fn().mockResolvedValue("mock-token");

    render(CopyrightReportModal, {
      props: {
        open: true,
        vaultUrl: "https://codexcryptica.com/guest/test-123",
        onClose,
        deps: {
          submitReport: mockSubmitReport,
          getTurnstileToken: mockGetTurnstileToken,
        },
      },
    });

    await waitFor(() => {
      const emailInput = screen.getByLabelText(
        /your contact email/i,
      ) as HTMLInputElement;
      expect(emailInput).toBeDefined();
    });

    const emailInput = screen.getByLabelText(/your contact email/i);
    await fireEvent.input(emailInput, {
      target: { value: "reporter@example.com" },
    });

    const submitBtn = screen.getByRole("button", { name: /submit report/i });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockGetTurnstileToken).toHaveBeenCalled();
      expect(mockSubmitReport).toHaveBeenCalledWith({
        vaultUrl: "https://codexcryptica.com/guest/test-123",
        reporterContact: "reporter@example.com",
        rightsHolder: "",
        material: "",
        details: "",
        turnstileToken: "mock-token",
      });
      expect(screen.getByText(/report received/i)).toBeDefined();
      expect(screen.getByText(/report-uuid-999/)).toBeDefined();
    });
  });

  it("should display server error message on submission failure", async () => {
    const onClose = vi.fn();
    const mockSubmitReport = vi
      .fn()
      .mockRejectedValue(new Error("Rate limit exceeded"));
    const mockGetTurnstileToken = vi.fn().mockResolvedValue("mock-token");

    render(CopyrightReportModal, {
      props: {
        open: true,
        vaultUrl: "https://codexcryptica.com/guest/test-123",
        onClose,
        deps: {
          submitReport: mockSubmitReport,
          getTurnstileToken: mockGetTurnstileToken,
        },
      },
    });

    await waitFor(() => {
      const emailInput = screen.getByLabelText(/your contact email/i);
      expect(emailInput).toBeDefined();
    });

    const emailInput = screen.getByLabelText(/your contact email/i);
    await fireEvent.input(emailInput, {
      target: { value: "reporter@example.com" },
    });

    const submitBtn = screen.getByRole("button", { name: /submit report/i });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeDefined();
    });
  });
});

import { describe, expect, it } from "vitest";
import { deleteNoticeText, deletedByLabel } from "./cloud-backup-delete-notice";

const t = (title: string, deletedBy: string) => ({ title, deletedBy });

describe("deleteNoticeText", () => {
  it("names one person and one title", () => {
    expect(deleteNoticeText([t("Old Dock", "Mara")])).toBe(
      "Mara deleted Old Dock",
    );
  });
  it("capitalises the role names at the start", () => {
    expect(deleteNoticeText([t("X", "owner")])).toBe("The owner deleted X");
    expect(deleteNoticeText([t("X", "member")])).toBe(
      "A group member deleted X",
    );
  });
  it("uses Untitled for a blank title", () => {
    expect(deleteNoticeText([t("  ", "Mara")])).toBe("Mara deleted Untitled");
  });
  it("counts several deletes by one person", () => {
    expect(deleteNoticeText([t("A", "Mara"), t("B", "Mara")])).toBe(
      "Mara deleted 2 entities",
    );
  });
  it("counts several deletes by different people", () => {
    expect(deleteNoticeText([t("A", "Mara"), t("B", "owner")])).toBe(
      "2 entities were deleted by group members",
    );
  });
});

describe("deletedByLabel", () => {
  it("maps roles and keeps a name as it is", () => {
    expect(deletedByLabel("owner")).toBe("the owner");
    expect(deletedByLabel("member")).toBe("a group member");
    expect(deletedByLabel("<b>Mara</b>")).toBe("<b>Mara</b>");
  });
});

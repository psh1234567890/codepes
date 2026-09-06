import { describe, expect, it } from "vitest";
import { createSavedBackup, mergeSavedBackup, parseSavedBackup, MAX_BACKUP_BYTES } from "./saved-backup";

describe("saved list portability", () => {
  it("round-trips Korean names and preserves IDs not in the current contest feed", () => {
    const restored = parseSavedBackup(createSavedBackup(["old-contest", "future-contest"], ["국민대학교"]));
    expect(restored.bookmarks).toEqual(["old-contest", "future-contest"]);
    expect(restored.organizers).toEqual(["국민대학교"]);
  });

  it("merges instead of replacing local data and deduplicates normalized organizers", () => {
    const backup = parseSavedBackup(createSavedBackup(["a", "b"], ["codeforces", " AtCoder "]));
    const merged = mergeSavedBackup(["a", "local"], ["Codeforces"], backup);
    expect([...merged.bookmarks]).toEqual(["a", "local", "b"]);
    expect([...merged.organizers]).toEqual(["Codeforces", "AtCoder"]);
  });

  it("rejects unrelated JSON, unsupported versions, malformed lists and oversized files", () => {
    const valid = JSON.parse(createSavedBackup([], []));
    for (const raw of ["{", "null", "[]", JSON.stringify({ ...valid, version: 2 }),
      JSON.stringify({ ...valid, bookmarks: [1] }), JSON.stringify({ ...valid, organizers: [""] }),
      JSON.stringify({ ...valid, bookmarks: Array(2001).fill("id") }), " ".repeat(MAX_BACKUP_BYTES + 1)]) {
      expect(() => parseSavedBackup(raw)).toThrow();
    }
  });
});

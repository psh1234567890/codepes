import { describe, expect, it } from "vitest";
import {
  parseStoredStringSet,
  readStoredStringSet,
  writeStoredStringSet,
} from "./preferences";

describe("stored string preferences", () => {
  it("parses, trims, and deduplicates a string array", () => {
    expect(
      [...parseStoredStringSet('["Codeforces"," AtCoder ","Codeforces",""]')],
    ).toEqual(["Codeforces", "AtCoder"]);
  });

  it("ignores non-string values", () => {
    expect(
      [...parseStoredStringSet('["Codeforces",42,null,{},true,"  "]')],
    ).toEqual(["Codeforces"]);
  });

  it.each([null, "", "{", "{}", '"Codeforces"'])(
    "returns an empty set for an absent or invalid payload: %s",
    (raw) => {
      expect(parseStoredStringSet(raw)).toEqual(new Set());
    },
  );

  it("returns an empty set when storage reads fail", () => {
    const storage = {
      getItem: () => {
        throw new Error("storage unavailable");
      },
    };

    expect(readStoredStringSet(storage, "codepes-test")).toEqual(new Set());
  });

  it("writes a cleaned JSON array and keeps keys independent", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };

    expect(
      writeStoredStringSet(storage, "codepes-bookmarks", [
        "contest-1",
        " contest-1 ",
      ]),
    ).toBe(true);
    expect(
      writeStoredStringSet(storage, "codepes-favorite-organizers", [
        "Codeforces",
        " AtCoder ",
      ]),
    ).toBe(true);

    expect(readStoredStringSet(storage, "codepes-bookmarks")).toEqual(
      new Set(["contest-1"]),
    );
    expect(
      readStoredStringSet(storage, "codepes-favorite-organizers"),
    ).toEqual(new Set(["Codeforces", "AtCoder"]));
  });

  it("reports storage write failures without throwing", () => {
    const storage = {
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };

    expect(
      writeStoredStringSet(storage, "codepes-test", ["Codeforces"]),
    ).toBe(false);
  });
});

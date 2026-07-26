import { describe, expect, it } from "vitest";
import {
  canonicalUrl,
  deduplicate,
  normalizeTitle,
  toIso,
  validateContests,
} from "./contest-utils.mjs";

describe("contest sync utilities", () => {
  it("normalizes titles and canonicalizes URLs", () => {
    expect(normalizeTitle(" Code Pes: 2026! ")).toBe("codepes2026");
    expect(canonicalUrl("HTTPS://Example.com/event/?utm_source=test#top")).toBe(
      "https://example.com/event",
    );
    expect(
      canonicalUrl("https://example.com/event?id=ABC&utm_medium=link"),
    ).toBe("https://example.com/event?id=ABC");
  });

  it("deduplicates equivalent official URLs", () => {
    const contests = [
      {
        id: "first",
        title: "대회",
        url: "https://example.com/event?utm_source=a",
        applicationDeadline: "2026-08-01T00:00:00.000Z",
      },
      {
        id: "second",
        title: "다른 이름",
        url: "https://example.com/event#details",
        applicationDeadline: "2026-08-02T00:00:00.000Z",
      },
    ];

    expect(deduplicate(contests)).toEqual([contests[0]]);
  });

  it("converts epoch seconds to ISO timestamps", () => {
    expect(toIso(0)).toBe("1970-01-01T00:00:00.000Z");
  });

  it("rejects duplicate ids and insecure URLs", () => {
    const base = {
      id: "one",
      title: "대회",
      summary: "설명",
      type: "ps",
      organizer: "주최자",
      eligibilities: ["anyone"],
      mode: "online",
      applicationDeadline: "2026-08-01T00:00:00.000Z",
      eventStart: "2026-08-01T00:00:00.000Z",
      eventEnd: "2026-08-02T00:00:00.000Z",
      location: "온라인",
      tags: ["PS"],
      url: "http://example.com",
      sourceName: "공식 페이지",
      sourceType: "official-page",
      lastVerifiedAt: "2026-07-25T00:00:00.000Z",
    };
    expect(() => validateContests([base])).toThrow(/HTTPS/);
  });
});

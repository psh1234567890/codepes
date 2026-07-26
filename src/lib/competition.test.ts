import { describe, expect, it } from "vitest";
import generatedData from "../data/competitions.generated.json";
import type { Competition } from "../types/competition";
import {
  DEFAULT_FILTERS,
  formatDday,
  matchesCompetition,
  normalizeSearchText,
} from "./competition";
import {
  isCompetitionData,
  selectNewestCompetitionData,
} from "./competition-data";
import {
  createCalendarFile,
  escapeCalendarText,
  foldCalendarLine,
} from "./calendar";

const contest: Competition = {
  id: "sample",
  title: "AI 데이터 해커톤",
  summary: "공공 데이터를 활용하는 온라인 대회",
  type: "ai-data",
  organizer: "테스트 기관",
  eligibilities: ["anyone"],
  mode: "online",
  applicationDeadline: "2026-08-01T09:00:00.000Z",
  eventStart: "2026-08-02T09:00:00.000Z",
  eventEnd: "2026-08-03T09:00:00.000Z",
  location: "온라인",
  tags: ["AI", "데이터"],
  url: "https://example.com/contest",
  sourceName: "공식 페이지",
  sourceType: "official-page",
  lastVerifiedAt: "2026-07-25T00:00:00.000Z",
};

describe("competition search", () => {
  it("normalizes Korean search spacing and case", () => {
    expect(normalizeSearchText("  AI   데이터  ")).toBe(" ai 데이터 ");
  });

  it("matches every search keyword", () => {
    expect(
      matchesCompetition(contest, "공공 온라인", DEFAULT_FILTERS),
    ).toBe(true);
    expect(
      matchesCompetition(contest, "공공 오프라인", DEFAULT_FILTERS),
    ).toBe(false);
  });

  it("keeps rules-dependent eligibility separate from public contests", () => {
    const rulesContest: Competition = {
      ...contest,
      id: "rules",
      url: "https://example.com/rules",
      eligibilities: ["rules"],
    };
    const rulesFilter = { ...DEFAULT_FILTERS, eligibility: "rules" as const };

    expect(matchesCompetition(contest, "", rulesFilter)).toBe(false);
    expect(matchesCompetition(rulesContest, "", rulesFilter)).toBe(true);
  });

  it("marks a deadline as closed immediately after it passes", () => {
    expect(
      formatDday(
        "2026-08-01T09:00:00.000Z",
        Date.parse("2026-08-01T09:00:01.000Z"),
      ),
    ).toBe("마감");
  });
});

describe("competition data validation", () => {
  const bundled = {
    updatedAt: "2026-07-24T00:00:00.000Z",
    contests: [contest],
  };

  it("accepts a valid generated payload", () => {
    expect(isCompetitionData(bundled)).toBe(true);
  });

  it("rejects invalid URLs and dates", () => {
    expect(
      isCompetitionData({
        ...bundled,
        contests: [{ ...contest, url: "javascript:alert(1)" }],
      }),
    ).toBe(false);
    expect(
      isCompetitionData({
        ...bundled,
        contests: [
          {
            ...contest,
            eventStart: "2026-08-04T09:00:00.000Z",
            eventEnd: "2026-08-03T09:00:00.000Z",
          },
        ],
      }),
    ).toBe(false);
  });

  it("rejects duplicate ids", () => {
    expect(
      isCompetitionData({
        ...bundled,
        contests: [contest, { ...contest, url: "https://example.com/two" }],
      }),
    ).toBe(false);
  });

  it("keeps the newest valid payload", () => {
    const newer = {
      ...bundled,
      updatedAt: "2026-07-25T00:00:00.000Z",
    };
    expect(selectNewestCompetitionData(bundled, newer)).toBe(newer);
  });

  it("ships a valid payload and labels Codeforces times as starts", () => {
    expect(isCompetitionData(generatedData)).toBe(true);
    const codeforcesContests = generatedData.contests.filter(
      (item) => item.sourceName === "Codeforces 공식 API",
    );
    expect(codeforcesContests.length).toBeGreaterThan(0);
    expect(
      codeforcesContests.every((item) => item.deadlineKind === "start"),
    ).toBe(true);
  });

  it("ships competitions from every enabled automatic source", () => {
    const sourceNames = new Set(
      generatedData.contests.map((item) => item.sourceName),
    );
    for (const sourceName of [
      "Codeforces 공식 API",
      "AtCoder 공식 대회 목록",
      "CodeChef 공식 API",
      "Devpost 공식 목록·일정",
      "CTFtime 공식 API",
    ]) {
      expect(sourceNames.has(sourceName)).toBe(true);
    }
    expect(
      generatedData.contests
        .filter((item) => item.sourceName === "Devpost 공식 목록·일정")
        .every(
          (item) =>
            item.mode === "online" &&
            item.eligibilities.includes("rules") &&
            item.tags.includes("한국 온라인 참가 가능"),
        ),
    ).toBe(true);
    expect(
      generatedData.contests
        .filter((item) => item.sourceName === "CTFtime 공식 API")
        .every(
          (item) =>
            item.mode === "online" &&
            item.eligibilities.includes("anyone") &&
            item.tags.includes("한국 온라인 참가 가능"),
        ),
    ).toBe(true);
  });
});

describe("calendar export", () => {
  it("escapes RFC 5545 text characters", () => {
    expect(escapeCalendarText("a,b;c\\d\nnext")).toBe(
      "a\\,b\\;c\\\\d\\nnext",
    );
  });

  it("creates one deadline event and a reminder", () => {
    const calendar = createCalendarFile([contest]);
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(calendar).toContain("TRIGGER:-P1D");
    expect(calendar).toContain("[마감] AI 데이터 해커톤");
  });

  it("folds UTF-8 calendar lines to 75 octets", () => {
    const folded = foldCalendarLine(`SUMMARY:${"한글".repeat(40)}`);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

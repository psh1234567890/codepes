import { describe, expect, it } from "vitest";
import generatedData from "../data/competitions.generated.json";
import type { Competition } from "../types/competition";
import {
  DEFAULT_FILTERS,
  formatDate,
  formatDday,
  getDaysLeft,
  getDeadlineLabel,
  getOrganizerOptions,
  getSourceStatusPresentation,
  matchesCompetition,
  matchesOrganizer,
  normalizeOrganizerKey,
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

  it("keeps AI hackathons visible in both AI and hackathon filters", () => {
    const aiHackathon: Competition = {
      ...contest,
      tags: ["AI", "해커톤"],
    };

    expect(
      matchesCompetition(aiHackathon, "", {
        ...DEFAULT_FILTERS,
        type: "ai-data",
      }),
    ).toBe(true);
    expect(
      matchesCompetition(aiHackathon, "", {
        ...DEFAULT_FILTERS,
        type: "hackathon",
      }),
    ).toBe(true);
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

  it("filters by one or more selected organizers", () => {
    expect(
      matchesCompetition(contest, "", {
        ...DEFAULT_FILTERS,
        organizers: ["테스트 기관"],
      }),
    ).toBe(true);
    expect(
      matchesCompetition(contest, "", {
        ...DEFAULT_FILTERS,
        organizers: ["다른 기관", "테스트 기관"],
      }),
    ).toBe(true);
    expect(
      matchesCompetition(contest, "", {
        ...DEFAULT_FILTERS,
        organizers: ["다른 기관"],
      }),
    ).toBe(false);
  });

  it("normalizes organizer names and deduplicates organizer options", () => {
    expect(normalizeOrganizerKey("  CODEFORCES  ")).toBe("codeforces");
    expect(matchesOrganizer("Codeforces", [" codeforces "])).toBe(true);
    expect(
      getOrganizerOptions([
        contest,
        { ...contest, id: "two", organizer: " 테스트 기관 " },
        { ...contest, id: "three", organizer: "다른 기관" },
        { ...contest, id: "four", organizer: "   " },
      ]),
    ).toEqual(["다른 기관", "테스트 기관"]);
  });

  it("marks a deadline as closed immediately after it passes", () => {
    expect(
      formatDday(
        "2026-08-01T09:00:00.000Z",
        Date.parse("2026-08-01T09:00:01.000Z"),
      ),
    ).toBe("마감");
  });

  it("shows today for a future deadline on the same Korean calendar day", () => {
    const deadline = "2026-08-01T18:00:00+09:00";
    const now = Date.parse("2026-08-01T17:00:00+09:00");

    expect(getDaysLeft(deadline, now)).toBe(0);
    expect(formatDday(deadline, now)).toBe("오늘 마감");
    expect(formatDday(deadline, now, "start")).toBe("오늘 시작");
  });

  it("uses the Korean midnight boundary instead of rounding elapsed hours", () => {
    const deadline = "2026-08-02T00:00:00+09:00";
    const now = Date.parse("2026-08-01T23:59:00+09:00");

    expect(getDaysLeft(deadline, now)).toBe(1);
    expect(formatDday(deadline, now)).toBe("D-1");
    expect(
      formatDday(
        "2026-08-02T14:59:00.000Z",
        Date.parse("2026-08-01T15:01:00.000Z"),
      ),
    ).toBe("오늘 마감");
    expect(
      formatDday(
        "2026-08-03T00:01:00+09:00",
        Date.parse("2026-08-01T23:59:00+09:00"),
      ),
    ).toBe("D-2");
  });

  it("formats dates in the same Korean time zone as the calendar", () => {
    expect(formatDate("2026-08-01T15:30:00.000Z")).toBe("2026. 08. 02.");
  });

  it("distinguishes application deadlines from contest starts", () => {
    expect(getDeadlineLabel()).toBe("신청 마감");
    expect(getDeadlineLabel("start")).toBe("대회 시작");
    expect(
      formatDday(
        "2026-08-01T09:00:00.000Z",
        Date.parse("2026-08-01T08:59:00.000Z"),
        "start",
      ),
    ).toBe("오늘 시작");
    expect(
      formatDday(
        "2026-08-01T09:00:00.000Z",
        Date.parse("2026-08-01T09:00:01.000Z"),
        "start",
      ),
    ).toBe("시작됨");
  });
});

describe("competition data validation", () => {
  const bundled = {
    updatedAt: "2026-07-24T00:00:00.000Z",
    contests: [contest],
    sources: [
      {
        id: "official",
        name: "공식 페이지",
        kind: "automatic" as const,
        state: "ok" as const,
        lastCheckedAt: "2026-07-24T00:00:00.000Z",
        publishedCount: 1,
      },
    ],
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

  it.each([
    { languages: "Python" },
    { languages: ["Python", null] },
    { languages: [" "] },
    { eligibilityNote: { text: "대학생" } },
    { teamSize: 3 },
  ])("rejects optional fields that would break detail rendering: %j", (fields) => {
    expect(
      isCompetitionData({
        ...bundled,
        contests: [{ ...contest, ...fields }],
      }),
    ).toBe(false);
  });

  it("accepts correctly typed optional detail fields", () => {
    expect(
      isCompetitionData({
        ...bundled,
        contests: [{
          ...contest,
          languages: ["Python", "C++"],
          eligibilityNote: "대회별 자격 확인",
          teamSize: "1~3명",
        }],
      }),
    ).toBe(true);
  });

  it("rejects duplicate ids", () => {
    expect(
      isCompetitionData({
        ...bundled,
        contests: [contest, { ...contest, url: "https://example.com/two" }],
      }),
    ).toBe(false);
  });

  it("rejects duplicate or malformed source statuses", () => {
    expect(
      isCompetitionData({
        ...bundled,
        sources: [...bundled.sources, bundled.sources[0]],
      }),
    ).toBe(false);
    expect(
      isCompetitionData({
        ...bundled,
        sources: [{ ...bundled.sources[0], publishedCount: -1 }],
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

  it("ships a valid payload and labels published Codeforces times as starts", () => {
    expect(isCompetitionData(generatedData)).toBe(true);
    const codeforcesContests = generatedData.contests.filter(
      (item) => item.sourceName === "Codeforces 공식 API",
    );
    expect(
      codeforcesContests.every((item) => item.deadlineKind === "start"),
    ).toBe(true);
  });

  it("ships status entries for every enabled automatic source", () => {
    for (const [sourceId, sourceName] of [
      ["dacon", "DACON 공식 페이지"],
      ["codeforces", "Codeforces 공식 API"],
      ["atcoder", "AtCoder 공식 대회 목록"],
      ["codechef", "CodeChef 공식 API"],
      ["devpost", "Devpost 공식 목록·일정"],
      ["ctftime", "CTFtime 공식 API"],
      ["koi", "한국정보올림피아드 공식 안내"],
      ["kitpa-youth", "한국정보기술진흥원 공식 경시대회"],
      ["kookmin-algorithm", "국민대학교 공식 알고리즘대회"],
      ["ucpc", "UCPC 공식 대회 안내"],
      ["itch", "itch.io 공식 게임잼 목록"],
    ] as const) {
      const publishedCount = generatedData.contests.filter(
        (item) => item.sourceName === sourceName,
      ).length;
      expect(
        generatedData.sources.find((source) => source.id === sourceId),
      ).toMatchObject({
        kind: "automatic",
        publishedCount,
      });
    }
    expect(
      generatedData.contests
        .filter((item) => item.sourceName === "Devpost 공식 목록·일정")
        .every(
          (item) =>
            item.mode === "online" &&
            item.eligibilities.includes("rules") &&
            item.tags.includes("한국 온라인 참가 가능") &&
            !item.summary.includes("이(가)"),
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

describe("source status presentation", () => {
  const source = {
    id: "codeforces",
    name: "Codeforces",
    kind: "automatic" as const,
    state: "ok" as const,
    lastCheckedAt: "2026-07-28T00:00:00.000Z",
    publishedCount: 3,
  };

  it("separates healthy, stale, monitoring, and failed states", () => {
    expect(
      getSourceStatusPresentation(
        source,
        Date.parse("2026-07-28T01:00:00.000Z"),
      ).label,
    ).toBe("정상");
    expect(
      getSourceStatusPresentation(
        source,
        Date.parse("2026-07-30T00:00:00.000Z"),
      ).label,
    ).toBe("오래됨");
    expect(
      getSourceStatusPresentation(
        { ...source, kind: "monitor" },
        Date.parse("2026-07-28T01:00:00.000Z"),
      ).label,
    ).toBe("공고 감시");
    expect(
      getSourceStatusPresentation(
        { ...source, state: "error" },
        Date.parse("2026-07-28T01:00:00.000Z"),
      ).label,
    ).toBe("확인 실패");
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

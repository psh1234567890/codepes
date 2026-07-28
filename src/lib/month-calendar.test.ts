import { describe, expect, it } from "vitest";
import type { Competition } from "../types/competition";
import {
  buildMonthCalendar,
  getCompetitionsInMonth,
  getKoreaCalendarMonth,
  getKoreaDateKey,
  groupCompetitionsByKoreaDate,
  normalizeCalendarMonth,
  shiftCalendarMonth,
} from "./month-calendar";

const makeCompetition = (
  id: string,
  applicationDeadline: string,
): Competition => ({
  id,
  title: `${id} 대회`,
  summary: "테스트 대회",
  type: "ps",
  organizer: "테스트 기관",
  eligibilities: ["anyone"],
  mode: "online",
  applicationDeadline,
  eventStart: applicationDeadline,
  eventEnd: applicationDeadline,
  location: "온라인",
  tags: ["테스트"],
  url: `https://example.com/${id}`,
  sourceName: "공식 페이지",
  sourceType: "official-page",
  lastVerifiedAt: "2026-07-28T00:00:00.000Z",
});

describe("Korea calendar dates", () => {
  it("uses Asia/Seoul when an ISO timestamp crosses midnight", () => {
    expect(getKoreaDateKey("2026-07-31T14:59:59.999Z")).toBe("2026-07-31");
    expect(getKoreaDateKey("2026-07-31T15:00:00.000Z")).toBe("2026-08-01");
    expect(getKoreaCalendarMonth("2026-12-31T15:00:00.000Z")).toEqual({
      year: 2027,
      month: 1,
    });
  });

  it("rejects invalid timestamps instead of silently grouping them", () => {
    expect(() => getKoreaDateKey("not-a-date")).toThrow(RangeError);
  });
});

describe("calendar month navigation", () => {
  it("normalizes months outside the 1 to 12 range", () => {
    expect(normalizeCalendarMonth({ year: 2026, month: 13 })).toEqual({
      year: 2027,
      month: 1,
    });
    expect(normalizeCalendarMonth({ year: 2026, month: 0 })).toEqual({
      year: 2025,
      month: 12,
    });
  });

  it("moves across year boundaries", () => {
    expect(shiftCalendarMonth({ year: 2026, month: 12 }, 1)).toEqual({
      year: 2027,
      month: 1,
    });
    expect(shiftCalendarMonth({ year: 2026, month: 1 }, -1)).toEqual({
      year: 2025,
      month: 12,
    });
  });

  it("rejects fractional month movement", () => {
    expect(() =>
      shiftCalendarMonth({ year: 2026, month: 8 }, 0.5),
    ).toThrow(RangeError);
  });
});

describe("competition date grouping", () => {
  it("groups deadlines by their Korean date and preserves input order", () => {
    const first = makeCompetition("first", "2026-07-31T15:30:00.000Z");
    const second = makeCompetition("second", "2026-08-01T03:00:00.000Z");
    const previousDay = makeCompetition(
      "previous",
      "2026-07-31T14:30:00.000Z",
    );
    const grouped = groupCompetitionsByKoreaDate([
      first,
      second,
      previousDay,
    ]);

    expect(grouped.get("2026-08-01")?.map((item) => item.id)).toEqual([
      "first",
      "second",
    ]);
    expect(grouped.get("2026-07-31")?.map((item) => item.id)).toEqual([
      "previous",
    ]);
  });

  it("selects only competitions whose Korean date belongs to the month", () => {
    const competitions = [
      makeCompetition("july", "2026-07-31T14:59:59.999Z"),
      makeCompetition("august-boundary", "2026-07-31T15:00:00.000Z"),
      makeCompetition("august", "2026-08-31T14:59:59.999Z"),
      makeCompetition("september", "2026-08-31T15:00:00.000Z"),
    ];

    expect(
      getCompetitionsInMonth(competitions, { year: 2026, month: 8 }).map(
        (item) => item.id,
      ),
    ).toEqual(["august-boundary", "august"]);
  });
});

describe("six-week month grid", () => {
  it("builds 42 Sunday-first cells around August 2026", () => {
    const grid = buildMonthCalendar(
      { year: 2026, month: 8 },
      [],
      "2026-08-01T03:00:00.000Z",
    );

    expect(grid).toHaveLength(42);
    expect(grid[0]).toMatchObject({
      key: "2026-07-26",
      isCurrentMonth: false,
    });
    expect(grid[6]).toMatchObject({
      key: "2026-08-01",
      isCurrentMonth: true,
      isToday: true,
    });
    expect(grid[41]).toMatchObject({
      key: "2026-09-05",
      isCurrentMonth: false,
    });
  });

  it("includes leap day and keeps it in the current month", () => {
    const grid = buildMonthCalendar(
      { year: 2028, month: 2 },
      [],
      "2028-02-01T00:00:00.000Z",
    );

    expect(grid.find((day) => day.key === "2028-02-29")).toMatchObject({
      day: 29,
      isCurrentMonth: true,
    });
  });

  it("attaches every crowded-date competition without truncating data", () => {
    const competitions = Array.from({ length: 7 }, (_, index) =>
      makeCompetition(
        `crowded-${index + 1}`,
        `2026-08-01T${String(index).padStart(2, "0")}:00:00.000Z`,
      ),
    );
    const grid = buildMonthCalendar(
      { year: 2026, month: 8 },
      competitions,
      "2026-07-28T00:00:00.000Z",
    );
    const crowdedDay = grid.find((day) => day.key === "2026-08-01");

    expect(crowdedDay?.competitions).toHaveLength(7);
    expect(crowdedDay?.competitions.map((item) => item.id)).toEqual(
      competitions.map((item) => item.id),
    );
  });
});

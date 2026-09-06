import { describe, expect, it } from "vitest";
import type { Competition } from "../types/competition";
import { createCalendarFile, type CalendarReminder } from "./calendar";

const competition: Competition = {
  id: "calendar-test",
  title: "학생 알고리즘 대회",
  summary: "함께 푸는 알고리즘 문제",
  type: "ps",
  organizer: "테스트 대학",
  eligibilities: ["anyone"],
  mode: "online",
  applicationDeadline: "2026-09-10T18:00:00+09:00",
  deadlineKind: "application",
  eventStart: "2026-09-12T13:00:00+09:00",
  eventEnd: "2026-09-12T17:00:00+09:00",
  location: "온라인",
  tags: ["알고리즘"],
  url: "https://example.com/competition",
  sourceName: "공식 페이지",
  sourceType: "official-page",
  lastVerifiedAt: "2026-09-01T00:00:00Z",
};

const unfold = (calendar: string) => calendar.replace(/\r\n /g, "");
const getEvents = (calendar: string) =>
  unfold(calendar).match(/BEGIN:VEVENT\r\n[\s\S]*?END:VEVENT/g) ?? [];

describe("calendar reminder options", () => {
  it("preserves a single marker and one-day reminder by default", () => {
    const calendar = unfold(createCalendarFile([competition]));
    expect(getEvents(calendar)).toHaveLength(1);
    expect(calendar).toContain("UID:calendar-test@codepes\r\n");
    expect(calendar).toContain("DTSTART:20260910T090000Z\r\n");
    expect(calendar).toContain("DTEND:20260910T093000Z\r\n");
    expect(calendar).toContain("일정 구분: 신청 마감");
    expect(calendar).toContain("TRIGGER:-P1D\r\n");
  });

  it.each<[CalendarReminder, string]>([
    ["1h", "-PT1H"],
    ["1d", "-P1D"],
    ["3d", "-P3D"],
  ])("uses the selected %s reminder on both exported events", (reminder, trigger) => {
    const events = getEvents(createCalendarFile([competition], {
      reminder,
      includeEventPeriod: true,
    }));
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(event).toContain(`TRIGGER:${trigger}\r\n`);
      expect(event.match(/BEGIN:VALARM/g)).toHaveLength(1);
    }
  });

  it("omits every alarm when reminders are disabled", () => {
    const calendar = createCalendarFile([competition], {
      reminder: "none",
      includeEventPeriod: true,
    });
    expect(getEvents(calendar)).toHaveLength(2);
    expect(calendar).not.toContain("VALARM");
    expect(calendar).not.toContain("TRIGGER");
  });
});

describe("calendar event periods", () => {
  it("exports distinct application and actual competition dates as UTC instants", () => {
    const events = getEvents(createCalendarFile([competition], {
      includeEventPeriod: true,
    }));
    expect(events[0]).toContain("SUMMARY:[마감] 학생 알고리즘 대회\r\n");
    expect(events[0]).toContain("DTSTART:20260910T090000Z\r\n");
    expect(events[1]).toContain("SUMMARY:[대회 일정] 학생 알고리즘 대회\r\n");
    expect(events[1]).toContain("DTSTART:20260912T040000Z\r\n");
    expect(events[1]).toContain("DTEND:20260912T080000Z\r\n");
    expect(events[1]).toContain("UID:calendar-test@codepes-event\r\n");
  });

  it("extends a start marker without creating a duplicate start event", () => {
    const startCompetition = {
      ...competition,
      deadlineKind: "start" as const,
      applicationDeadline: competition.eventStart,
    };
    const original = getEvents(createCalendarFile([startCompetition]));
    const extended = getEvents(createCalendarFile([startCompetition], {
      includeEventPeriod: true,
    }));
    expect(original).toHaveLength(1);
    expect(extended).toHaveLength(1);
    expect(extended[0]).toContain("SUMMARY:[시작] 학생 알고리즘 대회\r\n");
    expect(extended[0]).toContain("DTEND:20260912T080000Z\r\n");
    expect(extended[0]?.match(/UID:[^\r]+/)?.[0]).toBe(
      original[0]?.match(/UID:[^\r]+/)?.[0],
    );
  });

  it("does not invent an event duration when the source has equal start and end", () => {
    const events = getEvents(createCalendarFile([{
      ...competition,
      eventEnd: competition.eventStart,
    }], { includeEventPeriod: true }));
    expect(events[1]).toContain("DTSTART:20260912T040000Z\r\n");
    expect(events[1]).not.toContain("DTEND:");
  });

  it("keeps identifiers unique across repeated contests and event namespaces", () => {
    const calendar = unfold(createCalendarFile([
      competition,
      competition,
      { ...competition, id: "calendar-test-event" },
    ], { includeEventPeriod: true }));
    const identifiers = calendar.match(/^UID:.+$/gm) ?? [];
    expect(identifiers).toHaveLength(4);
    expect(new Set(identifiers).size).toBe(4);
  });
});

describe("calendar text safety", () => {
  it("escapes newlines and delimiters in event and alarm text", () => {
    const calendar = unfold(createCalendarFile([{
      ...competition,
      title: "대회,학생;참가\\안내\r\nBEGIN:VALARM\r주의",
      location: "서울,한국;온라인",
    }]));
    expect(calendar).toContain("대회\\,학생\\;참가\\\\안내\\nBEGIN:VALARM\\n주의");
    expect(calendar).toContain("LOCATION:서울\\,한국\\;온라인\r\n");
    expect(calendar.match(/^BEGIN:VALARM$/gm)).toHaveLength(1);
  });

  it("keeps every physical UTF-8 line within the 75-octet limit", () => {
    const calendar = createCalendarFile([{
      ...competition,
      title: "한글 대회 🌟 ".repeat(30),
    }], { includeEventPeriod: true, reminder: "3d" });
    for (const line of calendar.split("\r\n")) {
      expect(new TextEncoder().encode(line).byteLength).toBeLessThanOrEqual(75);
    }
  });
});

import type { Competition } from "../types/competition";

const CRLF = "\r\n";
const encoder = new TextEncoder();

export type CalendarReminder = "none" | "1h" | "1d" | "3d";

export interface CalendarExportOptions {
  reminder?: CalendarReminder;
  includeEventPeriod?: boolean;
}

const REMINDERS = {
  "1h": { trigger: "-PT1H", label: "1시간 전" },
  "1d": { trigger: "-P1D", label: "하루 전" },
  "3d": { trigger: "-P3D", label: "3일 전" },
} satisfies Record<Exclude<CalendarReminder, "none">, {
  trigger: string;
  label: string;
}>;

export const escapeCalendarText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

export const toCalendarDate = (value: string) =>
  new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

export const foldCalendarLine = (line: string) => {
  const folded = [""];
  for (const character of line) {
    const currentIndex = folded.length - 1;
    const candidate = `${folded[currentIndex]}${character}`;
    const limit = currentIndex === 0 ? 75 : 74;
    if (
      folded[currentIndex].length > 0 &&
      encoder.encode(candidate).length > limit
    ) {
      folded.push(character);
    } else {
      folded[currentIndex] = candidate;
    }
  }
  return folded.join(`${CRLF} `);
};

export const createCalendarFile = (
  competitions: Competition[],
  { reminder = "1d", includeEventPeriod = false }: CalendarExportOptions = {},
) => {
  const generatedAt = toCalendarDate(new Date().toISOString());
  const seenIds = new Set<string>();
  const events = competitions.flatMap((competition) => {
    if (seenIds.has(competition.id)) return [];
    seenIds.add(competition.id);

    const isStart = competition.deadlineKind === "start";
    const markerStart = new Date(competition.applicationDeadline);
    const eventSpecs = [{
      uid: `${competition.id}@codepes`,
      label: isStart ? "시작" : "마감",
      descriptionLabel: isStart ? "대회 시작" : "신청 마감",
      start: includeEventPeriod && isStart
        ? new Date(competition.eventStart)
        : markerStart,
      end: includeEventPeriod && isStart
        ? new Date(competition.eventEnd)
        : new Date(markerStart.getTime() + 30 * 60 * 1000),
    }];

    if (includeEventPeriod && !isStart) {
      eventSpecs.push({
        uid: `${competition.id}@codepes-event`,
        label: "대회 일정",
        descriptionLabel: "대회 일정",
        start: new Date(competition.eventStart),
        end: new Date(competition.eventEnd),
      });
    }

    return eventSpecs.flatMap((event) => {
      const description = [
        competition.summary,
        `일정 구분: ${event.descriptionLabel}`,
        `주최: ${competition.organizer}`,
        `공식 페이지: ${competition.url}`,
        "일정은 공식 페이지에서 다시 확인해 주세요.",
      ].join("\n");
      const alarm = reminder === "none" ? [] : [
        "BEGIN:VALARM",
        `TRIGGER:${REMINDERS[reminder].trigger}`,
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeCalendarText(
          `${competition.title} ${event.descriptionLabel} ${REMINDERS[reminder].label}`,
        )}`,
        "END:VALARM",
      ];

      return [
        "BEGIN:VEVENT",
        `UID:${escapeCalendarText(event.uid)}`,
        `DTSTAMP:${generatedAt}`,
        `DTSTART:${toCalendarDate(event.start.toISOString())}`,
        // Equal timestamps mean the source does not provide a duration.
        ...(event.end > event.start
          ? [`DTEND:${toCalendarDate(event.end.toISOString())}`]
          : []),
        `SUMMARY:${escapeCalendarText(`[${event.label}] ${competition.title}`)}`,
        `DESCRIPTION:${escapeCalendarText(description)}`,
        `LOCATION:${escapeCalendarText(competition.location)}`,
        `URL:${new URL(competition.url).href}`,
        ...alarm,
        "END:VEVENT",
      ];
    });
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CodePes//Competition Deadlines//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
    "",
  ]
    .map(foldCalendarLine)
    .join(CRLF);
};

export const downloadCalendarFile = (
  competitions: Competition[],
  filename = "codepes-deadlines.ics",
  options: CalendarExportOptions = {},
) => {
  if (competitions.length === 0) return false;

  const blob = new Blob([createCalendarFile(competitions, options)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
};

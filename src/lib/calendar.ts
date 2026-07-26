import type { Competition } from "../types/competition";

const CRLF = "\r\n";
const encoder = new TextEncoder();

export const escapeCalendarText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
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

export const createCalendarFile = (competitions: Competition[]) => {
  const generatedAt = toCalendarDate(new Date().toISOString());
  const events = competitions.flatMap((competition) => {
    const start = new Date(competition.applicationDeadline);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const description = [
      competition.summary,
      `주최: ${competition.organizer}`,
      `공식 페이지: ${competition.url}`,
      "일정은 공식 페이지에서 다시 확인해 주세요.",
    ].join("\n");

    return [
      "BEGIN:VEVENT",
      `UID:${escapeCalendarText(`${competition.id}@codepes`)}`,
      `DTSTAMP:${generatedAt}`,
      `DTSTART:${toCalendarDate(start.toISOString())}`,
      `DTEND:${toCalendarDate(end.toISOString())}`,
      `SUMMARY:${escapeCalendarText(
        `[${competition.deadlineKind === "start" ? "시작" : "마감"}] ${competition.title}`,
      )}`,
      `DESCRIPTION:${escapeCalendarText(description)}`,
      `URL:${competition.url}`,
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeCalendarText(
        `${competition.title} ${
          competition.deadlineKind === "start" ? "시작" : "마감"
        } 하루 전`,
      )}`,
      "END:VALARM",
      "END:VEVENT",
    ];
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
) => {
  if (competitions.length === 0) return false;

  const blob = new Blob([createCalendarFile(competitions)], {
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

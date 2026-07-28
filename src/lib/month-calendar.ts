import type { Competition } from "../types/competition";

export const KOREA_TIME_ZONE = "Asia/Seoul";
export const CALENDAR_WEEKDAYS = [
  "일",
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
] as const;

export interface CalendarMonth {
  year: number;
  month: number;
}

export interface KoreaDateParts extends CalendarMonth {
  day: number;
}

export interface MonthCalendarDay extends KoreaDateParts {
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  competitions: Competition[];
}

const koreaDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const toValidDate = (value: string | number | Date) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError(`유효하지 않은 날짜입니다: ${String(value)}`);
  }
  return date;
};

const padDatePart = (value: number) => String(value).padStart(2, "0");

export const toCalendarDateKey = ({
  year,
  month,
  day,
}: KoreaDateParts) =>
  `${year}-${padDatePart(month)}-${padDatePart(day)}`;

export const getKoreaDateParts = (
  value: string | number | Date,
): KoreaDateParts => {
  const parts = koreaDateFormatter.formatToParts(toValidDate(value));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(values.get("year"));
  const month = Number(values.get("month"));
  const day = Number(values.get("day"));

  if (![year, month, day].every(Number.isInteger)) {
    throw new RangeError(`한국 날짜로 변환할 수 없습니다: ${String(value)}`);
  }

  return { year, month, day };
};

export const getKoreaDateKey = (value: string | number | Date) =>
  toCalendarDateKey(getKoreaDateParts(value));

export const getKoreaCalendarMonth = (
  value: string | number | Date,
): CalendarMonth => {
  const { year, month } = getKoreaDateParts(value);
  return { year, month };
};

export const normalizeCalendarMonth = ({
  year,
  month,
}: CalendarMonth): CalendarMonth => {
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new RangeError("연도와 월은 정수여야 합니다.");
  }
  const normalized = new Date(Date.UTC(year, month - 1, 1));
  return {
    year: normalized.getUTCFullYear(),
    month: normalized.getUTCMonth() + 1,
  };
};

export const shiftCalendarMonth = (
  month: CalendarMonth,
  amount: number,
): CalendarMonth => {
  if (!Number.isInteger(amount)) {
    throw new RangeError("이동할 월 수는 정수여야 합니다.");
  }
  return normalizeCalendarMonth({
    year: month.year,
    month: month.month + amount,
  });
};

export const isSameCalendarMonth = (
  left: CalendarMonth,
  right: CalendarMonth,
) => left.year === right.year && left.month === right.month;

export const groupCompetitionsByKoreaDate = (
  competitions: Competition[],
) => {
  const grouped = new Map<string, Competition[]>();

  for (const competition of competitions) {
    const key = getKoreaDateKey(competition.applicationDeadline);
    const items = grouped.get(key);
    if (items) {
      items.push(competition);
    } else {
      grouped.set(key, [competition]);
    }
  }

  return grouped;
};

export const getCompetitionsInMonth = (
  competitions: Competition[],
  month: CalendarMonth,
) => {
  const normalizedMonth = normalizeCalendarMonth(month);
  return competitions.filter((competition) =>
    isSameCalendarMonth(
      getKoreaCalendarMonth(competition.applicationDeadline),
      normalizedMonth,
    ),
  );
};

export const buildMonthCalendar = (
  month: CalendarMonth,
  competitions: Competition[],
  now: string | number | Date = new Date(),
): MonthCalendarDay[] => {
  const normalizedMonth = normalizeCalendarMonth(month);
  const firstOfMonth = new Date(
    Date.UTC(normalizedMonth.year, normalizedMonth.month - 1, 1),
  );
  const gridStart = new Date(
    Date.UTC(
      normalizedMonth.year,
      normalizedMonth.month - 1,
      1 - firstOfMonth.getUTCDay(),
    ),
  );
  const grouped = groupCompetitionsByKoreaDate(competitions);
  const todayKey = getKoreaDateKey(now);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    const parts = {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
    const key = toCalendarDateKey(parts);

    return {
      ...parts,
      key,
      isCurrentMonth: isSameCalendarMonth(parts, normalizedMonth),
      isToday: key === todayKey,
      competitions: grouped.get(key) ?? [],
    };
  });
};

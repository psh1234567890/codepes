import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import type { Competition } from "../types/competition";
import {
  buildMonthCalendar,
  CALENDAR_WEEKDAYS,
  getCompetitionsInMonth,
  getKoreaCalendarMonth,
  getKoreaDateKey,
  groupCompetitionsByKoreaDate,
  isSameCalendarMonth,
  KOREA_TIME_ZONE,
  normalizeCalendarMonth,
  shiftCalendarMonth,
  toCalendarDateKey,
  type CalendarMonth,
  type MonthCalendarDay,
} from "../lib/month-calendar";

export interface CompetitionCalendarProps {
  competitions: Competition[];
  selectedId?: string;
  onSelect: (id: string) => void;
  initialMonth?: CalendarMonth;
  now?: string | number | Date;
  maxVisibleEvents?: number;
}

const koreaDateLabelFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const koreaTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KOREA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFromKey = (key: string) => new Date(`${key}T00:00:00+09:00`);

const formatDateLabel = (key: string) =>
  koreaDateLabelFormatter.format(dateFromKey(key));

const getScheduleKind = (competition: Competition) =>
  competition.deadlineKind === "start" ? "시작" : "마감";

const getFirstDateKeyInMonth = (
  competitions: Competition[],
  month: CalendarMonth,
) => {
  const first = getCompetitionsInMonth(competitions, month)
    .map((competition) => ({
      competition,
      key: getKoreaDateKey(competition.applicationDeadline),
    }))
    .sort(
      (left, right) =>
        Date.parse(left.competition.applicationDeadline) -
        Date.parse(right.competition.applicationDeadline),
    )[0];

  return (
    first?.key ??
    toCalendarDateKey({
      ...normalizeCalendarMonth(month),
      day: 1,
    })
  );
};

const getInitialMonth = (
  competitions: Competition[],
  selectedId: string | undefined,
  initialMonth: CalendarMonth | undefined,
  now: string | number | Date,
) => {
  const selected = competitions.find(
    (competition) => competition.id === selectedId,
  );
  if (selected) {
    return getKoreaCalendarMonth(selected.applicationDeadline);
  }
  if (initialMonth) return normalizeCalendarMonth(initialMonth);
  return getKoreaCalendarMonth(now);
};

const getInitialDateKey = (
  competitions: Competition[],
  selectedId: string | undefined,
  month: CalendarMonth,
  now: string | number | Date,
) => {
  const selected = competitions.find(
    (competition) => competition.id === selectedId,
  );
  if (selected) return getKoreaDateKey(selected.applicationDeadline);

  const todayMonth = getKoreaCalendarMonth(now);
  if (isSameCalendarMonth(todayMonth, month)) return getKoreaDateKey(now);
  return getFirstDateKeyInMonth(competitions, month);
};

const toWeeks = (days: MonthCalendarDay[]) =>
  Array.from({ length: 6 }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  );

export function CompetitionCalendar({
  competitions,
  selectedId,
  onSelect,
  initialMonth,
  now = new Date(),
  maxVisibleEvents = 2,
}: CompetitionCalendarProps) {
  const monthHeadingId = useId();
  const agendaHeadingId = useId();
  const agendaId = useId();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getInitialMonth(competitions, selectedId, initialMonth, now),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    getInitialDateKey(
      competitions,
      selectedId,
      getInitialMonth(competitions, selectedId, initialMonth, now),
      now,
    ),
  );
  const todayKey = getKoreaDateKey(now);
  const todayMonth = getKoreaCalendarMonth(now);
  const visibleEventLimit = Math.max(0, Math.floor(maxVisibleEvents));

  useEffect(() => {
    if (!selectedId) return;
    const selected = competitions.find(
      (competition) => competition.id === selectedId,
    );
    if (!selected) return;

    const nextDateKey = getKoreaDateKey(selected.applicationDeadline);
    setSelectedDateKey(nextDateKey);
    setVisibleMonth(
      getKoreaCalendarMonth(selected.applicationDeadline),
    );
  }, [competitions, selectedId]);

  const days = useMemo(
    () => buildMonthCalendar(visibleMonth, competitions, now),
    [competitions, now, visibleMonth],
  );
  const weeks = useMemo(() => toWeeks(days), [days]);
  const groupedCompetitions = useMemo(
    () => groupCompetitionsByKoreaDate(competitions),
    [competitions],
  );
  const selectedDateCompetitions =
    groupedCompetitions.get(selectedDateKey) ?? [];
  const visibleMonthCount = useMemo(
    () => getCompetitionsInMonth(competitions, visibleMonth).length,
    [competitions, visibleMonth],
  );

  const moveToMonth = (month: CalendarMonth) => {
    const normalized = normalizeCalendarMonth(month);
    setVisibleMonth(normalized);
    setSelectedDateKey(getFirstDateKeyInMonth(competitions, normalized));
  };

  const selectDay = (day: MonthCalendarDay) => {
    const dayMonth = { year: day.year, month: day.month };
    if (!isSameCalendarMonth(dayMonth, visibleMonth)) {
      setVisibleMonth(dayMonth);
    }
    setSelectedDateKey(day.key);
  };

  const selectCompetition = (
    competition: Competition,
    day: MonthCalendarDay,
  ) => {
    selectDay(day);
    onSelect(competition.id);
  };

  const goToToday = () => {
    setVisibleMonth(todayMonth);
    setSelectedDateKey(todayKey);
  };

  return (
    <section
      className="competition-calendar"
      aria-labelledby={monthHeadingId}
    >
      <div className="calendar-toolbar">
        <div className="calendar-navigation">
          <button
            type="button"
            aria-label={`${visibleMonth.year}년 ${visibleMonth.month}월의 이전 달 보기`}
            onClick={() =>
              moveToMonth(shiftCalendarMonth(visibleMonth, -1))
            }
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" onClick={goToToday}>
            <CalendarDays aria-hidden="true" />
            오늘
          </button>
          <button
            type="button"
            aria-label={`${visibleMonth.year}년 ${visibleMonth.month}월의 다음 달 보기`}
            onClick={() =>
              moveToMonth(shiftCalendarMonth(visibleMonth, 1))
            }
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>

        <h3 id={monthHeadingId} aria-live="polite">
          {visibleMonth.year}년 {visibleMonth.month}월
          <span>{visibleMonthCount}개 일정</span>
        </h3>

        <div className="calendar-legend" aria-label="일정 구분">
          <span className="calendar-kind kind-application">마감</span>
          <span className="calendar-kind kind-start">시작</span>
        </div>
      </div>

      <div className="month-calendar-scroll">
        <table className="month-calendar">
          <caption className="sr-only">
            {visibleMonth.year}년 {visibleMonth.month}월 대회 신청 마감 및 시작
            일정
          </caption>
          <thead>
            <tr>
              {CALENDAR_WEEKDAYS.map((weekday) => (
                <th key={weekday} scope="col">
                  {weekday}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]?.key}>
                {week.map((day) => {
                  const overflowCount = Math.max(
                    0,
                    day.competitions.length - visibleEventLimit,
                  );
                  const selected = selectedDateKey === day.key;

                  return (
                    <td
                      key={day.key}
                      className={[
                        day.isCurrentMonth ? "" : "is-outside-month",
                        day.isToday ? "is-today" : "",
                        selected ? "is-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <button
                        type="button"
                        className="calendar-day-button"
                        aria-label={`${formatDateLabel(day.key)}, ${
                          day.competitions.length > 0
                            ? `일정 ${day.competitions.length}개`
                            : "일정 없음"
                        }`}
                        aria-pressed={selected}
                        aria-current={day.isToday ? "date" : undefined}
                        aria-controls={agendaId}
                        onClick={() => selectDay(day)}
                      >
                        <time dateTime={day.key}>{day.day}</time>
                        {day.isToday ? <small>오늘</small> : null}
                      </button>

                      {day.competitions.length > 0 ? (
                        <ul className="calendar-cell-events">
                          {day.competitions
                            .slice(0, visibleEventLimit)
                            .map((competition) => {
                              const kind = getScheduleKind(competition);
                              return (
                                <li key={competition.id}>
                                  <button
                                    type="button"
                                    className={`calendar-event type-${competition.type}`}
                                    aria-label={`${formatDateLabel(day.key)} ${kind}, ${competition.title}`}
                                    aria-pressed={
                                      competition.id === selectedId
                                    }
                                    onClick={() =>
                                      selectCompetition(competition, day)
                                    }
                                  >
                                    <small
                                      className={`calendar-kind ${
                                        competition.deadlineKind === "start"
                                          ? "kind-start"
                                          : "kind-application"
                                      }`}
                                    >
                                      {kind}
                                    </small>
                                    <span>{competition.title}</span>
                                  </button>
                                </li>
                              );
                            })}
                        </ul>
                      ) : null}

                      {overflowCount > 0 ? (
                        <button
                          type="button"
                          className="calendar-overflow"
                          aria-controls={agendaId}
                          onClick={() => selectDay(day)}
                        >
                          {overflowCount}개 더 보기
                        </button>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibleMonthCount === 0 ? (
        <p className="calendar-month-empty" role="status">
          이 달에는 현재 조건에 맞는 대회가 없습니다.
        </p>
      ) : null}

      <section
        id={agendaId}
        className="calendar-day-agenda"
        aria-labelledby={agendaHeadingId}
      >
        <div className="calendar-day-agenda-heading">
          <h4 id={agendaHeadingId}>
            {formatDateLabel(selectedDateKey)}
            <span>{selectedDateCompetitions.length}개</span>
          </h4>
        </div>

        {selectedDateCompetitions.length > 0 ? (
          <ul>
            {selectedDateCompetitions.map((competition) => {
              const kind = getScheduleKind(competition);
              return (
                <li key={competition.id}>
                  <button
                    type="button"
                    aria-pressed={competition.id === selectedId}
                    onClick={() => onSelect(competition.id)}
                  >
                    <span
                      className={`calendar-kind ${
                        competition.deadlineKind === "start"
                          ? "kind-start"
                          : "kind-application"
                      }`}
                    >
                      {kind}
                    </span>
                    <strong>{competition.title}</strong>
                    <span>{competition.organizer}</span>
                    <time dateTime={competition.applicationDeadline}>
                      {koreaTimeFormatter.format(
                        new Date(competition.applicationDeadline),
                      )}
                    </time>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="calendar-day-empty" role="status">
            선택한 날짜에는 일정이 없습니다.
          </p>
        )}
      </section>
    </section>
  );
}

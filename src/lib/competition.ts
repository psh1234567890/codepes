import type {
  Competition,
  CompetitionFilters,
  CompetitionType,
  Eligibility,
  ParticipationMode,
} from "../types/competition";

export const TYPE_LABELS: Record<CompetitionType, string> = {
  ps: "PS·알고리즘",
  hackathon: "해커톤",
  "ai-data": "AI·데이터",
  game: "게임",
  security: "보안",
};

export const ELIGIBILITY_LABELS: Record<Eligibility, string> = {
  anyone: "누구나",
  university: "대학생",
  youth: "중·고등학생",
  employee: "직장인",
  rules: "대회별 확인",
};

export const MODE_LABELS: Record<ParticipationMode, string> = {
  online: "온라인",
  offline: "오프라인",
  hybrid: "혼합",
};

export const DEFAULT_FILTERS: CompetitionFilters = {
  type: "all",
  eligibility: "all",
  mode: "all",
  organizers: [],
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const getDaysLeft = (deadline: string, now = Date.now()) =>
  Math.ceil((new Date(deadline).getTime() - now) / DAY_MS);

export const formatDday = (deadline: string, now = Date.now()) => {
  if (new Date(deadline).getTime() < now) return "마감";
  const days = getDaysLeft(deadline, now);
  if (days === 0) return "오늘 마감";
  return `D-${days}`;
};

export const formatDate = (
  value: string,
  options?: Intl.DateTimeFormatOptions,
) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  }).format(new Date(value));

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

export const formatDateRange = (start: string, end: string) =>
  `${formatDate(start)} ~ ${formatDate(end)}`;

export const eligibilitySummary = (competition: Competition) => {
  if (competition.eligibilities.includes("anyone")) return "누구나";
  return competition.eligibilities
    .map((item) => ELIGIBILITY_LABELS[item])
    .join("·");
};

export const normalizeSearchText = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ");

export const normalizeOrganizerKey = (value: string) =>
  normalizeSearchText(value.trim());

export const matchesOrganizer = (
  organizer: string,
  selectedOrganizers: Iterable<string>,
) => {
  const organizerKey = normalizeOrganizerKey(organizer);
  const selectedKeys = new Set(
    [...selectedOrganizers]
      .map(normalizeOrganizerKey)
      .filter(Boolean),
  );
  return selectedKeys.size === 0 || selectedKeys.has(organizerKey);
};

export const getOrganizerOptions = (competitions: Competition[]) => {
  const organizersByKey = new Map<string, string>();
  for (const competition of competitions) {
    const organizer = competition.organizer.trim();
    const key = normalizeOrganizerKey(organizer);
    if (key && !organizersByKey.has(key)) {
      organizersByKey.set(key, organizer);
    }
  }
  return [...organizersByKey.values()].sort((a, b) =>
    a.localeCompare(b, "ko-KR"),
  );
};

const matchesType = (
  competition: Competition,
  type: CompetitionType | "all",
) => {
  if (type === "all" || competition.type === type) return true;
  return type === "hackathon" && competition.tags.includes("해커톤");
};

export const matchesCompetition = (
  competition: Competition,
  query: string,
  filters: CompetitionFilters,
) => {
  if (!matchesType(competition, filters.type)) {
    return false;
  }
  if (
    filters.eligibility !== "all" &&
    !competition.eligibilities.includes(filters.eligibility) &&
    !(
      filters.eligibility !== "rules" &&
      competition.eligibilities.includes("anyone")
    )
  ) {
    return false;
  }
  if (filters.mode !== "all" && competition.mode !== filters.mode) {
    return false;
  }
  if (!matchesOrganizer(competition.organizer, filters.organizers)) {
    return false;
  }

  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) return true;

  const searchable = normalizeSearchText(
    [
      competition.title,
      competition.summary,
      TYPE_LABELS[competition.type],
      competition.organizer,
      competition.eligibilityNote,
      competition.location,
      ...competition.tags,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return normalizedQuery
    .split(" ")
    .every((keyword) => searchable.includes(keyword));
};

export const getFreshnessText = (value: string) => {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );
  if (minutes < 1) return "방금 갱신";
  if (minutes < 60) return `${minutes}분 전 갱신`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 전 갱신`;
  return `${Math.floor(minutes / (24 * 60))}일 전 갱신`;
};

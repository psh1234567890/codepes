import { REMOTE_DATA_URL } from "../config";
import type {
  Competition,
  CompetitionData,
  CompetitionType,
  Eligibility,
  ParticipationMode,
  SourceType,
} from "../types/competition";

const COMPETITION_TYPES = new Set<CompetitionType>([
  "ps",
  "hackathon",
  "ai-data",
  "game",
  "security",
]);
const ELIGIBILITIES = new Set<Eligibility>([
  "anyone",
  "university",
  "youth",
  "employee",
]);
const MODES = new Set<ParticipationMode>(["online", "offline", "hybrid"]);
const SOURCE_TYPES = new Set<SourceType>([
  "official-api",
  "official-page",
  "submitted",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isIsoDate = (value: unknown): value is string =>
  isNonEmptyString(value) && Number.isFinite(Date.parse(value));

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isNonEmptyString);

const isHttpsUrl = (value: unknown): value is string => {
  if (!isNonEmptyString(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

export const isCompetition = (value: unknown): value is Competition => {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.summary) &&
    COMPETITION_TYPES.has(value.type as CompetitionType) &&
    isNonEmptyString(value.organizer) &&
    Array.isArray(value.eligibilities) &&
    value.eligibilities.length > 0 &&
    value.eligibilities.every((item) =>
      ELIGIBILITIES.has(item as Eligibility),
    ) &&
    MODES.has(value.mode as ParticipationMode) &&
    isIsoDate(value.applicationDeadline) &&
    (value.deadlineKind === undefined ||
      value.deadlineKind === "application" ||
      value.deadlineKind === "start") &&
    isIsoDate(value.eventStart) &&
    isIsoDate(value.eventEnd) &&
    isNonEmptyString(value.location) &&
    isStringArray(value.tags) &&
    Date.parse(value.eventStart as string) <=
      Date.parse(value.eventEnd as string) &&
    isHttpsUrl(value.url) &&
    isNonEmptyString(value.sourceName) &&
    SOURCE_TYPES.has(value.sourceType as SourceType) &&
    isIsoDate(value.lastVerifiedAt)
  );
};

export const isCompetitionData = (
  value: unknown,
): value is CompetitionData => {
  if (!isRecord(value) || !isIsoDate(value.updatedAt)) return false;
  if (!Array.isArray(value.contests)) return false;
  if (Date.parse(value.updatedAt) > Date.now() + 5 * 60_000) return false;

  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const contest of value.contests) {
    if (!isCompetition(contest)) return false;
    const normalizedUrl = new URL(contest.url).toString();
    if (ids.has(contest.id) || urls.has(normalizedUrl)) return false;
    ids.add(contest.id);
    urls.add(normalizedUrl);
  }
  return true;
};

export const selectNewestCompetitionData = (
  bundled: CompetitionData,
  candidate: CompetitionData,
) =>
  Date.parse(candidate.updatedAt) >= Date.parse(bundled.updatedAt)
    ? candidate
    : bundled;

export interface LoadedCompetitionData {
  data: CompetitionData;
  source: "github" | "bundled";
}

export const loadLatestCompetitionData = async (
  bundled: CompetitionData,
): Promise<LoadedCompetitionData> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6_000);

  try {
    const response = await fetch(REMOTE_DATA_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const candidate: unknown = await response.json();
    if (!isCompetitionData(candidate)) {
      throw new Error("invalid competition data");
    }

    const data = selectNewestCompetitionData(bundled, candidate);
    return {
      data,
      source: data === candidate ? "github" : "bundled",
    };
  } catch {
    return { data: bundled, source: "bundled" };
  } finally {
    window.clearTimeout(timeout);
  }
};

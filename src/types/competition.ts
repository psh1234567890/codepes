export type CompetitionType =
  | "ps"
  | "hackathon"
  | "ai-data"
  | "game"
  | "security";

export type Eligibility =
  | "anyone"
  | "university"
  | "youth"
  | "employee"
  | "rules";

export type ParticipationMode = "online" | "offline" | "hybrid";

export type SourceType = "official-api" | "official-page" | "submitted";
export type DeadlineKind = "application" | "start";
export type SourceStatusKind = "automatic" | "manual" | "monitor";
export type SourceSyncState = "ok" | "error";

export interface CompetitionSourceStatus {
  id: string;
  name: string;
  kind: SourceStatusKind;
  state: SourceSyncState;
  lastCheckedAt: string;
  publishedCount: number;
}

export interface Competition {
  id: string;
  title: string;
  summary: string;
  type: CompetitionType;
  organizer: string;
  eligibilities: Eligibility[];
  eligibilityNote?: string;
  mode: ParticipationMode;
  applicationDeadline: string;
  deadlineKind?: DeadlineKind;
  eventStart: string;
  eventEnd: string;
  location: string;
  teamSize?: string;
  languages?: string[];
  tags: string[];
  url: string;
  sourceName: string;
  sourceType: SourceType;
  lastVerifiedAt: string;
}

export interface CompetitionData {
  updatedAt: string;
  contests: Competition[];
  sources: CompetitionSourceStatus[];
}

export interface CompetitionFilters {
  type: CompetitionType | "all";
  eligibility: Eligibility | "all";
  mode: ParticipationMode | "all";
  organizers: string[];
}

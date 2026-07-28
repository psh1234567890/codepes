import {
  Bookmark,
  CalendarPlus,
  CalendarDays,
  Clock3,
  ExternalLink,
  Languages,
  MapPin,
  Monitor,
  Share2,
  Tags,
  Users,
} from "lucide-react";
import type { Competition } from "../types/competition";
import {
  eligibilitySummary,
  formatDateRange,
  formatDateTime,
  formatDday,
  getDeadlineLabel,
  getFreshnessText,
  MODE_LABELS,
  TYPE_LABELS,
} from "../lib/competition";
import { TypeIcon } from "./TypeIcon";

interface CompetitionDetailProps {
  competition: Competition;
  bookmarked: boolean;
  onBookmark: () => void;
  onAddToCalendar: () => void;
  onShare: () => void;
  mobile?: boolean;
}

export function CompetitionDetail({
  competition,
  bookmarked,
  onBookmark,
  onAddToCalendar,
  onShare,
  mobile = false,
}: CompetitionDetailProps) {
  return (
    <aside
      className={mobile ? "competition-detail is-mobile" : "competition-detail"}
      aria-label={`${competition.title} 상세 정보`}
    >
      <div className="detail-topline">
        <span className={`type-label type-${competition.type}`}>
          <TypeIcon type={competition.type} />
          {TYPE_LABELS[competition.type]}
        </span>
        <span className="source-freshness">
          {getFreshnessText(competition.lastVerifiedAt)}
        </span>
      </div>

      <div className="detail-heading">
        <h3>{competition.title}</h3>
        <button
          className={bookmarked ? "icon-button is-active" : "icon-button"}
          type="button"
          aria-label={bookmarked ? "즐겨찾기 해제" : "즐겨찾기"}
          aria-pressed={bookmarked}
          onClick={onBookmark}
        >
          <Bookmark fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="deadline-summary">
        <span>
          <CalendarDays aria-hidden="true" />
          {getDeadlineLabel(competition.deadlineKind)}
        </span>
        <strong>
          {formatDday(
            competition.applicationDeadline,
            Date.now(),
            competition.deadlineKind,
          )}
        </strong>
        <time dateTime={competition.applicationDeadline}>
          {formatDateTime(competition.applicationDeadline)}
        </time>
      </div>

      <dl className="detail-list">
        <div>
          <dt>
            <Clock3 aria-hidden="true" />
            대회 기간
          </dt>
          <dd>
            {formatDateRange(competition.eventStart, competition.eventEnd)}
          </dd>
        </div>
        <div>
          <dt>
            <Users aria-hidden="true" />
            참가 자격
          </dt>
          <dd>
            {competition.eligibilityNote ?? eligibilitySummary(competition)}
          </dd>
        </div>
        <div>
          <dt>
            <Monitor aria-hidden="true" />
            진행 방식
          </dt>
          <dd>{MODE_LABELS[competition.mode]}</dd>
        </div>
        <div>
          <dt>
            <MapPin aria-hidden="true" />
            개최 장소
          </dt>
          <dd>{competition.location}</dd>
        </div>
        {competition.languages && competition.languages.length > 0 ? (
          <div>
            <dt>
              <Languages aria-hidden="true" />
              사용 언어
            </dt>
            <dd>{competition.languages.join(", ")}</dd>
          </div>
        ) : null}
        <div className="tag-row">
          <dt>
            <Tags aria-hidden="true" />
            태그
          </dt>
          <dd>
            {competition.tags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </dd>
        </div>
      </dl>

      <p className="detail-summary">{competition.summary}</p>

      <div className="detail-actions">
        <button type="button" onClick={onAddToCalendar}>
          <CalendarPlus aria-hidden="true" />
          일정 파일
        </button>
        <button type="button" onClick={onShare}>
          <Share2 aria-hidden="true" />
          공유
        </button>
      </div>

      <a
        className="official-link"
        href={competition.url}
        target="_blank"
        rel="noreferrer"
      >
        <ExternalLink aria-hidden="true" />
        공식 페이지에서 참가하기
      </a>
      <p className="source-note">
        출처: {competition.sourceName} · 외부 사이트로 이동합니다.
      </p>
    </aside>
  );
}

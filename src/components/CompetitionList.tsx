import { Bookmark, Building2, ExternalLink, Monitor, User } from "lucide-react";
import type { Competition } from "../types/competition";
import {
  eligibilitySummary,
  formatDate,
  formatDday,
  MODE_LABELS,
  TYPE_LABELS,
} from "../lib/competition";
import { CompetitionDetail } from "./CompetitionDetail";
import { TypeIcon } from "./TypeIcon";
import { getContestPath } from "../lib/seo";

interface CompetitionListProps {
  competitions: Competition[];
  selectedId?: string;
  bookmarkedIds: Set<string>;
  onSelect: (id: string) => void;
  onBookmark: (id: string) => void;
  onAddToCalendar: (competition: Competition) => void;
  onShare: (competition: Competition) => void;
}

export function CompetitionList({
  competitions,
  selectedId,
  bookmarkedIds,
  onSelect,
  onBookmark,
  onAddToCalendar,
  onShare,
}: CompetitionListProps) {
  if (competitions.length === 0) {
    return (
      <div className="empty-state">
        <span>{"{ }"}</span>
        <h3>조건에 맞는 대회를 찾지 못했어요.</h3>
        <p>검색어를 줄이거나 필터를 초기화해 보세요.</p>
      </div>
    );
  }

  return (
    <div className="competition-list" role="list">
      <div className="list-header" aria-hidden="true">
        <span>대회 유형</span>
        <span>대회명 / 주제</span>
        <span>주최 기관</span>
        <span>참가 자격</span>
        <span>진행 방식</span>
        <span>신청/시작</span>
        <span />
        <span />
      </div>

      {competitions.map((competition) => {
        const selected = competition.id === selectedId;
        const bookmarked = bookmarkedIds.has(competition.id);

        return (
          <div
            key={competition.id}
            className={
              selected ? "competition-row is-selected" : "competition-row"
            }
            role="listitem"
          >
            <a
              className="competition-main"
              href={getContestPath(competition.id)}
              aria-expanded={selected}
              aria-controls={
                selected ? `competition-detail-${competition.id}` : undefined
              }
              onClick={(event) => {
                event.preventDefault();
                onSelect(competition.id);
              }}
            >
              <span className={`type-label type-${competition.type}`}>
                <TypeIcon type={competition.type} />
                {TYPE_LABELS[competition.type]}
              </span>
              <span className="competition-title">
                <strong>{competition.title}</strong>
                <small>{competition.summary}</small>
              </span>
              <span className="organizer">{competition.organizer}</span>
              <span>{eligibilitySummary(competition)}</span>
              <span>{MODE_LABELS[competition.mode]}</span>
              <span className="deadline-cell">
                <strong>{formatDday(competition.applicationDeadline)}</strong>
                <small>{formatDate(competition.applicationDeadline)}</small>
              </span>
            </a>

            <button
              className={bookmarked ? "row-action is-active" : "row-action"}
              type="button"
              aria-label={`${competition.title} ${
                bookmarked ? "즐겨찾기 해제" : "즐겨찾기"
              }`}
              aria-pressed={bookmarked}
              onClick={() => onBookmark(competition.id)}
            >
              <Bookmark fill={bookmarked ? "currentColor" : "none"} />
            </button>

            <a
              className="row-action external"
              href={competition.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${competition.title} 공식 페이지 새 창에서 열기`}
            >
              <ExternalLink />
            </a>

            {selected ? (
              <div
                id={`competition-detail-${competition.id}`}
                className="mobile-expanded-detail"
              >
                <div className="mobile-meta">
                  <span>
                    <Building2 aria-hidden="true" />
                    {competition.organizer}
                  </span>
                  <span>
                    <User aria-hidden="true" />
                    {eligibilitySummary(competition)}
                  </span>
                  <span>
                    <Monitor aria-hidden="true" />
                    {MODE_LABELS[competition.mode]}
                  </span>
                </div>
                <CompetitionDetail
                  competition={competition}
                  bookmarked={bookmarked}
                  onBookmark={() => onBookmark(competition.id)}
                  onAddToCalendar={() => onAddToCalendar(competition)}
                  onShare={() => onShare(competition)}
                  mobile
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

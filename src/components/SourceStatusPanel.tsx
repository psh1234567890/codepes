import { Activity, ChevronDown } from "lucide-react";
import type { CompetitionSourceStatus } from "../types/competition";
import {
  formatDateTime,
  getSourceStatusPresentation,
} from "../lib/competition";

interface SourceStatusPanelProps {
  sources: CompetitionSourceStatus[];
}

export function SourceStatusPanel({ sources }: SourceStatusPanelProps) {
  const rows = sources
    .map((source) => ({
      source,
      presentation: getSourceStatusPresentation(source),
    }))
    .sort((left, right) => {
      const priority = { error: 0, stale: 1, ok: 2, monitoring: 3 };
      return (
        priority[left.presentation.tone] -
          priority[right.presentation.tone] ||
        left.source.name.localeCompare(right.source.name, "ko-KR")
      );
    });
  const attentionCount = rows.filter(({ presentation }) =>
    ["error", "stale"].includes(presentation.tone),
  ).length;
  const monitoringCount = rows.filter(
    ({ presentation }) => presentation.tone === "monitoring",
  ).length;

  return (
    <details className="source-status-panel">
      <summary>
        <span className="source-status-title">
          <Activity aria-hidden="true" />
          데이터 출처 상태
        </span>
        <span className="source-status-summary">
          {sources.length}곳
          {attentionCount > 0 ? ` · 확인 필요 ${attentionCount}` : " · 정상"}
          {monitoringCount > 0 ? ` · 공고 감시 ${monitoringCount}` : ""}
        </span>
        <ChevronDown className="source-status-chevron" aria-hidden="true" />
      </summary>

      <div className="source-status-grid">
        {rows.map(({ source, presentation }) => (
          <div className="source-status-row" key={source.id}>
            <span
              className={`source-status-dot is-${presentation.tone}`}
              aria-hidden="true"
            />
            <span className="source-status-name">{source.name}</span>
            <span
              className={`source-status-label is-${presentation.tone}`}
              title={presentation.description}
            >
              {presentation.label}
            </span>
            <span className="source-status-count">
              {source.kind === "monitor"
                ? "게시 전 검토"
                : `${source.publishedCount}개 게시`}
            </span>
            <time dateTime={source.lastCheckedAt}>
              {formatDateTime(source.lastCheckedAt)} 확인
            </time>
          </div>
        ))}
      </div>
    </details>
  );
}

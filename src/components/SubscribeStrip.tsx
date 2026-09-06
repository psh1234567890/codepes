import { BookmarkCheck, CalendarPlus } from "lucide-react";

interface SubscribeStripProps {
  savedCount: number;
  onExportAll: () => void;
  onExportSaved: () => void;
  onShowSaved: () => void;
  onManageSaved: () => void;
}

export function SubscribeStrip({
  savedCount,
  onExportAll,
  onExportSaved,
  onShowSaved,
  onManageSaved,
}: SubscribeStripProps) {
  return (
    <section className="subscribe-strip" aria-labelledby="calendar-export-title">
      <div className="subscribe-copy">
        <span className="subscribe-icon">
          <CalendarPlus aria-hidden="true" />
        </span>
        <div>
          <h2 id="calendar-export-title">
            마감 전에, 내 캘린더가 알려주도록.
          </h2>
          <p>
            1시간·1일·3일 전 알림을 선택하고, 신청 마감과 대회 기간을 함께 보관하세요.
          </p>
        </div>
      </div>

      <div className="utility-actions">
        <button type="button" className="secondary-action" onClick={onManageSaved}>저장 목록 백업</button>
        <button
          type="button"
          className="secondary-action"
          onClick={onShowSaved}
        >
          <BookmarkCheck aria-hidden="true" />
          저장한 대회 {savedCount}
        </button>
        <button
          type="button"
          className="secondary-action"
          onClick={onExportSaved}
          disabled={savedCount === 0}
        >
          저장 일정 받기
        </button>
        <button type="button" onClick={onExportAll}>
          전체 일정 받기
        </button>
      </div>
    </section>
  );
}

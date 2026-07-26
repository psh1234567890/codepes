import { BookmarkCheck, CalendarPlus } from "lucide-react";

interface SubscribeStripProps {
  savedCount: number;
  onExportAll: () => void;
  onExportSaved: () => void;
  onShowSaved: () => void;
}

export function SubscribeStrip({
  savedCount,
  onExportAll,
  onExportSaved,
  onShowSaved,
}: SubscribeStripProps) {
  return (
    <section className="subscribe-strip" aria-labelledby="calendar-export-title">
      <div className="subscribe-copy">
        <span className="subscribe-icon">
          <CalendarPlus aria-hidden="true" />
        </span>
        <div>
          <h2 id="calendar-export-title">
            마감 일정을 내 캘린더에 보관하세요.
          </h2>
          <p>
            별도 가입 없이 .ics 파일로 내려받아 Google·Apple·Outlook
            캘린더에 추가할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="utility-actions">
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

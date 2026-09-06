import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Dialog } from "./Dialog";
import type { CalendarExportOptions, CalendarReminder } from "../lib/calendar";

interface CalendarExportDialogProps {
  count: number;
  onExport: (options: CalendarExportOptions) => void;
  onClose: () => void;
}

export function CalendarExportDialog({ count, onExport, onClose }: CalendarExportDialogProps) {
  const [reminder, setReminder] = useState<CalendarReminder>("1d");
  const [includeEventPeriod, setIncludeEventPeriod] = useState(false);

  return (
    <Dialog title="내 캘린더에 일정 추가" description={`${count}개 대회의 신청 마감·시작 일정을 .ics 파일로 받습니다.`} onClose={onClose}>
      <div className="settings-dialog-body">
        <label className="settings-field" htmlFor="calendar-reminder">
          미리 알림
          <select id="calendar-reminder" value={reminder} onChange={(event) => setReminder(event.target.value as CalendarReminder)}>
            <option value="none">알림 없음</option>
            <option value="1h">1시간 전</option>
            <option value="1d">1일 전</option>
            <option value="3d">3일 전</option>
          </select>
        </label>
        <label className="settings-checkbox">
          <input type="checkbox" checked={includeEventPeriod} onChange={(event) => setIncludeEventPeriod(event.target.checked)} />
          <span>실제 대회 기간도 함께 추가하기<small>신청 마감과 대회 일정을 구분해서 저장합니다.</small></span>
        </label>
        <div className="settings-card">
          <h3>캘린더에 넣는 방법</h3>
          <ol>
            <li>아래 버튼으로 일정 파일을 받으세요.</li>
            <li>Apple·Outlook에서는 파일을 열고, Google 캘린더 웹에서는 설정 → 가져오기/내보내기에서 파일을 선택하세요.</li>
            <li>가져온 일정의 시간과 알림을 확인하세요.</li>
          </ol>
          <p className="settings-help">알림은 캘린더 앱이 보냅니다. 앱에 따라 파일의 알림 설정을 적용하지 않을 수 있습니다. 이미 지난 알림 시각은 울리지 않을 수 있습니다.</p>
          <p className="settings-help">다운로드한 일정은 자동 갱신되지 않습니다. 일정 변경 여부는 공식 페이지에서 확인해 주세요.</p>
        </div>
        <button className="settings-button" type="button" onClick={() => onExport({ reminder, includeEventPeriod })} disabled={count === 0}>
          <CalendarPlus aria-hidden="true" /> {count}개 대회 일정 파일 받기
        </button>
      </div>
    </Dialog>
  );
}

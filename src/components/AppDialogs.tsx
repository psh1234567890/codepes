import { CalendarDays, CheckCircle2, ExternalLink, Link2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Competition } from "../types/competition";
import { formatDate, TYPE_LABELS } from "../lib/competition";
import { Dialog } from "./Dialog";

interface CalendarDialogProps {
  competitions: Competition[];
  onClose: () => void;
}

export function CalendarDialog({
  competitions,
  onClose,
}: CalendarDialogProps) {
  return (
    <Dialog
      title="대회 캘린더"
      description="가까운 신청 마감일을 날짜순으로 모아봤어요."
      onClose={onClose}
    >
      <div className="calendar-agenda">
        {competitions.slice(0, 10).map((competition) => (
          <a
            key={competition.id}
            href={competition.url}
            target="_blank"
            rel="noreferrer"
          >
            <time dateTime={competition.applicationDeadline}>
              <CalendarDays aria-hidden="true" />
              {formatDate(competition.applicationDeadline, {
                year: undefined,
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>
              <small>{TYPE_LABELS[competition.type]}</small>
              <strong>{competition.title}</strong>
            </span>
            <ExternalLink aria-hidden="true" />
          </a>
        ))}
      </div>
    </Dialog>
  );
}

export function SubmitCompetitionDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submission = {
      url: String(form.get("url") ?? ""),
      note: String(form.get("note") ?? ""),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem("codepes-submission-draft", JSON.stringify(submission));
    setSaved(true);
  };

  return (
    <Dialog
      title="새 대회 제보하기"
      description="공식 안내 페이지 주소를 남기면 중복 확인 뒤 검수할 수 있어요."
      onClose={onClose}
    >
      {saved ? (
        <div className="dialog-success">
          <CheckCircle2 aria-hidden="true" />
          <h3>이 기기에 제보 초안을 저장했어요.</h3>
          <p>
            현재는 MVP라 서버 전송 전 단계입니다. 백엔드 연결 후 바로 검수
            대기열로 보내도록 설계되어 있어요.
          </p>
          <button type="button" onClick={onClose}>
            확인
          </button>
        </div>
      ) : (
        <form className="submission-form" onSubmit={handleSubmit}>
          <label htmlFor="submission-url">공식 대회 페이지</label>
          <div className="input-with-icon">
            <Link2 aria-hidden="true" />
            <input
              id="submission-url"
              name="url"
              type="url"
              placeholder="https://..."
              required
            />
          </div>
          <label htmlFor="submission-note">알려주실 내용 (선택)</label>
          <textarea
            id="submission-note"
            name="note"
            placeholder="참가 자격이나 마감일처럼 꼭 확인할 내용을 적어주세요."
            rows={4}
          />
          <button type="submit">제보 초안 저장</button>
        </form>
      )}
    </Dialog>
  );
}

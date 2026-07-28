import {
  CheckCircle2,
  Github,
  Link2,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { GITHUB_ISSUES_URL } from "../config";
import { Dialog } from "./Dialog";

export function SubmitCompetitionDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [issueUrl, setIssueUrl] = useState<string>();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const officialUrl = String(form.get("url") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();
    const issue = new URL(`${GITHUB_ISSUES_URL}/new`);
    issue.searchParams.set("title", `[대회 제보] ${officialUrl}`);
    issue.searchParams.set(
      "body",
      [
        "## 공식 페이지",
        officialUrl,
        "",
        "## 제보 내용",
        note || "등록 또는 정보 수정을 요청합니다.",
        "",
        "## 확인",
        "- [ ] 공식 주최기관의 원문 링크임을 확인했습니다.",
      ].join("\n"),
    );

    const href = issue.toString();
    setIssueUrl(href);
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog
      title="대회 제보·정보 수정"
      description="공식 안내 페이지를 보내면 공개 GitHub 이슈에서 검증하고 반영합니다."
      onClose={onClose}
    >
      {issueUrl ? (
        <div className="dialog-success">
          <CheckCircle2 aria-hidden="true" />
          <h3>GitHub 제보 페이지를 열었습니다.</h3>
          <p>
            내용을 확인한 뒤 GitHub에서 이슈 등록을 마쳐 주세요. 팝업이 열리지
            않았다면 아래 버튼을 사용하세요.
          </p>
          <a
            className="dialog-primary-link"
            href={issueUrl}
            target="_blank"
            rel="noreferrer"
          >
            <Github aria-hidden="true" />
            GitHub에서 제보 마치기
          </a>
          <button type="button" className="secondary-action" onClick={onClose}>
            닫기
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
              inputMode="url"
              placeholder="https://..."
              required
            />
          </div>
          <label htmlFor="submission-note">알려주실 내용 (선택)</label>
          <textarea
            id="submission-note"
            name="note"
            placeholder="참가 자격, 마감일, 잘못된 정보 등 확인할 내용을 적어 주세요."
            rows={4}
          />
          <p className="form-note">
            입력 내용은 CodePes 서버에 저장되지 않으며 GitHub 이슈 작성 화면으로
            전달됩니다.
          </p>
          <button type="submit">
            <Github aria-hidden="true" />
            GitHub 제보 작성
          </button>
        </form>
      )}
    </Dialog>
  );
}

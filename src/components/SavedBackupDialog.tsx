import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Dialog } from "./Dialog";
import { createSavedBackup, MAX_BACKUP_BYTES, parseSavedBackup, type SavedBackup } from "../lib/saved-backup";

interface SavedBackupDialogProps {
  bookmarks: Set<string>;
  organizers: Set<string>;
  onImport: (backup: SavedBackup) => void;
  onClose: () => void;
}

export function SavedBackupDialog({ bookmarks, organizers, onImport, onClose }: SavedBackupDialogProps) {
  const [preview, setPreview] = useState<SavedBackup>();
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(false);

  const download = () => {
    const url = URL.createObjectURL(new Blob([createSavedBackup(bookmarks, organizers)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "codepes-saved.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("백업 파일을 내려받았습니다. 다른 기기에서 이 파일을 가져오세요.");
  };

  return (
    <Dialog title="저장 목록 백업" description="관심 대회와 주최기관을 파일로 옮겨 다른 브라우저에서도 이어 보세요." onClose={onClose}>
      <div className="settings-dialog-body">
        <section className="settings-card">
          <h3>이 브라우저에 저장된 목록</h3>
          <p>관심 대회 {bookmarks.size}개 · 관심 주최기관 {organizers.size}개</p>
          <p className="settings-help">현재 목록에 없는 지난 대회 ID도 백업에 보관됩니다.</p>
          <button className="settings-button" type="button" onClick={download} disabled={bookmarks.size + organizers.size === 0}>
            <Download aria-hidden="true" /> 백업 파일 받기
          </button>
        </section>
        <section className="settings-card">
          <h3>다른 기기의 목록 가져오기</h3>
          <label className="settings-field" htmlFor="backup-file">
            CodePes JSON 백업 파일 (최대 256KB)
            <input id="backup-file" type="file" accept=".json,application/json" disabled={reading} onChange={async (event) => {
              const file = event.target.files?.[0];
              setPreview(undefined);
              setMessage("");
              if (!file) return;
              setReading(true);
              try {
                if (file.size > MAX_BACKUP_BYTES) throw new Error("256KB 이하의 백업 파일을 선택해 주세요.");
                setPreview(parseSavedBackup(await file.text()));
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "파일을 읽지 못했습니다.");
              } finally {
                setReading(false);
              }
            }} />
          </label>
          {preview ? <div className="backup-preview">
            <p>관심 대회 {preview.bookmarks.length}개 · 주최기관 {preview.organizers.length}개를 확인했습니다.</p>
            <p className="settings-help">현재 저장 목록에 합칩니다. 중복 항목은 한 번만 저장됩니다.</p>
            <button className="settings-button" type="button" onClick={() => onImport(preview)}>
              <Upload aria-hidden="true" /> 현재 목록에 합치기
            </button>
          </div> : null}
        </section>
        <p className="settings-help">파일은 이 브라우저에서만 읽습니다. 자동 동기화 기능은 아니며, 실제 대회 정보는 최신 수집 목록을 기준으로 표시합니다.</p>
        {message ? <p className="settings-message" role="status">{message}</p> : null}
      </div>
    </Dialog>
  );
}

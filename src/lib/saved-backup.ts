import { normalizeOrganizerKey } from "./competition";

export const MAX_BACKUP_BYTES = 256 * 1024;
const MAX_ITEMS = 2000;

export interface SavedBackup {
  format: "codepes-saved";
  version: 1;
  exportedAt: string;
  bookmarks: string[];
  organizers: string[];
}

const cleanItems = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) {
    throw new Error("저장 목록 형식이나 항목 수를 확인해 주세요.");
  }
  if (value.some((item) => typeof item !== "string" || !item.trim() || item.length > 300)) {
    throw new Error("저장 목록에 올바르지 않은 항목이 있습니다.");
  }
  return [...new Set((value as string[]).map((item) => item.trim()))];
};

export const createSavedBackup = (
  bookmarks: Iterable<string>,
  organizers: Iterable<string>,
): string => JSON.stringify({
  format: "codepes-saved",
  version: 1,
  exportedAt: new Date().toISOString(),
  bookmarks: [...bookmarks],
  organizers: [...organizers],
} satisfies SavedBackup, null, 2);

export const parseSavedBackup = (raw: string): SavedBackup => {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES) {
    throw new Error("256KB 이하의 CodePes 백업 파일을 선택해 주세요.");
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("읽을 수 없는 파일입니다. CodePes에서 받은 JSON 백업을 선택해 주세요.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("CodePes 저장 목록 백업이 아닙니다.");
  }
  const data = value as Record<string, unknown>;
  if (data.format !== "codepes-saved" || data.version !== 1 ||
      typeof data.exportedAt !== "string" || !Number.isFinite(Date.parse(data.exportedAt))) {
    throw new Error("지원하지 않는 백업 형식입니다. CodePes에서 다시 내보내 주세요.");
  }
  return {
    format: "codepes-saved",
    version: 1,
    exportedAt: data.exportedAt,
    bookmarks: cleanItems(data.bookmarks),
    organizers: cleanItems(data.organizers),
  };
};

export const mergeSavedBackup = (
  bookmarks: Iterable<string>,
  organizers: Iterable<string>,
  backup: SavedBackup,
) => {
  const byKey = new Map<string, string>();
  for (const name of [...organizers, ...backup.organizers]) {
    const key = normalizeOrganizerKey(name);
    if (key && !byKey.has(key)) byKey.set(key, name.trim());
  }
  return {
    bookmarks: new Set([...bookmarks, ...backup.bookmarks]),
    organizers: new Set(byKey.values()),
  };
};

export interface StringStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const cleanStoredString = (value: string) => value.trim();

export const parseStoredStringSet = (raw: string | null): Set<string> => {
  if (raw === null) return new Set();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(
      parsed.flatMap((value) => {
        if (typeof value !== "string") return [];
        const cleaned = cleanStoredString(value);
        return cleaned ? [cleaned] : [];
      }),
    );
  } catch {
    return new Set();
  }
};

export const readStoredStringSet = (
  storage: Pick<StringStorage, "getItem">,
  key: string,
): Set<string> => {
  try {
    return parseStoredStringSet(storage.getItem(key));
  } catch {
    return new Set();
  }
};

export const writeStoredStringSet = (
  storage: Pick<StringStorage, "setItem">,
  key: string,
  values: Iterable<string>,
): boolean => {
  try {
    const cleaned = new Set<string>();
    for (const value of values) {
      const item = cleanStoredString(value);
      if (item) cleaned.add(item);
    }
    storage.setItem(key, JSON.stringify([...cleaned]));
    return true;
  } catch {
    return false;
  }
};

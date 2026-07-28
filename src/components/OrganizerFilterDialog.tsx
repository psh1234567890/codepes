import { Search, Star } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Dialog } from "./Dialog";

export interface OrganizerFilterSelection {
  selected: string[];
  favorites: Set<string>;
  favoriteOnly: boolean;
}

interface OrganizerFilterDialogProps {
  options: string[];
  selected: string[];
  favorites: Set<string>;
  favoriteOnly: boolean;
  onApply: (selection: OrganizerFilterSelection) => void;
  onClose: () => void;
}

const normalizeSearchValue = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase("ko-KR");

const cleanOrganizerName = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ");

const createCleanSet = (values: Iterable<string>) => {
  const result = new Set<string>();
  for (const value of values) {
    const cleaned = cleanOrganizerName(value);
    if (cleaned) result.add(cleaned);
  }
  return result;
};

export function OrganizerFilterDialog({
  options,
  selected,
  favorites,
  favoriteOnly,
  onApply,
  onClose,
}: OrganizerFilterDialogProps) {
  const searchDescriptionId = useId();
  const storageNoteId = useId();
  const [query, setQuery] = useState("");
  const [draftSelected, setDraftSelected] = useState(() =>
    createCleanSet(selected),
  );
  const [draftFavorites, setDraftFavorites] = useState(() =>
    createCleanSet(favorites),
  );
  const [draftFavoriteOnly, setDraftFavoriteOnly] = useState(
    () => favoriteOnly && favorites.size > 0,
  );

  const organizerOptions = useMemo(() => {
    const names = createCleanSet([...options, ...selected, ...favorites]);
    return [...names].sort((a, b) => {
      const favoriteDifference =
        Number(favorites.has(b)) - Number(favorites.has(a));
      return favoriteDifference || a.localeCompare(b, "ko-KR");
    });
  }, [favorites, options, selected]);

  const visibleOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return organizerOptions;
    return organizerOptions.filter((organizer) =>
      normalizeSearchValue(organizer).includes(normalizedQuery),
    );
  }, [organizerOptions, query]);

  const toggleSelected = (organizer: string) => {
    setDraftSelected((current) => {
      const next = new Set(current);
      if (next.has(organizer)) next.delete(organizer);
      else next.add(organizer);
      return next;
    });
  };

  const toggleFavorite = (organizer: string) => {
    const removesLastFavorite =
      draftFavorites.size === 1 && draftFavorites.has(organizer);
    setDraftFavorites((current) => {
      const next = new Set(current);
      if (next.has(organizer)) next.delete(organizer);
      else next.add(organizer);
      return next;
    });
    if (removesLastFavorite) setDraftFavoriteOnly(false);
  };

  const resetFilters = () => {
    setDraftSelected(new Set());
    setDraftFavoriteOnly(false);
  };

  const applySelection = () => {
    onApply({
      selected: [...draftSelected].sort((a, b) =>
        a.localeCompare(b, "ko-KR"),
      ),
      favorites: new Set(draftFavorites),
      favoriteOnly: draftFavoriteOnly && draftFavorites.size > 0,
    });
  };

  return (
    <Dialog
      title="주최기관 필터"
      description="여러 주최기관을 함께 선택하거나 자주 보는 기관을 저장하세요."
      onClose={onClose}
    >
      <div className="organizer-filter-dialog">
        <div className="organizer-search">
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="organizer-search-input">
            주최기관 검색
          </label>
          <input
            id="organizer-search-input"
            type="search"
            value={query}
            placeholder="주최기관 검색"
            aria-describedby={searchDescriptionId}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p id={searchDescriptionId} className="organizer-result-count" aria-live="polite">
          {visibleOptions.length}개 기관
        </p>

        <label
          className={
            draftFavoriteOnly
              ? "favorite-organizer-filter is-active"
              : "favorite-organizer-filter"
          }
        >
          <input
            type="checkbox"
            checked={draftFavoriteOnly}
            disabled={draftFavorites.size === 0}
            aria-describedby={storageNoteId}
            onChange={(event) => setDraftFavoriteOnly(event.target.checked)}
          />
          관심 기관만 보기 ({draftFavorites.size})
        </label>

        <fieldset className="organizer-options">
          <legend className="sr-only">필터에 적용할 주최기관</legend>
          {visibleOptions.length > 0 ? (
            visibleOptions.map((organizer) => {
              const isSelected = draftSelected.has(organizer);
              const isFavorite = draftFavorites.has(organizer);
              return (
                <div className="organizer-row" key={organizer}>
                  <label title={organizer}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(organizer)}
                    />
                    <span>{organizer}</span>
                  </label>
                  <button
                    className={
                      isFavorite
                        ? "organizer-favorite is-active"
                        : "organizer-favorite"
                    }
                    type="button"
                    aria-label={`${organizer} ${
                      isFavorite ? "관심 기관에서 삭제" : "관심 기관으로 저장"
                    }`}
                    aria-pressed={isFavorite}
                    onClick={() => toggleFavorite(organizer)}
                  >
                    <Star
                      aria-hidden="true"
                      fill={isFavorite ? "currentColor" : "none"}
                    />
                  </button>
                </div>
              );
            })
          ) : (
            <p className="organizer-empty" role="status">
              검색어와 일치하는 주최기관이 없습니다.
            </p>
          )}
        </fieldset>

        <p id={storageNoteId} className="organizer-preference-note">
          관심 기관은 계정이나 서버가 아닌 현재 브라우저에만 저장되며 다른
          기기와 동기화되지 않습니다.
        </p>

        <div className="organizer-footer">
          <button
            type="button"
            className="secondary-action"
            disabled={draftSelected.size === 0 && !draftFavoriteOnly}
            onClick={resetFilters}
          >
            선택 초기화
          </button>
          <button type="button" onClick={applySelection}>
            적용
          </button>
        </div>
      </div>
    </Dialog>
  );
}

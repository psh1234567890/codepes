import { Bookmark, RotateCcw, SlidersHorizontal } from "lucide-react";
import type {
  CompetitionFilters,
  CompetitionType,
  Eligibility,
  ParticipationMode,
} from "../types/competition";
import {
  ELIGIBILITY_LABELS,
  MODE_LABELS,
  TYPE_LABELS,
} from "../lib/competition";

interface FilterBarProps {
  filters: CompetitionFilters;
  sort: "deadline" | "recent";
  onChange: (filters: CompetitionFilters) => void;
  onSortChange: (sort: "deadline" | "recent") => void;
  onReset: () => void;
  activeCount: number;
  savedOnly: boolean;
  savedCount: number;
  onSavedOnlyChange: (value: boolean) => void;
}

export function FilterBar({
  filters,
  sort,
  onChange,
  onSortChange,
  onReset,
  activeCount,
  savedOnly,
  savedCount,
  onSavedOnlyChange,
}: FilterBarProps) {
  return (
    <section className="filter-rail" aria-label="대회 필터">
      <div className="filter-scroll">
        <div className="filter-group">
        <label htmlFor="type-filter">대회 유형</label>
        <div className="desktop-options" aria-label="대회 유형 빠른 선택">
          <button
            type="button"
            className={filters.type === "all" ? "is-active" : ""}
            onClick={() => onChange({ ...filters, type: "all" })}
          >
            전체
          </button>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filters.type === value ? "is-active" : ""}
              onClick={() =>
                onChange({
                  ...filters,
                  type: value as CompetitionType,
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <select
          id="type-filter"
          className="mobile-filter-select"
          value={filters.type}
          onChange={(event) =>
            onChange({
              ...filters,
              type: event.target.value as CompetitionType | "all",
            })
          }
        >
          <option value="all">전체</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        </div>

        <div className="filter-group">
        <label htmlFor="eligibility-filter">참가 자격</label>
        <div className="desktop-options" aria-label="참가 자격 빠른 선택">
          <button
            type="button"
            className={filters.eligibility === "all" ? "is-active" : ""}
            onClick={() => onChange({ ...filters, eligibility: "all" })}
          >
            전체
          </button>
          {Object.entries(ELIGIBILITY_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filters.eligibility === value ? "is-active" : ""}
              onClick={() =>
                onChange({
                  ...filters,
                  eligibility: value as Eligibility,
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <select
          id="eligibility-filter"
          className="mobile-filter-select"
          value={filters.eligibility}
          onChange={(event) =>
            onChange({
              ...filters,
              eligibility: event.target.value as Eligibility | "all",
            })
          }
        >
          <option value="all">전체</option>
          {Object.entries(ELIGIBILITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        </div>

        <div className="filter-group">
        <label htmlFor="mode-filter">진행 방식</label>
        <div className="desktop-options" aria-label="진행 방식 빠른 선택">
          <button
            type="button"
            className={filters.mode === "all" ? "is-active" : ""}
            onClick={() => onChange({ ...filters, mode: "all" })}
          >
            전체
          </button>
          {Object.entries(MODE_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filters.mode === value ? "is-active" : ""}
              onClick={() =>
                onChange({
                  ...filters,
                  mode: value as ParticipationMode,
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <select
          id="mode-filter"
          className="mobile-filter-select"
          value={filters.mode}
          onChange={(event) =>
            onChange({
              ...filters,
              mode: event.target.value as ParticipationMode | "all",
            })
          }
        >
          <option value="all">전체</option>
          {Object.entries(MODE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        </div>

        <div className="filter-group sort-filter">
        <label htmlFor="sort-filter">정렬</label>
        <select
          id="sort-filter"
          value={sort}
          onChange={(event) =>
            onSortChange(event.target.value as "deadline" | "recent")
          }
        >
          <option value="deadline">마감 임박순</option>
          <option value="recent">최근 확인순</option>
        </select>
        </div>
      </div>

      <div className="filter-summary">
        <SlidersHorizontal aria-hidden="true" />
        <span>적용된 필터 {activeCount}개</span>
        <button
          className={savedOnly ? "saved-filter is-active" : "saved-filter"}
          type="button"
          aria-pressed={savedOnly}
          onClick={() => onSavedOnlyChange(!savedOnly)}
        >
          <Bookmark
            aria-hidden="true"
            fill={savedOnly ? "currentColor" : "none"}
          />
          저장한 대회 {savedCount}
        </button>
        <button
          className="reset-filter"
          type="button"
          onClick={onReset}
          disabled={activeCount === 0}
        >
          <RotateCcw aria-hidden="true" />
          초기화
        </button>
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import generatedData from "./data/competitions.generated.json";
import type {
  CompetitionData,
  CompetitionFilters,
} from "./types/competition";
import {
  DEFAULT_FILTERS,
  matchesCompetition,
} from "./lib/competition";
import { Header } from "./components/Header";
import { HeroSearch } from "./components/HeroSearch";
import { FilterBar } from "./components/FilterBar";
import { CompetitionList } from "./components/CompetitionList";
import { CompetitionDetail } from "./components/CompetitionDetail";
import { SubscribeStrip } from "./components/SubscribeStrip";
import {
  CalendarDialog,
  SubmitCompetitionDialog,
} from "./components/AppDialogs";

const competitionData = generatedData as CompetitionData;

const getSavedBookmarks = () => {
  try {
    const value = JSON.parse(
      localStorage.getItem("codepes-bookmarks") ?? "[]",
    ) as unknown;
    return new Set(Array.isArray(value) ? value.filter(String) : []);
  } catch {
    return new Set<string>();
  }
};

export default function App() {
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] =
    useState<CompetitionFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<"deadline" | "recent">("deadline");
  const [selectedId, setSelectedId] = useState<string>();
  const [bookmarkedIds, setBookmarkedIds] = useState(getSavedBookmarks);
  const [dialog, setDialog] = useState<"calendar" | "submit" | null>(null);
  const [toast, setToast] = useState<string>();

  const competitions = useMemo(() => {
    const filtered = competitionData.contests.filter((competition) =>
      matchesCompetition(competition, query, filters),
    );

    return filtered.sort((a, b) => {
      if (sort === "recent") {
        return (
          new Date(b.lastVerifiedAt).getTime() -
          new Date(a.lastVerifiedAt).getTime()
        );
      }
      return (
        new Date(a.applicationDeadline).getTime() -
        new Date(b.applicationDeadline).getTime()
      );
    });
  }, [query, filters, sort]);

  const selectedCompetition =
    competitions.find((competition) => competition.id === selectedId) ??
    competitions[0];

  const activeFilterCount =
    Number(filters.type !== "all") +
    Number(filters.eligibility !== "all") +
    Number(filters.mode !== "all");

  const handleSearch = () => {
    setQuery(draftQuery);
    document
      .getElementById("competitions")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleBookmark = (id: string) => {
    setBookmarkedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("codepes-bookmarks", JSON.stringify([...next]));
      return next;
    });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSort("deadline");
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(undefined), 3600);
  };

  return (
    <>
      <div id="top" className="app-shell">
        <Header
          onCalendar={() => setDialog("calendar")}
          onSubmitCompetition={() => setDialog("submit")}
          onLogin={() =>
            showToast(
              "로그인과 기기 간 즐겨찾기 동기화는 백엔드 연결 단계에서 활성화됩니다.",
            )
          }
        />

        <main>
          <HeroSearch
            value={draftQuery}
            onChange={(value) => {
              setDraftQuery(value);
              setQuery(value);
            }}
            onSearch={handleSearch}
          />

          <FilterBar
            filters={filters}
            sort={sort}
            onChange={setFilters}
            onSortChange={setSort}
            onReset={resetFilters}
            activeCount={activeFilterCount}
          />

          <section
            id="competitions"
            className="competition-section"
            aria-labelledby="competition-heading"
          >
            <div className="section-heading">
              <div>
                <h2 id="competition-heading">지금 참가할 수 있는 대회</h2>
                <span>{competitions.length}개</span>
              </div>
              <p>
                마지막 데이터 확인{" "}
                <time dateTime={competitionData.updatedAt}>
                  {new Intl.DateTimeFormat("ko-KR", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(competitionData.updatedAt))}
                </time>
              </p>
            </div>

            <div className="competition-layout">
              <CompetitionList
                competitions={competitions}
                selectedId={selectedCompetition?.id}
                bookmarkedIds={bookmarkedIds}
                onSelect={setSelectedId}
                onBookmark={handleBookmark}
              />

              {selectedCompetition ? (
                <CompetitionDetail
                  competition={selectedCompetition}
                  bookmarked={bookmarkedIds.has(selectedCompetition.id)}
                  onBookmark={() => handleBookmark(selectedCompetition.id)}
                />
              ) : null}
            </div>
          </section>

          <SubscribeStrip />
        </main>

        <footer>
          <a className="wordmark footer-wordmark" href="#top">
            Code<span>Pes</span>
          </a>
          <p>공식 출처를 확인하고, 참가 전 원문 일정을 다시 확인해 주세요.</p>
          <button type="button" onClick={() => setDialog("submit")}>
            잘못된 정보 알리기
          </button>
        </footer>
      </div>

      {dialog === "calendar" ? (
        <CalendarDialog
          competitions={[...competitions].sort(
            (a, b) =>
              new Date(a.applicationDeadline).getTime() -
              new Date(b.applicationDeadline).getTime(),
          )}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog === "submit" ? (
        <SubmitCompetitionDialog onClose={() => setDialog(null)} />
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <CheckCircle2 aria-hidden="true" />
          {toast}
        </div>
      ) : null}
    </>
  );
}

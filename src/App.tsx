import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import generatedData from "./data/competitions.generated.json";
import { GITHUB_URL } from "./config";
import type {
  Competition,
  CompetitionData,
  CompetitionFilters,
} from "./types/competition";
import {
  DEFAULT_FILTERS,
  matchesCompetition,
} from "./lib/competition";
import {
  loadLatestCompetitionData,
  type LoadedCompetitionData,
} from "./lib/competition-data";
import { downloadCalendarFile } from "./lib/calendar";
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

const bundledCompetitionData = generatedData as CompetitionData;

const getSavedBookmarks = () => {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("codepes-bookmarks") ?? "[]",
    );
    const ids = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
    return new Set(ids);
  } catch {
    return new Set<string>();
  }
};

const getInitialContestId = () =>
  new URLSearchParams(window.location.search).get("contest") ?? undefined;

export default function App() {
  const [competitionData, setCompetitionData] =
    useState<CompetitionData>(bundledCompetitionData);
  const [dataSource, setDataSource] =
    useState<LoadedCompetitionData["source"]>("bundled");
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] =
    useState<CompetitionFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<"deadline" | "recent">("deadline");
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    getInitialContestId,
  );
  const [bookmarkedIds, setBookmarkedIds] = useState(getSavedBookmarks);
  const [dialog, setDialog] = useState<"calendar" | "submit" | null>(null);
  const [toast, setToast] = useState<string>();

  useEffect(() => {
    localStorage.removeItem("codepes-subscription-email");
    localStorage.removeItem("codepes-submission-draft");

    let active = true;
    void loadLatestCompetitionData(bundledCompetitionData).then((loaded) => {
      if (!active) return;
      setCompetitionData(loaded.data);
      setDataSource(loaded.source);
    });
    return () => {
      active = false;
    };
  }, []);

  const upcomingCompetitions = useMemo(
    () =>
      competitionData.contests.filter(
        (competition) =>
          Date.parse(competition.applicationDeadline) > Date.now(),
      ),
    [competitionData],
  );

  const competitions = useMemo(() => {
    const filtered = upcomingCompetitions.filter(
      (competition) =>
        matchesCompetition(competition, query, filters) &&
        (!savedOnly || bookmarkedIds.has(competition.id)),
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
  }, [
    bookmarkedIds,
    filters,
    query,
    savedOnly,
    sort,
    upcomingCompetitions,
  ]);

  const selectedCompetition =
    competitions.find((competition) => competition.id === selectedId) ??
    competitions[0];
  const savedCompetitions = upcomingCompetitions.filter((competition) =>
    bookmarkedIds.has(competition.id),
  );

  const activeFilterCount =
    Number(filters.type !== "all") +
    Number(filters.eligibility !== "all") +
    Number(filters.mode !== "all") +
    Number(sort !== "deadline") +
    Number(query.trim().length > 0) +
    Number(savedOnly);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(undefined), 3600);
  };

  const handleSearch = () => {
    setQuery(draftQuery);
    document
      .getElementById("competitions")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelect = (id: string) => {
    const nextId = selectedId === id ? undefined : id;
    setSelectedId(nextId);
    const url = new URL(window.location.href);
    if (nextId) url.searchParams.set("contest", nextId);
    else url.searchParams.delete("contest");
    window.history.replaceState(null, "", url);
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
    setDraftQuery("");
    setQuery("");
    setFilters(DEFAULT_FILTERS);
    setSort("deadline");
    setSavedOnly(false);
  };

  const exportCalendar = (
    items: Competition[],
    filename = "codepes-deadlines.ics",
  ) => {
    if (!downloadCalendarFile(items, filename)) {
      showToast("내보낼 대회가 없습니다.");
      return;
    }
    showToast(`${items.length}개 대회의 캘린더 파일을 저장했습니다.`);
  };

  const handleShare = async (competition: Competition) => {
    const url = new URL(window.location.href);
    url.searchParams.set("contest", competition.id);
    const shareData = {
      title: `${competition.title} | CodePes`,
      text: competition.summary,
      url: url.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        showToast("대회 링크를 복사했습니다.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showToast("공유하지 못했습니다. 주소 표시줄의 링크를 복사해 주세요.");
    }
  };

  return (
    <>
      <div id="top" className="app-shell">
        <Header
          onCalendar={() => setDialog("calendar")}
          onSubmitCompetition={() => setDialog("submit")}
          githubUrl={GITHUB_URL}
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
            savedOnly={savedOnly}
            savedCount={savedCompetitions.length}
            onChange={setFilters}
            onSortChange={setSort}
            onSavedOnlyChange={setSavedOnly}
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
                <span
                  className={
                    dataSource === "github"
                      ? "data-source-badge is-live"
                      : "data-source-badge"
                  }
                >
                  {dataSource === "github" ? "GitHub 최신 데이터" : "배포 데이터"}
                </span>
                데이터 기준{" "}
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
                selectedId={selectedId}
                bookmarkedIds={bookmarkedIds}
                onSelect={handleSelect}
                onBookmark={handleBookmark}
                onAddToCalendar={(competition) =>
                  exportCalendar(
                    [competition],
                    `codepes-${competition.id}.ics`,
                  )
                }
                onShare={(competition) => void handleShare(competition)}
              />

              {selectedCompetition ? (
                <CompetitionDetail
                  competition={selectedCompetition}
                  bookmarked={bookmarkedIds.has(selectedCompetition.id)}
                  onBookmark={() => handleBookmark(selectedCompetition.id)}
                  onAddToCalendar={() =>
                    exportCalendar(
                      [selectedCompetition],
                      `codepes-${selectedCompetition.id}.ics`,
                    )
                  }
                  onShare={() => void handleShare(selectedCompetition)}
                />
              ) : null}
            </div>
          </section>

          <SubscribeStrip
            savedCount={savedCompetitions.length}
            onExportAll={() => exportCalendar(upcomingCompetitions)}
            onExportSaved={() =>
              exportCalendar(savedCompetitions, "codepes-saved-deadlines.ics")
            }
            onShowSaved={() => {
              if (savedCompetitions.length === 0) {
                showToast("먼저 관심 대회를 저장해 주세요.");
                return;
              }
              setSavedOnly(true);
              document
                .getElementById("competitions")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </main>

        <footer>
          <a className="wordmark footer-wordmark" href="#top">
            Code<span>Pes</span>
          </a>
          <div className="footer-copy">
            <p>공식 출처를 확인하고, 참가 전 원문 일정을 다시 확인해 주세요.</p>
            <nav aria-label="프로젝트 정보">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a
                href={`${GITHUB_URL}/blob/main/docs/DATA_SOURCES.md`}
                target="_blank"
                rel="noreferrer"
              >
                데이터 기준
              </a>
              <a
                href={`${GITHUB_URL}/blob/main/PRIVACY.md`}
                target="_blank"
                rel="noreferrer"
              >
                개인정보
              </a>
            </nav>
          </div>
          <button type="button" onClick={() => setDialog("submit")}>
            잘못된 정보 알리기
          </button>
        </footer>
      </div>

      {dialog === "calendar" ? (
        <CalendarDialog
          competitions={[...upcomingCompetitions].sort(
            (a, b) =>
              new Date(a.applicationDeadline).getTime() -
              new Date(b.applicationDeadline).getTime(),
          )}
          savedCount={savedCompetitions.length}
          onExportAll={() => exportCalendar(upcomingCompetitions)}
          onExportSaved={() =>
            exportCalendar(savedCompetitions, "codepes-saved-deadlines.ics")
          }
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

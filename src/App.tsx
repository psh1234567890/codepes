import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, List } from "lucide-react";
import generatedData from "./data/competitions.generated.json";
import { GITHUB_URL } from "./config";
import type {
  Competition,
  CompetitionData,
  CompetitionFilters,
} from "./types/competition";
import {
  DEFAULT_FILTERS,
  getOrganizerOptions,
  matchesCompetition,
  normalizeOrganizerKey,
} from "./lib/competition";
import {
  loadLatestCompetitionData,
  type LoadedCompetitionData,
} from "./lib/competition-data";
import { downloadCalendarFile } from "./lib/calendar";
import {
  readStoredStringSet,
  writeStoredStringSet,
} from "./lib/preferences";
import {
  buildContestSeo,
  buildContestStructuredData,
  buildWebsiteStructuredData,
  DEFAULT_PAGE_DESCRIPTION,
  DEFAULT_PAGE_TITLE,
  getContestIdFromUrl,
  getContestPath,
  SITE_URL,
} from "./lib/seo";
import { Header } from "./components/Header";
import { HeroSearch } from "./components/HeroSearch";
import { FilterBar } from "./components/FilterBar";
import { CompetitionList } from "./components/CompetitionList";
import { CompetitionDetail } from "./components/CompetitionDetail";
import { CompetitionCalendar } from "./components/CompetitionCalendar";
import { OrganizerFilterDialog } from "./components/OrganizerFilterDialog";
import { SubscribeStrip } from "./components/SubscribeStrip";
import { SubmitCompetitionDialog } from "./components/AppDialogs";
import { SourceStatusPanel } from "./components/SourceStatusPanel";

const bundledCompetitionData = generatedData as CompetitionData;
const BOOKMARKS_STORAGE_KEY = "codepes-bookmarks";
const FAVORITE_ORGANIZERS_STORAGE_KEY = "codepes-favorite-organizers";

const getSavedBookmarks = () =>
  readStoredStringSet(localStorage, BOOKMARKS_STORAGE_KEY);

const getSavedFavoriteOrganizers = () =>
  readStoredStringSet(localStorage, FAVORITE_ORGANIZERS_STORAGE_KEY);

const getInitialContestId = () =>
  getContestIdFromUrl(new URL(window.location.href));

const setSeoAttribute = (
  key: string,
  attribute: "content" | "href",
  value: string,
) => {
  document
    .querySelector<HTMLElement>(`[data-seo="${key}"]`)
    ?.setAttribute(attribute, value);
};

const updateDocumentSeo = (competition?: Competition) => {
  const seo = competition
    ? buildContestSeo(competition)
    : {
        title: DEFAULT_PAGE_TITLE,
        description: DEFAULT_PAGE_DESCRIPTION,
        canonicalUrl: `${SITE_URL}/`,
      };

  document.title = seo.title;
  setSeoAttribute("description", "content", seo.description);
  setSeoAttribute("canonical", "href", seo.canonicalUrl);
  setSeoAttribute("og-type", "content", "website");
  setSeoAttribute("og-title", "content", seo.title);
  setSeoAttribute("og-description", "content", seo.description);
  setSeoAttribute("og-url", "content", seo.canonicalUrl);
  setSeoAttribute("twitter-title", "content", seo.title);
  setSeoAttribute("twitter-description", "content", seo.description);

  const structuredData = document.querySelector<HTMLScriptElement>(
    'script[data-schema="website"]',
  );
  if (structuredData) {
    structuredData.textContent = JSON.stringify(
      competition
        ? buildContestStructuredData(competition)
        : buildWebsiteStructuredData(),
    );
  }
};

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
  const [favoriteOrganizerOnly, setFavoriteOrganizerOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedId, setSelectedId] = useState<string | undefined>(
    getInitialContestId,
  );
  const [bookmarkedIds, setBookmarkedIds] = useState(getSavedBookmarks);
  const [favoriteOrganizers, setFavoriteOrganizers] = useState(
    getSavedFavoriteOrganizers,
  );
  const [dialog, setDialog] = useState<"organizer" | "submit" | null>(null);
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

  useEffect(() => {
    const handlePopState = () => setSelectedId(getInitialContestId());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const upcomingCompetitions = useMemo(
    () =>
      competitionData.contests.filter(
        (competition) =>
          Date.parse(competition.applicationDeadline) > Date.now(),
      ),
    [competitionData],
  );

  const favoriteOrganizerKeys = useMemo(
    () =>
      new Set(
        [...favoriteOrganizers]
          .map(normalizeOrganizerKey)
          .filter(Boolean),
      ),
    [favoriteOrganizers],
  );

  const organizerOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const organizer of [
      ...getOrganizerOptions(upcomingCompetitions),
      ...favoriteOrganizers,
    ]) {
      const key = normalizeOrganizerKey(organizer);
      if (key && !byKey.has(key)) byKey.set(key, organizer.trim());
    }
    return [...byKey.values()].sort((a, b) => {
      const favoriteDifference =
        Number(favoriteOrganizerKeys.has(normalizeOrganizerKey(b))) -
        Number(favoriteOrganizerKeys.has(normalizeOrganizerKey(a)));
      return favoriteDifference || a.localeCompare(b, "ko-KR");
    });
  }, [
    favoriteOrganizerKeys,
    favoriteOrganizers,
    upcomingCompetitions,
  ]);

  const competitions = useMemo(() => {
    const filtered = upcomingCompetitions.filter(
      (competition) =>
        matchesCompetition(competition, query, filters) &&
        (!savedOnly || bookmarkedIds.has(competition.id)) &&
        (!favoriteOrganizerOnly ||
          favoriteOrganizerKeys.has(
            normalizeOrganizerKey(competition.organizer),
          )),
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
    favoriteOrganizerKeys,
    favoriteOrganizerOnly,
    filters,
    query,
    savedOnly,
    sort,
    upcomingCompetitions,
  ]);

  const routedCompetition = selectedId
    ? competitionData.contests.find(
        (competition) => competition.id === selectedId,
      )
    : undefined;
  const selectedCompetition = selectedId
    ? routedCompetition
    : competitions[0];
  const savedCompetitions = upcomingCompetitions.filter((competition) =>
    bookmarkedIds.has(competition.id),
  );

  const activeFilterCount =
    Number(filters.type !== "all") +
    Number(filters.eligibility !== "all") +
    Number(filters.mode !== "all") +
    Number(filters.organizers.length > 0) +
    Number(sort !== "deadline") +
    Number(query.trim().length > 0) +
    Number(savedOnly) +
    Number(favoriteOrganizerOnly);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(undefined), 3600);
  };

  useEffect(() => {
    updateDocumentSeo(routedCompetition);
  }, [routedCompetition]);

  const handleSearch = () => {
    setQuery(draftQuery);
    document
      .getElementById("competitions")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateSelectedCompetition = (nextId?: string) => {
    setSelectedId(nextId);
    window.history.replaceState(
      null,
      "",
      nextId ? getContestPath(nextId) : "/",
    );
  };

  const handleSelect = (id: string) => {
    updateSelectedCompetition(selectedId === id ? undefined : id);
  };

  const handleBookmark = (id: string) => {
    setBookmarkedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (!writeStoredStringSet(localStorage, BOOKMARKS_STORAGE_KEY, next)) {
        showToast(
          "브라우저 저장소에 기록하지 못했습니다. 이 탭에서는 선택을 유지합니다.",
        );
      }
      return next;
    });
  };

  const resetFilters = () => {
    setDraftQuery("");
    setQuery("");
    setFilters({ ...DEFAULT_FILTERS, organizers: [] });
    setSort("deadline");
    setSavedOnly(false);
    setFavoriteOrganizerOnly(false);
  };

  const showCalendarView = () => {
    setViewMode("calendar");
    document
      .getElementById("competitions")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    const url = new URL(getContestPath(competition.id), window.location.origin);
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
          onCalendar={showCalendarView}
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
            organizerSelectionCount={filters.organizers.length}
            favoriteOrganizerCount={favoriteOrganizers.size}
            favoriteOrganizerOnly={favoriteOrganizerOnly}
            onOpenOrganizerFilter={() => setDialog("organizer")}
            onFavoriteOrganizerOnlyChange={setFavoriteOrganizerOnly}
          />

          <section
            id="competitions"
            className="competition-section"
            aria-labelledby="competition-heading"
          >
            <div className="section-heading">
              <div className="section-heading-main">
                <h2 id="competition-heading">지금 참가할 수 있는 대회</h2>
                <span>{competitions.length}개</span>
              </div>
              <div className="section-heading-actions">
                <div
                  className="view-switcher"
                  role="group"
                  aria-label="대회 보기 방식"
                >
                  <button
                    type="button"
                    aria-pressed={viewMode === "list"}
                    className={viewMode === "list" ? "is-active" : ""}
                    onClick={() => setViewMode("list")}
                  >
                    <List aria-hidden="true" />
                    목록
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === "calendar"}
                    className={viewMode === "calendar" ? "is-active" : ""}
                    onClick={() => setViewMode("calendar")}
                  >
                    <CalendarDays aria-hidden="true" />
                    캘린더
                  </button>
                </div>
                <p>
                  <span
                    className={
                      dataSource === "github"
                        ? "data-source-badge is-live"
                        : "data-source-badge"
                    }
                  >
                    {dataSource === "github"
                      ? "GitHub 최신 데이터"
                      : "배포 데이터"}
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
            </div>

            <SourceStatusPanel sources={competitionData.sources} />

            {viewMode === "list" ? (
              <div className="competition-layout">
                <CompetitionList
                  competitions={competitions}
                  selectedId={selectedCompetition?.id}
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
            ) : (
              <div className="calendar-view-layout">
                <CompetitionCalendar
                  competitions={competitions}
                  selectedId={selectedCompetition?.id}
                  onSelect={(id) => updateSelectedCompetition(id)}
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
            )}
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
          <a className="wordmark footer-wordmark" href="/">
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

      {dialog === "organizer" ? (
        <OrganizerFilterDialog
          options={organizerOptions}
          selected={filters.organizers}
          favorites={favoriteOrganizers}
          favoriteOnly={favoriteOrganizerOnly}
          onApply={({ selected, favorites, favoriteOnly }) => {
            setFilters((current) => ({
              ...current,
              organizers: selected,
            }));
            setFavoriteOrganizers(favorites);
            setFavoriteOrganizerOnly(
              favoriteOnly && favorites.size > 0,
            );
            if (
              !writeStoredStringSet(
                localStorage,
                FAVORITE_ORGANIZERS_STORAGE_KEY,
                favorites,
              )
            ) {
              showToast(
                "관심 주최기관을 브라우저에 저장하지 못했습니다. 이 탭에서는 선택을 유지합니다.",
              );
            }
            setDialog(null);
          }}
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

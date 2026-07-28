import { Github, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

interface HeaderProps {
  onCalendar: () => void;
  onSubmitCompetition: () => void;
  githubUrl: string;
}

export function Header({
  onCalendar,
  onSubmitCompetition,
  githubUrl,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const closeAndRun = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="CodePes 홈">
        Code<span>Pes</span>
      </a>

      <nav
        id="primary-navigation"
        className={menuOpen ? "header-nav is-open" : "header-nav"}
        aria-label="주요 메뉴"
      >
        <a href="#competitions" onClick={() => setMenuOpen(false)}>
          대회 찾기
        </a>
        <button type="button" onClick={() => closeAndRun(onCalendar)}>
          대회 캘린더
        </button>
        <button type="button" onClick={() => closeAndRun(onSubmitCompetition)}>
          제보하기
        </button>
        <a href={githubUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>

      <div className="header-actions">
        <a
          className="mobile-search-link"
          href="#competition-search"
          aria-label="검색으로 이동"
        >
          <Search aria-hidden="true" />
        </a>
        <a
          className="login-button"
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
        >
          <Github aria-hidden="true" />
          GitHub
        </a>
        <button
          className="mobile-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

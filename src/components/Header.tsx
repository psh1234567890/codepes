import { Menu, Search, X } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  onCalendar: () => void;
  onSubmitCompetition: () => void;
  onLogin: () => void;
}

export function Header({
  onCalendar,
  onSubmitCompetition,
  onLogin,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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
      </nav>

      <div className="header-actions">
        <a
          className="mobile-search-link"
          href="#competition-search"
          aria-label="검색으로 이동"
        >
          <Search aria-hidden="true" />
        </a>
        <button className="login-button" type="button" onClick={onLogin}>
          로그인
        </button>
        <button
          className="mobile-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

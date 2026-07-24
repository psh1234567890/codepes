import { Search } from "lucide-react";
import type { FormEvent } from "react";

interface HeroSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export function HeroSearch({
  value,
  onChange,
  onSearch,
}: HeroSearchProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch();
  };

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          놓치기 쉬운 코딩 대회,
          <br className="mobile-title-break" /> 한곳에서.
        </h1>
        <p>
          PS 대회부터 해커톤까지, 참가할 수 있는 대회만 빠르게 찾아보세요.
        </p>
      </div>

      <form className="search-form" onSubmit={handleSubmit} role="search">
        <Search aria-hidden="true" />
        <label className="sr-only" htmlFor="competition-search">
          대회 검색
        </label>
        <input
          id="competition-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="대회명, 주제, 주최 기관 검색"
          autoComplete="off"
        />
        <button type="submit">검색</button>
      </form>
    </section>
  );
}

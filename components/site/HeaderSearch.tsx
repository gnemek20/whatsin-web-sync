'use client';
// 헤더 검색 — 어느 화면에서든 바로 검색(2026-11-03 사용자 「검색창이 달린 헤더 sticky」).
// 첫 화면에 큰 검색창(SearchBox hero)이 있으면 그게 보이는 동안 숨었다가, 화면 밖으로 스크롤되면 내려온다(같은 상자가 두 개 보이지 않게).
// 모바일에서 숨었다 나타날 때는 헤더 아래에 떠서 내려온다 — 헤더 높이가 바뀌어 본문이 튀지 않게.
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SearchBox } from '../SearchBox';
import styles from './Nav.module.css';

export function HeaderSearch() {
  const path = usePathname() ?? '';
  const params = useSearchParams();
  const q = path === '/search' ? (params.get('q') ?? '') : '';
  const [hero, setHero] = useState(false);      // 이 화면에 큰 검색창이 있는가
  const [heroSeen, setHeroSeen] = useState(true); // 그게 지금 보이는가

  useEffect(() => {
    const el = document.querySelector('[data-hero-search]');
    setHero(!!el);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHeroSeen(e.isIntersecting), { rootMargin: '-72px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [path, q]);

  const cls = !hero ? styles.searchInline : heroSeen ? `${styles.searchFloat} ${styles.searchAway}` : styles.searchFloat;
  return (
    <div className={`${styles.search} ${cls}`} aria-hidden={hero && heroSeen ? true : undefined}>
      <SearchBox key={q} size="sm" defaultValue={q} placeholder="제품 이름, 「당이 낮은 과자」 같은 조건" />
    </div>
  );
}

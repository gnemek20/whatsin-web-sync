'use client';
// 헤더 검색 — 어느 화면에서든 바로 검색(2026-11-03 사용자 「검색창이 달린 헤더 sticky」).
// 첫 화면에 큰 검색창(SearchBox hero)이 있으면 그게 보이는 동안 숨었다가, 화면 밖으로 스크롤되면 내려온다(같은 상자가 두 개 보이지 않게).
// 모바일에서 숨었다 나타날 때는 헤더 아래에 떠서 내려온다 — 헤더 높이가 바뀌어 본문이 튀지 않게.
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SearchBox } from '../SearchBox';
import styles from './Nav.module.css';

// 아래 검색창을 쓰는 화면 — 모바일 머리 검색 줄은 아예 없다(PC 는 그대로).
//   첫 화면 · 검색 결과(Landing .dock) · 기록 · 제품 상세(shell/DockSearch). 모바일에서 입력칸은 아래가 자리다(2026-11-17 사용자).
// 모바일에서 머리 검색을 숨기는 화면 — 아래에 검색창이 따로 있다(/i 는 성분 이름 검색창 · 2026-11-18)
const DOCKED = (path: string) => path === '/' || path === '/history' || path === '/i' || path.startsWith('/p/') || path === '/c' || path.startsWith('/c/');

export function HeaderSearch() {
  const path = usePathname() ?? '';
  const params = useSearchParams();
  const q = path === '/' ? (params.get('q') ?? '') : '';
  // 화면마다 새로 그린다 — 앞 화면의 상태(큰 검색창 없음 · 보임)를 들고 와서 「보였다가 위로 올라가는」 연출이 생기지 않게(2026-11-17 사용자 「기록 → 홈에서 위쪽에 무언가 빠르게 올라감」)
  return <Bar key={`${path}|${q}`} path={path} q={q} />;
}

function Bar({ path, q }: { path: string; q: string }) {
  // 큰 검색창(SearchBox hero)이 있는 화면은 첫 화면(/)뿐 — 효과를 기다리지 않고 처음 그림부터 숨긴 채로 시작한다
  // 분류 허브(/c/…)도 같은 검색 화면이라 같은 규칙(2026-11-18)
  const hero = path === '/' || path.startsWith('/c/');
  const [heroSeen, setHeroSeen] = useState(true); // 그게 지금 보이는가

  useEffect(() => {
    if (!hero) return;
    const el = document.querySelector('[data-hero-search]');
    if (!el) return setHeroSeen(false);
    const io = new IntersectionObserver(([e]) => setHeroSeen(e.isIntersecting), { rootMargin: '-72px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hero]);

  const cls = !hero ? styles.searchInline : heroSeen ? `${styles.searchFloat} ${styles.searchAway}` : styles.searchFloat;
  return (
    <div className={`${styles.search} ${cls} ${DOCKED(path) ? styles.searchDocked : ''}`} aria-hidden={hero && heroSeen ? true : undefined}>
      <SearchBox key={q} size="sm" defaultValue={q} placeholder="제품 이름, 원하는 조건" />
    </div>
  );
}

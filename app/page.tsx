// 첫 화면 = 검색 화면(2026-11-16 사용자 「검색 페이지는 별도로 없이 홈에서 바로 검색되는 느낌」).
//   ?q= 없으면 바로 쓰는 랜딩(components/home/Landing) · ?q= 면 검색 결과 · ?c= 면 둘러보기 묶음(search/ResultsView). 옛 /search 는 여기로 넘긴다.
// 2026-11-17 — 결과 화면은 머리 바 아래를 꽉 채우는 한 덩어리(페이지가 길어지지 않는다 · 결과만 영역 안에서 내린다).
//   검색창은 바로, 결과는 단계마다 먼저(Suspense) — 찾은 말 · 카드 뼈대 → 목록 → 내 기준 숫자.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { hubForQuery, hubHref } from '@/lib/hubs';
import { readLens } from '@/lib/lens.server';
import { parseSort } from '@/lib/sort';
import { homePicks } from '@/lib/picks';
import { Landing, SearchTop } from '@/components/home/Landing';
import { Collection, Results, ResultsSkeleton } from '@/components/search/ResultsView';
import rs from '@/components/search/results.module.css';

type Props = { searchParams: { q?: string; c?: string; sort?: string; by?: string; all?: string; buy?: string } };

export function generateMetadata({ searchParams }: Props): Metadata {
  const q = searchParams.q?.trim();
  // 검색 결과는 색인하지 않는다(질의마다 생기는 얇은 페이지 · robots.txt 도 막는다) — 상세 페이지가 검색에 나가야 한다
  return q || searchParams.c ? { title: q ? `‘${q}’ 검색` : '둘러보기', robots: { index: false, follow: true } } : { alternates: { canonical: '/' } };
}

export default async function Home({ searchParams }: Props) {
  const q = (searchParams.q ?? '').trim().slice(0, 60);
  const c = (searchParams.c ?? '').trim();
  // 허브 제목과 같은 검색어 — 같은 검색 화면의 고정 주소(/c/…)로 보낸다(정렬 · 「비슷한 제품까지」를 고른 경우는 그대로)
  const hub = q && !searchParams.sort && !searchParams.all && !searchParams.by && !searchParams.buy ? hubForQuery(q) : null;
  if (hub) redirect(hubHref(hub));
  if (q || c) {
    const lens = readLens();
    const sort = parseSort(searchParams.sort, lens ? searchParams.by : null);
    const all = searchParams.all === '1';
    const buy = searchParams.buy === '1';     // 구매 링크 있는 것만(2026-11-19)
    return (
      <main className={rs.main}>
        <div className={rs.screen} data-screen="results">
          <SearchTop q={q} />
          <div className={`container ${rs.view}`}>
            <Suspense key={`${q}|${c}|${all ? 1 : 0}|${buy ? 1 : 0}`} fallback={<ResultsSkeleton q={q} />}>
              {q ? <Results q={q} sort={sort} lens={lens} all={all} buy={buy} /> : <Collection c={c} sort={sort} lens={lens} />}
            </Suspense>
          </div>
        </div>
      </main>
    );
  }
  return <Landing picks={await homePicks()} />;
}

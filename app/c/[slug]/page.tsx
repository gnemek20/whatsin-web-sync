// 분류 허브 한 장(2026-11-18 · 로컬 시험) — 「조건으로 찾기」 결과 화면 그대로(같은 검색 · 같은 카드 · 정렬 칩 · 내 기준).
// 다른 것은 주소(검색엔진이 색인하는 고정 주소) · 머리(허브 이름 + 한 줄) · 목록 끝 카드(어떻게 세웠나 + 함께 보는 분류)뿐이다.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { searchV2 } from '@/lib/api';
import { readLens } from '@/lib/lens.server';
import { parseSort } from '@/lib/sort';
import { METRIC, hubBySlug, hubHref, josa } from '@/lib/hubs';
import { SearchTop } from '@/components/home/Landing';
import { Results, ResultsSkeleton } from '@/components/search/ResultsView';
import { HubTail } from '@/components/search/HubTail';
import rs from '@/components/search/results.module.css';

export const revalidate = 3600;

type Props = { params: { slug: string }; searchParams: { sort?: string; by?: string } };
const hubOf = (p: Props) => hubBySlug(decodeURIComponent(p.params.slug));

export async function generateMetadata(p: Props): Promise<Metadata> {
  const x = hubOf(p);
  if (!x) return { title: '분류' };
  const r = await searchV2(x.title);
  const top = r.ok ? r.data.items.slice(0, 3).map((i) => i.name) : [];
  const m = METRIC[x.by];
  const title = `${x.title} 순위, 100g당 ${m.name} 비교`;
  const desc = `${x.q} 제품을 식약처 신고 라벨의 100g당 ${m.name}${m.ro} 줄 세웠습니다.${top.length ? ` ${top.join(', ')} 등.` : ''} 원재료, 감미료, 첨가물도 제품마다 확인할 수 있습니다.`;
  return { title, description: desc, alternates: { canonical: hubHref(x) }, openGraph: { title: `${title} | What's In?`, description: desc, url: hubHref(x) } };
}

export default function HubPage(p: Props) {
  const x = hubOf(p);
  if (!x) notFound();
  const lens = readLens();
  const sort = parseSort(p.searchParams.sort, lens ? p.searchParams.by : null);
  const m = METRIC[x.by];
  const sub = `${x.q}${josa(x.q, '을', '를')} 100g(mL)당 ${m.name}${m.ga} ${x.order === 'desc' ? '많은' : '적은'} 순서로 골랐습니다. 식약처 신고 라벨 값 기준입니다.`;
  return (
    <main className={rs.main}>
      <div className={rs.screen} data-screen="results">
        <SearchTop q={x.title} />
        <div className={`container ${rs.view}`}>
          <Suspense fallback={<ResultsSkeleton q={x.title} />}>
            <Results q={x.title} sort={sort} lens={lens} all hub={{ title: x.title, sub, tail: <HubTail hub={x} /> }} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

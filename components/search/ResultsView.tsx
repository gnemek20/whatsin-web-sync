// 검색 결과 · 둘러보기 — 홈(/?q= · /?c=)이 그린다(2026-11-16 · 옛 /search 는 홈으로 넘긴다). 2026-11-17 전면 개편.
//
// 빠르게 — 사용자 「제품 먼저 찾아주고 임베드는 필요할 때만」(2026-11-17):
//   1. 이름 검색(`fast=true` · 임베딩 없음 · 수 ms). 이름이 맞는 제품이 있으면 **그것만** 보인다 — 상황 카드 없음.
//      「비슷한 제품도 보기」를 누를 때만(&all=1) 뜻 검색을 돈다.
//   2. 이름이 맞는 것이 없으면(「당이 낮은 아이스크림」·「콜라」 같은 조건 · 분류 질의) 뜻 검색 + 상황 카드.
//   3. 화면은 단계마다 먼저 그린다(Suspense) — 검색창 · 뼈대 → 목록(목록 응답만으로) → 내 기준 숫자 · 열량(제품 상세를 받은 뒤).
//   서버가 아직 fast 를 모르면(옛 판) 첫 응답이 곧 뜻 검색 결과다(mode='semantic') — 그대로 쓴다(두 번 부르지 않는다).
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { browseCollection, getCollections, getProductsFor, searchFast, searchV2 } from '@/lib/api';
import { NUTRIENTS, avoidParam, type Lens, type NutrientKey } from '@/lib/lens';
import { amountOf, lensRow, sortDesc } from '@/lib/facts';
import { SEARCH_EXAMPLES } from '@/lib/site';
import { Icon, type IconName } from '@/components/Icon';
import { EmptyState, ErrorState } from '@/components/States';
import { RecordQuery } from '@/components/search/Recents';
import { Rich } from '@/components/Rich';
import { axisKey, namePin, sortOptions, type SortId } from '@/lib/sort';
import { bandOf } from '@/lib/bands';
import { SHORT_WORD } from '@/lib/content/words';
import type { ProductDetail, ProductSummary } from '@/lib/types';
import { ResultCard, SkeletonCard, lensFacts } from './ResultCard';
import { SortableResults, type SortRow } from './SortableResults';
import s from './results.module.css';

type Item = ProductSummary & { metric?: string | null };

const CARD_DEFAULT: NutrientKey[] = ['kcal', 'sugar', 'sodium'];
const n1 = (v: number) => (v < 10 ? Math.round(v * 10) / 10 : Math.round(v));

/** 카드와 기준별 정렬 값. details 가 null 이면 목록 응답만으로(내 기준 숫자 · 열량은 「받는 중」) — 상세를 받으면 같은 자리를 채운다. */
function rowsFor(items: Item[], q: string, lens: Lens | null, details: (ProductDetail | null)[] | null, withNotes: boolean): SortRow[] {
  const first = lens?.focus[0] ?? null;
  // 카드 세 칸 = 내 기준 영양소(없으면 열량 · 당류 · 나트륨) — 세 축은 상세 맨 아래에서만(2026-11-18 사용자)
  const focus: NutrientKey[] = lens?.focus.length ? lens.focus : CARD_DEFAULT;
  const labels = focus.map((k) => NUTRIENTS[k].label);
  return items.map((p, i) => {
    const d = details ? details[i] : undefined;
    const row = d && lens ? lensRow(d, lens.focus, lens.avoid) : null;
    const cardRow = d ? (lens ? row : lensRow(d, focus, [])) : null;
    const facts = d === null ? labels.map((label) => ({ label, value: null })) : lensFacts(cardRow, labels);
    const per = d?.nutrition.per100 ?? null;
    const unit = per?.unit === 'ml' ? '100mL' : '100g';
    const kcal = per?.kcal ?? null;
    const lensA = d && first ? amountOf(d, first, 'per100') : null;
    const g = p.axes?.glycemic;
    const carb = g?.band === 'amount' && g.carb_g != null ? g.carb_g : g?.band === 'n/a' ? 0 : null;
    const nb = bandOf(p.axes?.nutrition);
    const ib = bandOf(p.axes?.ingredient);
    const pin = q ? namePin(p.name, q) : 1;
    const notes: Record<string, string> | undefined = withNotes
      ? {
          rel: p.metric ?? '',
          diet: d ? (kcal != null ? `${unit}당 ${Math.round(kcal)}kcal` : '열량 미확인') : '',
          glucose: carb != null ? `1회분 순탄수화물 ${n1(carb)}g` : '순탄수화물 양 미확인',
          additive: ib ? `원재료 ${SHORT_WORD(ib)}` : '원재료 미확인',
          nutrition: nb ? `영양 균형 ${SHORT_WORD(nb, 'nutrition')}` : '영양 균형 미확인',
          lens: lens && lensA ? (row?.hits.length ? `${row.hitDetails[0].replace('\n', ', ')} 들어 있음` : lensA.value != null ? `${unit}당 ${lensA.label} ${lensA.text}` : `${lensA.label} 미확인`) : '',
        }
      : undefined;
    return {
      id: p.id,
      node: <ResultCard p={p} facts={facts} hits={row?.hitDetails} notes={notes} pinned={pin === 0} />,
      keys: {
        pin,
        rel: i,
        lensHit: row?.hits.length ? 1 : 0,
        lens: lensA?.value ?? null,
        diet: kcal,
        glucose: axisKey(p, 'glucose'),
        additive: axisKey(p, 'additive'),
        nutrition: axisKey(p, 'nutrition'),
      },
    };
  });
}

const optionsFor = (lens: Lens | null, rel: { label: string; desc: string; sub: string }) =>
  sortOptions({ relLabel: rel.label, relDesc: rel.desc, relSub: rel.sub, lens: lens ? { first: NUTRIENTS[lens.focus[0]].label, desc: sortDesc(lens.focus[0]) } : null });

// ── 머리 ────────────────────────────────────────────────────────────────

function Head({ title, count, sub, aside }: { title: ReactNode; count?: number; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <header className={s.head}>
      <div className={s.headText}>
        <h1 className={s.title}>
          <span className={s.titleQ}>{title}</span>
          {count != null ? <span className={s.count}>{count}개</span> : null}
        </h1>
        {sub ? <p className={s.headSub}>{sub}</p> : null}
      </div>
      {aside}
    </header>
  );
}

/** 목록 단계 — 목록 응답만으로 그리고(fallback), 상세를 받으면 같은 자리를 채운다. */
type ServerSort = { serverSorted?: SortId | null; serverChips?: SortId[] };
function Staged({ head, items, q, lens, options, sort, notes, tail, serverSorted, serverChips }: { head: ReactNode; items: Item[]; q: string; lens: Lens | null; options: ReturnType<typeof optionsFor> | null; sort: SortId; notes: boolean; tail?: ReactNode } & ServerSort) {
  const lensDesc = lens ? sortDesc(lens.focus[0]) : false;
  const plain = (
    <div className={s.view}>
      {head}
      <SortableResults rows={rowsFor(items, q, lens, null, notes)} options={options} initialSort={sort} lensDesc={lensDesc} tail={tail} serverSorted={serverSorted} serverChips={serverChips} />
    </div>
  );
  // 카드 세 칸이 늘 영양소라(세 축 대신) 상세를 늘 받는다 — 받는 동안은 같은 자리에 빈 칸
  return (
    <Suspense fallback={plain}>
      <Enriched head={head} items={items} q={q} lens={lens} options={options} sort={sort} notes={notes} tail={tail} serverSorted={serverSorted} serverChips={serverChips} />
    </Suspense>
  );
}

/** 결과 제품의 상세를 모두 동시에 받는다(열량 · 내 기준 숫자 · 피할 성분 — 목록 응답에는 없다 · 1시간 캐시). */
async function Enriched({ head, items, q, lens, options, sort, notes, tail, serverSorted, serverChips }: { head: ReactNode; items: Item[]; q: string; lens: Lens | null; options: ReturnType<typeof optionsFor> | null; sort: SortId; notes: boolean; tail?: ReactNode } & ServerSort) {
  const ds = await getProductsFor(items.map((x) => x.id), lens ? avoidParam(lens) : '');
  return (
    <div className={s.view}>
      {head}
      <SortableResults rows={rowsFor(items, q, lens, ds, notes)} options={options} initialSort={sort} lensDesc={lens ? sortDesc(lens.focus[0]) : false} tail={tail} serverSorted={serverSorted} serverChips={serverChips} />
    </div>
  );
}

/** 이름 검색 끝 — 비슷한 제품 · 같은 종류에서 조건으로(뜻 검색). 결과가 몇 개뿐이면 남는 자리를 채운다. */
function MoreCard({ q, sub }: { q: string; sub?: string | null }) {
  const kind = (sub ?? '').replace(/류$/, '').trim();
  const links: { href: string; icon: IconName; label: string }[] = [
    { href: `/?q=${encodeURIComponent(q)}&all=1`, icon: 'search', label: `‘${q}’ 비슷한 제품` },
  ];
  if (kind) {
    links.push({ href: `/?q=${encodeURIComponent(`당이 낮은 ${kind}`)}`, icon: 'bowl', label: `당이 낮은 ${kind}` });
    links.push({ href: `/?q=${encodeURIComponent(`열량 낮은 ${kind}`)}`, icon: 'flame', label: `열량 낮은 ${kind}` });
  }
  return (
    <div className={s.moreCard}>
      <div className={s.moreHead}>
        <p className={s.moreTitle}>더 찾아볼까요?</p>
        <p className={s.moreBody}>이름이 맞는 제품만 골랐습니다. 비슷한 제품이나 조건으로도 찾아볼 수 있습니다.</p>
      </div>
      <ul className={s.moreLinks}>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={s.moreLink} data-ev="search_more" data-tab={l.icon}>
              <span className={s.moreIcon} aria-hidden>
                <Icon name={l.icon} size={20} strokeWidth={2} />
              </span>
              <span className={s.moreText}>{l.label}</span>
              <span className={s.moreGo} aria-hidden>
                <Icon name="next" size={18} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className={s.view}>
      <div className={s.state}>
        <EmptyState title={title} body={body}>
          {children}
        </EmptyState>
      </div>
    </div>
  );
}

// 서버가 세울 수 있는 칩 — 검색 색인에 칸이 있는 것만(혈당 관리 · 첨가물 · 영양 균형은 브라우저가 세운다 · main 2026-11-14).
// 「내 기준」은 첫 영양소가 색인 칸에 있을 때만(탄수화물 · 식이섬유 · 대체당은 칸이 없다).
const SERVER_KEY: Partial<Record<NutrientKey, string>> = { carb_net: 'c100', sugar: 'sugars', kcal: 'energy', protein: 'protein', sodium: 'sodium', fat: 'fat' };
function serverSortOf(id: SortId, lens: Lens | null): { by: string; order: 'asc' | 'desc' } | null {
  if (id === 'diet') return { by: 'energy', order: 'asc' };
  if (id === 'lens' && lens) {
    const by = SERVER_KEY[lens.focus[0]];
    return by ? { by, order: sortDesc(lens.focus[0]) ? 'desc' : 'asc' } : null;
  }
  return null;
}

// ── 검색 결과 ──────────────────────────────────────────────────────────────

/** 분류 허브(/c/…) — 같은 검색 화면에 머리 제목 · 한 줄과 끝 카드만 바꾼다(2026-11-18). 검색어 기록은 남기지 않는다(검색이 아니라 페이지를 연 것). */
export type HubView = { title: string; sub: ReactNode; tail: ReactNode };

export async function Results({ q, sort, lens, all, hub, buy = false }: { q: string; sort: SortId; lens: Lens | null; all: boolean; hub?: HubView; buy?: boolean }) {
  const enc = encodeURIComponent(q);
  const first = all ? await searchV2(q, null, 'asc', buy) : await searchFast(q, buy);
  // 「구매 링크 있는 것만」 켜기 · 끄기(2026-11-19 사용자 「판매 링크 있는 거 켜기 · 끄기」 · 화면 모양은 시안 — 프론트가 다듬는다). 허브 화면에는 두지 않는다.
  const buyToggle = hub ? null : (
    <Link href={`/?q=${enc}${all ? '&all=1' : ''}${buy ? '' : '&buy=1'}`} className={s.more} data-ev="search_buy_toggle">
      {buy ? '모든 제품 보기' : '구매 링크 있는 것만'}
    </Link>
  );

  // 1. 이름이 맞는 제품 — 그것만, 임베딩 없이
  if (!all && first.ok && first.data.mode === 'name' && first.data.items.length) {
    const items = first.data.items;
    const head = (
      <Head
        title={`‘${q}’`}
        count={items.length}
        sub="이름이 맞는 제품"
        aside={
          <>
            {buyToggle}
            <Link href={`/?q=${enc}&all=1${buy ? '&buy=1' : ''}`} className={s.more} data-ev="search_more">
              비슷한 제품도 보기
              <Icon name="next" size={16} />
            </Link>
          </>
        }
      />
    );
    return (
      <>
        <RecordQuery q={q} mode="name" n={items.length} />
        <Staged head={head} items={items} q={q} lens={lens} options={null} sort="" notes={false} tail={<MoreCard q={q} sub={items[0]?.sub} />} />
      </>
    );
  }

  // 2. 뜻 검색 — 서버가 fast 를 모르면 첫 응답이 이미 뜻 검색 결과다.
  //    「내 기준」 · 「다이어트할 때」 칩은 서버가 집합 전체를 그 값으로 세운다(by · order · main 2026-11-14)
  const ss = serverSortOf(sort, lens);
  const r = !ss && (all || (first.ok && first.data.mode === 'semantic')) ? first : await searchV2(q, ss?.by, ss?.order, buy);
  // 서버가 그 칩으로 세웠다고 응답이 말할 때만 브라우저가 순서를 다시 세우지 않는다(이름 검색으로 돌았거나 옛 서버면 브라우저가 세운다)
  const serverSorted = ss && r.ok && r.data.mode !== 'name' && r.data.sort?.key === ss.by && (r.data.sort?.dir ?? 'asc') === ss.order ? sort : null;
  const serverChips = (['lens', 'diet'] as SortId[]).filter((id) => serverSortOf(id, lens));
  if (!r.ok) {
    return (
      <div className={s.view}>
        <div className={s.state}>
          <ErrorState title="연결 오류" body="잠시 뒤 다시 시도해 주시기 바랍니다." retryHref={`/?q=${enc}`} />
        </div>
      </div>
    );
  }
  const items = r.data.items;
  if (!items.length) {
    return (
      <Empty title="결과 없음" body={buy ? '구매 링크가 있는 제품 중에는 없습니다.' : '다른 이름으로 검색해 보시기 바랍니다.'}>
        <RecordQuery q={q} mode="semantic" n={0} all={all} />
        {buy ? buyToggle : null}
        <ul className={s.retryList}>
          {SEARCH_EXAMPLES.slice(0, 4).map((x) => (
            <li key={x.q}>
              <Link href={`/?q=${encodeURIComponent(x.q)}`} className={`t-caption ${s.retryLink}`}>{x.q}</Link>
            </li>
          ))}
        </ul>
      </Empty>
    );
  }
  const head = hub ? (
    <Head title={hub.title} count={items.length} sub={hub.sub} />
  ) : (
    <Head
      title={`‘${q}’`}
      count={items.length}
      sub={r.data.sort_label ? <><b>{r.data.sort_label}</b>으로 골랐습니다</> : all ? '이름과 뜻이 비슷한 제품까지' : undefined}
      aside={buyToggle}
    />
  );
  const options = optionsFor(lens, {
    label: r.data.sort_label ? '조건에 맞는 순' : '검색어와 가까운 순',
    desc: r.data.sort_label ? r.data.sort_label : '찾는 말과 가까운 것부터',
    sub: '검색어와 가장 가까운 것부터',
  });
  return (
    <>
      {hub ? null : <RecordQuery q={q} mode="semantic" n={items.length} all={all} />}
      {/* 분류어 질의(서버 category)면 이름 고정(namePin)을 하지 않는다 — Staged 의 q 는 고정에만 쓴다(2026-11-19) */}
      <Staged key={`${sort || 'rel'}:${serverSorted ? 'srv' : 'cli'}`} head={head} items={items} q={r.data.category ? '' : q} lens={lens} options={options} sort={sort} notes serverSorted={serverSorted} serverChips={serverChips} tail={hub?.tail} />
    </>
  );
}

// ── 둘러보기 ───────────────────────────────────────────────────────────────

export async function Collection({ c, sort, lens }: { c: string; sort: SortId; lens: Lens | null }) {
  const [colls, r] = await Promise.all([getCollections(), browseCollection(c)]);
  const active = colls.ok ? colls.data.find((x) => x.id === c) : undefined;
  if (!r.ok) {
    return (
      <div className={s.view}>
        <div className={s.state}>
          <ErrorState title="연결 오류" body="잠시 뒤 다시 시도해 주시기 바랍니다." retryHref={`/?c=${encodeURIComponent(c)}`} />
        </div>
      </div>
    );
  }
  if (!r.data.length) return <Empty title="제품 없음" body="아직 모인 제품이 없습니다." />;
  const head = <Head title={active ? active.label : '둘러보기'} count={r.data.length} sub={active ? <Rich text={active.desc} /> : undefined} />;
  return <Staged head={head} items={r.data} q="" lens={lens} options={optionsFor(lens, { label: '기본 순', desc: '이 묶음의 기본 순서대로', sub: '이 묶음의 기본 순서대로' })} sort={sort} notes />;
}

// ── 기다리는 동안 — 검색창은 그대로, 머리(찾은 말)와 카드 뼈대를 바로 ─────────────

export function ResultsSkeleton({ q }: { q: string }) {
  return (
    <div className={s.view} aria-busy="true">
      <header className={s.head}>
        <div className={s.headText}>
          {q ? (
            <h1 className={s.title}>
              <span className={s.titleQ}>{`‘${q}’`}</span>
              <span className={s.count}>찾는 중</span>
            </h1>
          ) : (
            <span className={`${s.sk} ${s.skHead}`} />
          )}
        </div>
      </header>
      <div className={s.scroller}>
        <ul className={s.grid}>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className={s.cell}>
              <SkeletonCard />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

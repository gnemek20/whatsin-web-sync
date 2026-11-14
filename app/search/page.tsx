// 검색 — 커뮤니티 공유 주소(whatsin.kr/search)의 첫 화면이다(2026-11-03 웹 리뉴얼 · 앱 SearchScreen + 홈의 첫 행동을 한 화면에).
// 서버에서 그린다. 상태 셋: 입력 전(?q·?c 없음) · 검색 결과(?q) · 둘러보기(?c). 「결과 없음」과 「연결 실패」는 다른 문장이다.
//   입력 전 — 브랜드 면(제목 · 큰 검색창 · 「이렇게 찾습니다」 예시 격자) → 바탕 시트(세 가지로 읽는 법 · 최근 검색 · 최근 본 제품 ·
//            둘러보기 · 많이 찾는 제품 · 오늘의 성분). 처음 온 사람이 무엇을 하면 되는지 첫 화면에서 안다.
//   결과   — 뜻 검색(/search/v2) · 영양 조건이면 정렬 기준(「당류 낮은 순, 100g(mL)당」)과 제품마다 그 값을 붙인다.
import type { Metadata } from 'next';
import Link from 'next/link';
import { browseCollection, getCollections, getIngredientOfDay, getPopular, getProductsFor, searchV2 } from '@/lib/api';
import { NUTRIENTS, avoidParam, type Lens, type NutrientKey } from '@/lib/lens';
import { readLens } from '@/lib/lens.server';
import { amountOf, lensRow, sortDesc } from '@/lib/facts';
import { LensLine } from '@/components/start/LensLine';
import { LatestPosts } from '@/components/start/LatestPosts';
import { Section } from '@/components/ui/Section';
import { ListCard, ListRow } from '@/components/ui/ListCard';
import { SEARCH_EXAMPLES } from '@/lib/site';
import { verdictTone } from '@/lib/axes';
import { SearchBox } from '@/components/SearchBox';
import { ProductList, ProductRow } from '@/components/ProductRow';
import { SortableResults, type SortRow } from '@/components/search/SortableResults';
import { EmptyState, ErrorState } from '@/components/States';
import { Icon, type IconName } from '@/components/Icon';
import { AppStoreButton } from '@/components/AppStoreButton';
import { RecentQueries, RecentViews, RecordQuery } from '@/components/search/Recents';
import { Rich } from '@/components/Rich';
import { axisKey, parseSort, sortOptions, type SortId } from '@/lib/sort';
import { bandOf } from '@/lib/bands';
import { SHORT_WORD } from '@/lib/content/words';
import type { ProductSummary } from '@/lib/types';
import styles from '@/components/search/search.module.css';

type Props = { searchParams: { q?: string; c?: string; sort?: string; by?: string } };


/** 결과 줄을 서버에서 한 번 그리고, 기준별 정렬 값 · 바닥 한 줄을 같이 넘긴다(정렬은 브라우저가 순서만 바꾼다 — SortableResults).
 *  결과 제품의 상세를 **모두** 동시에 받는다(열량 · 당질 · 피할 성분 — 목록 응답에는 열량이 없다 · 60개 동시 약 0.6초 · 1시간 캐시).
 *  TODO(api): 검색 응답(SearchItem)에 kcal100 · per100_unit 을 실으면 이 상세 묶음을 「내 기준」 숫자에만 쓰면 된다. */
async function buildRows(items: (ProductSummary & { metric?: string | null })[], lens: Lens | null): Promise<SortRow[]> {
  const ds = await getProductsFor(items.map((x) => x.id), lens ? avoidParam(lens) : '');
  const first = lens?.focus[0] ?? null;
  return items.map((p, i) => {
    const d = ds[i];
    const row = d && lens ? lensRow(d, lens.focus, lens.avoid) : null;
    const per = d?.nutrition.per100 ?? null;
    const unit = per?.unit === 'ml' ? '100mL' : '100g';
    const kcal = per?.kcal ?? null;
    const lensA = d && first ? amountOf(d, first, 'per100') : null;
    const g = p.axes?.glycemic;
    const carb = g?.band === 'amount' && g.carb_g != null ? g.carb_g : g?.band === 'n/a' ? 0 : null;
    const nb = bandOf(p.axes?.nutrition);
    const ib = bandOf(p.axes?.ingredient);
    const notes: Record<string, string> = {
      rel: p.metric ?? '',
      diet: kcal != null ? `${unit}당 ${Math.round(kcal)}kcal` : '열량 미확인',
      glucose: carb != null ? `1회분 당질 ${carb < 10 ? Math.round(carb * 10) / 10 : Math.round(carb)}g` : '당질 양 미확인',
      additive: ib ? `성분 ${SHORT_WORD(ib)}` : '성분 미확인',
      nutrition: nb ? `영양 균형 ${SHORT_WORD(nb, 'nutrition')}` : '영양 균형 미확인',
    };
    if (lens && lensA) notes.lens = row?.hits.length ? `${row.hits[0]} 들어 있음` : lensA.value != null ? `${unit}당 ${lensA.label} ${lensA.text}` : `${lensA.label} 미확인`;
    return {
      id: p.id,
      node: <ProductRow key={p.id} p={p} lens={row} notes={notes} />,
      keys: {
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

const optionsFor = (lens: Lens | null, rel: { label: string; sub: string }) =>
  sortOptions({ relLabel: rel.label, relSub: rel.sub, lens: lens ? { first: NUTRIENTS[lens.focus[0]].label, desc: sortDesc(lens.focus[0]) } : null });

export function generateMetadata({ searchParams }: Props): Metadata {
  const q = searchParams.q?.trim();
  return {
    title: q ? `‘${q}’ 검색` : '가공식품 검색',
    description: '가공식품 이름이나 「당이 낮은 아이스크림」 같은 조건으로 검색합니다. 영양 균형, 성분, 당질 세 가지로 판독합니다.',
  };
}

const COLL_ICON: Record<string, IconName> = { zero_drink: 'cup', good_grade: 'check', high_protein: 'apple' };

export default async function SearchPage({ searchParams }: Props) {
  const q = (searchParams.q ?? '').trim().slice(0, 60);
  const c = (searchParams.c ?? '').trim();
  const lens = readLens();
  const sort = parseSort(searchParams.sort, lens ? searchParams.by : null);
  if (q) return <Results q={q} sort={sort} lens={lens} />;
  if (c) return <Collection c={c} sort={sort} lens={lens} />;
  return <Start />;
}

// ── 입력 전 ────────────────────────────────────────────────────────────────

async function Start() {
  const [colls, popular, today] = await Promise.all([getCollections(), getPopular(5), getIngredientOfDay()]);
  const collections = colls.ok ? colls.data : [];
  const pop = popular.ok ? popular.data : [];
  const iod = today.ok ? today.data : null;
  const iodTone = iod ? verdictTone(iod.verdict) : null;

  return (
    <main className={styles.start}>
      {/* 첫 면 — 큰 제목 · 큰 검색창 · 내 기준 한 줄 · 예시 알약. 오른쪽(넓은 화면)은 「이렇게 보여 드립니다」 세 단계 */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroMain}>
            <p className={styles.heroKicker}>가공식품 라벨, 내 기준으로</p>
            <h1 className={`t-hero ${styles.heroTitle}`}>
              뭐가 들었는지
              <br />
              <span className={styles.heroAccent}>바로 확인</span>
            </h1>
            <p className={`t-body ${styles.heroSub}`}>제품 이름이나 「당이 낮은 과자」 같은 조건으로 찾으면, 내가 피하는 성분과 먼저 볼 숫자부터 보여 드립니다.</p>
            <SearchBox size="lg" hero />
            <LensLine className={styles.heroLens} />
            <ul className={styles.examples} aria-label="이렇게 찾습니다">
              {SEARCH_EXAMPLES.map((x) => (
                <li key={x.q}>
                  <Link href={`/search?q=${encodeURIComponent(x.q)}`} className={styles.example}>
                    <span className={styles.exampleQ}>{x.q}</span>
                    <span className={styles.exampleHint}>{x.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <ol className={styles.how} id="how" aria-label="이렇게 보여 드립니다">
            <li className={styles.howCell}>
              <span className={styles.howNum}>1</span>
              <span className={styles.howText}>
                <span className="t-headline">들었나</span>
                <span className="t-caption c-t2">내가 피하는 성분이 원재료에 있는지 먼저 알려 드립니다.</span>
              </span>
              <span className={`${styles.howDemo} ${styles.howDemoHit}`}>말티톨 들어 있음</span>
            </li>
            <li className={styles.howCell}>
              <span className={styles.howNum}>2</span>
              <span className={styles.howText}>
                <span className="t-headline">얼마나</span>
                <span className="t-caption c-t2">당질, 열량처럼 내가 고른 숫자를 1회분과 100g 기준으로 보여 드립니다.</span>
              </span>
              <span className={`${styles.howDemo} num`}>당질 19g</span>
            </li>
            <li className={styles.howCell}>
              <span className={styles.howNum}>3</span>
              <span className={styles.howText}>
                <span className="t-headline">다른 선택</span>
                <span className="t-caption c-t2">맛이 비슷한 제품 가운데 내 기준에 맞는 것부터 줄 세웁니다.</span>
              </span>
              <span className={styles.howDemo}>내 기준 순</span>
            </li>
          </ol>
        </div>
      </section>

      <div className={`container layout ${styles.below}`}>
        <div className="layout-main">
          {pop.length > 0 ? (
            <Section id="popular" title="많이 찾는 제품">
              <ProductList items={pop} grid />
            </Section>
          ) : null}
          {/* 브라우저 기록은 붙은 뒤에 그려진다 — 단의 맨 끝에 둬서 위 내용이 밀리지 않게(레이아웃 규칙 ③) */}
          <RecentViews />
        </div>
        <aside className="layout-side">
          {collections.length > 0 ? (
            <Section id="browse" title="둘러보기">
              <ListCard>
                {collections.map((x) => (
                  <ListRow
                    key={x.id}
                    href={`/search?c=${encodeURIComponent(x.id)}`}
                    leading={<span className={styles.badge}><Icon name={COLL_ICON[x.id] ?? 'doc'} size={20} /></span>}
                    title={x.label}
                    sub={<Rich text={x.desc} />}
                  />
                ))}
              </ListCard>
            </Section>
          ) : null}
          {iod ? (
            <Section id="iod" title="오늘의 성분">
              <Link href={`/i/${encodeURIComponent(iod.name)}`} className={styles.iod}>
                <span className={styles.iodHead}>
                  <span className={styles.iodIcon} style={iodTone ? { color: `var(--band-${iodTone})` } : undefined}><Icon name="flask" size={20} /></span>
                  <span className={`t-title ${styles.ellipsis}`}>{iod.name}</span>
                </span>
                <span className="t-caption c-t3">{iod.tag}</span>
                <span className="t-body c-t2"><Rich text={iod.plain} /></span>
                <span className={`t-caption ${styles.more}`}>자세히<Icon name="next" size={16} /></span>
              </Link>
            </Section>
          ) : null}
          <section className={styles.app}>
            <span className={styles.appIcon}><Icon name="scan" size={22} /></span>
            <span className={styles.appText}>
              <span className="t-strong">진열대 앞에서는 바코드로</span>
              <span className="t-caption c-t2">앱에서 찍으면 내 기준으로 바로 보여 드립니다.</span>
            </span>
            <AppStoreButton />
          </section>
          {/* 브라우저에서 채워지는 둘은 맨 끝(레이아웃 규칙 ③) */}
          <LatestPosts />
          <RecentQueries />
        </aside>
      </div>
    </main>
  );
}

// ── 검색 결과 ──────────────────────────────────────────────────────────────
// 검색창은 머리에 붙어 있다(site/HeaderSearch). PC 는 두 단(결과 | 다른 검색 · 최근 검색).

function SideExamples({ q }: { q?: string }) {
  return (
    <aside className={`layout-side pc-only ${styles.side}`}>
      <Section id="more-h" title="검색 예시">
        <ListCard>
          {SEARCH_EXAMPLES.filter((x) => x.q !== q).slice(0, 5).map((x) => (
            <ListRow key={x.q} href={`/search?q=${encodeURIComponent(x.q)}`} title={x.q} sub={x.hint} />
          ))}
        </ListCard>
      </Section>
      <RecentQueries />
    </aside>
  );
}

// 서버가 세울 수 있는 칩 — 검색 색인에 칸이 있는 것만(혈당 관리 · 첨가물 · 영양 균형은 브라우저가 그대로 세운다).
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

async function Results({ q, sort, lens }: { q: string; sort: SortId; lens: Lens | null }) {
  const ss = serverSortOf(sort, lens);
  const r = await searchV2(q, ss?.by, ss?.order);
  // 서버가 그 칩으로 세웠다고 응답이 말할 때만(`sort` 가 칩과 같다) 브라우저는 순서를 다시 세우지 않는다 —
  // 이름 검색으로 돌았거나(색인 적재 중) `by` 를 모르는 옛 서버면 브라우저가 세운다
  const serverSorted = ss && r.ok && r.data.mode !== 'name' && r.data.sort?.key === ss.by && (r.data.sort?.dir ?? 'asc') === ss.order ? sort : null;
  const serverChips = (['lens', 'diet'] as SortId[]).filter((id) => serverSortOf(id, lens));
  const base = `/search?q=${encodeURIComponent(q)}`;
  const items = r.ok ? r.data.items : [];
  const rows = items.length ? await buildRows(items, lens) : [];
  return (
    <main className={`container ${styles.page}`}>
      <RecordQuery q={q} />
      <div className="layout">
        <section className={`layout-main ${styles.body}`} aria-live="polite">
          {!r.ok ? (
            <ErrorState title="연결 오류" body={'검색 서버가 응답하지 않습니다. 결과가 없는 것과는 다릅니다.\n잠시 뒤 다시 시도해 주시기 바랍니다.'} retryHref={base} />
          ) : items.length === 0 ? (
            <EmptyState title="결과 없음" body={`‘${q}’ 검색 결과가 없습니다.\n더 짧게 쓰거나 다른 이름으로 검색해 보시기 바랍니다.`}>
              <ul className={styles.retryList}>
                {SEARCH_EXAMPLES.slice(0, 4).map((x) => (
                  <li key={x.q}>
                    <Link href={`/search?q=${encodeURIComponent(x.q)}`} className={`t-caption ${styles.retryLink}`}>{x.q}</Link>
                  </li>
                ))}
              </ul>
            </EmptyState>
          ) : (
            <>
              <div className={styles.meta}>
                <h1>
                  ‘{q}’ <span className="c-t3">{items.length}개</span>
                </h1>
              </div>
              {/* key 에 요청한 칩까지 — 서버가 못 세운 응답(옛 서버 · 이름 검색)에서도 다시 마운트해야 initialSort 로 브라우저가 세운다.
                  `serverSorted ?? 'rel'` 만 쓰면 관련도 → 칩에서 key 가 그대로라 칩만 켜지고 목록은 관련도 순으로 남았다(2026-11-14 중간보고 중 발견) */}
              <SortableResults
                key={`${sort || 'rel'}:${serverSorted ? 'srv' : 'cli'}`}
                rows={rows}
                serverSorted={serverSorted}
                serverChips={serverChips}
                options={optionsFor(lens, { label: '검색어와 가까운 순', sub: r.data.sort_label ? `검색어와 가까운 것부터(${r.data.sort_label})` : '검색어와 가장 가까운 것부터' })}
                initialSort={sort}
                lensDesc={lens ? sortDesc(lens.focus[0]) : false}
                rankedByDefault={!!r.data.sort_label}
                foot={
                  <p className={`t-caption c-t3 ${styles.foot}`}>
                    {lens
                      ? '카드의 숫자는 내 기준(100g(mL)당)입니다. 세 축은 합치지 않고 고른 기준 하나로만 줄 세웁니다.'
                      : '세 칸은 영양 균형, 성분, 1회분 당질입니다. 고른 기준 하나로만 줄 세우며 세 칸을 합치지 않습니다.'}
                  </p>
                }
              />
            </>
          )}
        </section>
        <SideExamples q={q} />
      </div>
    </main>
  );
}

// ── 둘러보기 ───────────────────────────────────────────────────────────────

async function Collection({ c, sort, lens }: { c: string; sort: SortId; lens: Lens | null }) {
  const [colls, r] = await Promise.all([getCollections(), browseCollection(c)]);
  const collections = colls.ok ? colls.data : [];
  const active = collections.find((x) => x.id === c);
  const selfHref = `/search?c=${encodeURIComponent(c)}`;
  const items = r.ok ? r.data : [];
  const rows = items.length ? await buildRows(items, lens) : [];
  return (
    <main className={`container ${styles.page}`}>
      <div className="layout">
        <div className="layout-main">
          <div className={styles.top}>
            <h1 className="t-display">{active ? active.label : '둘러보기'}</h1>
            {active ? <p className="t-body c-t2"><Rich text={active.desc} /></p> : null}
          </div>
          <section className={styles.body} aria-live="polite">
            {!r.ok ? (
              <ErrorState title="연결 오류" body={'서버가 응답하지 않습니다.\n잠시 뒤 다시 시도해 주시기 바랍니다.'} retryHref={selfHref} />
            ) : items.length === 0 ? (
              <EmptyState title="제품 없음" body="아직 모인 제품이 없습니다." />
            ) : (
              <>
                <p className={`t-caption c-t3 ${styles.count}`}>{items.length}개</p>
                <SortableResults rows={rows} options={optionsFor(lens, { label: '기본 순', sub: '이 묶음의 기본 순서대로' })} initialSort={sort} lensDesc={lens ? sortDesc(lens.focus[0]) : false} rankedByDefault={false} />
              </>
            )}
          </section>
        </div>
        <SideExamples />
      </div>
    </main>
  );
}

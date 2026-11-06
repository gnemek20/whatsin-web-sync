// 검색 — 커뮤니티 공유 주소(whatsin.kr/search)의 첫 화면이다(2026-11-03 웹 리뉴얼 · 앱 SearchScreen + 홈의 첫 행동을 한 화면에).
// 서버에서 그린다. 상태 셋: 입력 전(?q·?c 없음) · 검색 결과(?q) · 둘러보기(?c). 「결과 없음」과 「연결 실패」는 다른 문장이다.
//   입력 전 — 브랜드 면(제목 · 큰 검색창 · 「이렇게 찾습니다」 예시 격자) → 바탕 시트(세 가지로 읽는 법 · 최근 검색 · 최근 본 제품 ·
//            둘러보기 · 많이 찾는 제품 · 오늘의 성분). 처음 온 사람이 무엇을 하면 되는지 첫 화면에서 안다.
//   결과   — 뜻 검색(/search/v2) · 영양 조건이면 정렬 기준(「당류 낮은 순, 100g(mL)당」)과 제품마다 그 값을 붙인다.
import type { Metadata } from 'next';
import Link from 'next/link';
import { browseCollection, getCollections, getIngredientOfDay, getPopular, searchV2 } from '@/lib/api';
import { SEARCH_EXAMPLES } from '@/lib/site';
import { AXIS_NAME, verdictTone } from '@/lib/axes';
import { SearchBox } from '@/components/SearchBox';
import { ProductList } from '@/components/ProductRow';
import { EmptyState, ErrorState } from '@/components/States';
import { Icon, type IconName } from '@/components/Icon';
import { AppStoreButton } from '@/components/AppStoreButton';
import { RecentQueries, RecentViews, RecordQuery } from '@/components/search/Recents';
import { Rich } from '@/components/Rich';
import { SORTS, parseSort, sortItems, type SortId } from '@/lib/sort';
import styles from '@/components/search/search.module.css';

type Props = { searchParams: { q?: string; c?: string; sort?: string } };

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
  const sort = parseSort(searchParams.sort);
  if (q) return <Results q={q} sort={sort} />;
  if (c) return <Collection c={c} sort={sort} />;
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
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <Icon name="barcode" size={24} className={styles.heroMark} />
          <h1 className={`t-display ${styles.heroTitle}`}>
            뭐가 들었는지
            <br />
            바로 확인
          </h1>
          <p className={`t-body ${styles.heroSub}`}>제품 이름이나 원하는 조건으로 검색</p>
          <SearchBox size="lg" hero />
          <div className={styles.examples}>
            <p className={`t-micro ${styles.examplesHead}`}>이렇게 찾습니다</p>
            <ul className={styles.exampleGrid}>
              {SEARCH_EXAMPLES.map((x) => (
                <li key={x.q}>
                  <Link href={`/search?q=${encodeURIComponent(x.q)}`} className={styles.example}>
                    <span className={`t-strong ${styles.ellipsis}`}>{x.q}</span>
                    <span className={`t-micro ${styles.exampleHint}`}>{x.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className={`sheet sheet-paper sheet-last ${styles.sheet}`}>
        {/* PC 두 단 — 왼쪽 읽는 법 · 최근 본 제품 · 많이 찾는 제품, 오른쪽 최근 검색 · 둘러보기 · 오늘의 성분 · 앱 */}
        <div className="container layout">
          <div className="layout-main">
              <section className={styles.section} aria-labelledby="how">
                <h2 id="how" className={`t-headline ${styles.sectionTitle}`}>세 가지로 읽습니다</h2>
                <ul className={`card ${styles.how}`}>
                  <li className={styles.howCell}>
                    <span className={styles.howIcon}><Icon name="apple" size={20} /></span>
                    <span className="t-strong">{AXIS_NAME.nutrition}</span>
                    <span className="t-caption c-t2">당류, 나트륨, 포화지방, 단백질</span>
                  </li>
                  <li className={styles.howCell}>
                    <span className={styles.howIcon}><Icon name="flask" size={20} /></span>
                    <span className="t-strong">성분</span>
                    <span className="t-caption c-t2">주의 성분, 첨가물</span>
                  </li>
                  <li className={styles.howCell}>
                    <span className={styles.howIcon}><Icon name="bowl" size={20} /></span>
                    <span className="t-strong">당질</span>
                    <span className="t-caption c-t2">한 번에 밥 몇 공기</span>
                  </li>
                </ul>
              </section>
              <RecentViews />
              {pop.length > 0 ? (
                <section className={styles.section} aria-labelledby="popular">
                  <h2 id="popular" className={`t-headline ${styles.sectionTitle}`}>많이 찾는 제품</h2>
                  <ProductList items={pop} />
                </section>
              ) : null}
          </div>
          <aside className="layout-side">
              <RecentQueries />
              {collections.length > 0 ? (
                <section className={styles.section} aria-labelledby="browse">
                  <h2 id="browse" className={`t-headline ${styles.sectionTitle}`}>둘러보기</h2>
                  <ul className={styles.card}>
                    {collections.map((x) => (
                      <li key={x.id}>
                        <Link href={`/search?c=${encodeURIComponent(x.id)}`} className={styles.navRow}>
                          <span className={styles.badge}><Icon name={COLL_ICON[x.id] ?? 'doc'} size={20} /></span>
                          <span className={styles.navText}>
                            <span className="t-strong">{x.label}</span>
                            <span className={`t-caption c-t2 ${styles.ellipsis}`}><Rich text={x.desc} /></span>
                          </span>
                          <Icon name="next" size={16} className="c-t3" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {iod ? (
                <section className={styles.section} aria-labelledby="iod">
                  <Link href={`/i/${encodeURIComponent(iod.name)}`} className={`band-ink ${styles.iod}`}>
                    <span id="iod" className="t-micro c-t3">오늘의 성분</span>
                    <span className={styles.iodHead}>
                      <Icon name="flask" size={20} style={iodTone ? { color: `var(--band-${iodTone})` } : undefined} />
                      <span className={`t-title ${styles.ellipsis}`}>{iod.name}</span>
                    </span>
                    <span className="t-caption c-t3">{iod.tag}</span>
                    <span className="t-body c-t2"><Rich text={iod.plain} /></span>
                    <span className={`t-caption ${styles.more}`}>자세히<Icon name="next" size={16} /></span>
                  </Link>
                </section>
              ) : null}
              <section className={`${styles.section} ${styles.app}`}>
                <span className={styles.badge}><Icon name="scan" size={20} /></span>
                <span className={styles.navText}>
                  <span className="t-strong">바코드 스캔은 앱에서</span>
                  <span className="t-caption c-t2">진열대 앞 바코드 스캔</span>
                </span>
                <AppStoreButton />
              </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

// ── 검색 결과 ──────────────────────────────────────────────────────────────
// 검색창은 헤더에 붙어 있다(site/HeaderSearch) — 여기에는 두지 않는다. PC 는 두 단(결과 | 다른 검색 · 최근 검색).

function SortBar({ base, sort }: { base: string; sort: SortId }) {
  return (
    <nav className={styles.sortBar} aria-label="정렬">
      {SORTS.map((x) => (
        <Link
          key={x.id || 'rel'}
          href={x.id ? `${base}&sort=${x.id}` : base}
          className={`${styles.sortCell} ${x.id === sort ? styles.sortOn : ''}`}
          aria-current={x.id === sort ? 'true' : undefined}
          scroll={false}
        >
          {x.label}
        </Link>
      ))}
    </nav>
  );
}

function SideExamples({ q }: { q?: string }) {
  return (
    <aside className={`layout-side pc-only ${styles.side}`}>
      <section className={styles.section} aria-labelledby="more-h">
        <h2 id="more-h" className={`t-strong ${styles.sectionTitle}`}>검색 예시</h2>
        <ul className={`card ${styles.sideList}`}>
          {SEARCH_EXAMPLES.filter((x) => x.q !== q).slice(0, 5).map((x) => (
            <li key={x.q}>
              <Link href={`/search?q=${encodeURIComponent(x.q)}`} className={styles.sideRow}>
                <span className={`t-strong ${styles.ellipsis}`}>{x.q}</span>
                <span className="t-caption c-t3">{x.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <RecentQueries />
    </aside>
  );
}

async function Results({ q, sort }: { q: string; sort: SortId }) {
  const r = await searchV2(q);
  const base = `/search?q=${encodeURIComponent(q)}`;
  const items = r.ok ? sortItems(r.data.items, sort) : [];
  return (
    <main className={`container ${styles.page}`}>
      <RecordQuery q={q} />
      <div className="layout">
        <section className={`layout-main ${styles.body}`} aria-live="polite">
          {!r.ok ? (
            <ErrorState title="연결 오류" body={'검색 서버가 응답하지 않습니다. 결과가 없는 것과는 다릅니다.\n잠시 뒤 다시 시도해 주시기 바랍니다.'} retryHref={base} />
          ) : r.data.items.length === 0 ? (
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
                <h1 className="t-title">
                  ‘{q}’ <span className="c-t3">{r.data.items.length}개</span>
                </h1>
                {r.data.sort_label && !sort ? (
                  <p className={`t-caption ${styles.sortLabel}`}>
                    <Icon name="sliders" size={16} />
                    {r.data.sort_label}
                  </p>
                ) : null}
              </div>
              <SortBar base={base} sort={sort} />
              <ProductList items={items} grid ranked={!!sort || !!r.data.sort_label} metrics={r.data.sort_label ? items.map((x) => x.metric) : undefined} />
              <p className={`t-caption c-t3 ${styles.foot}`}>세 칸은 영양 균형, 성분, 1회분 당질입니다. 정렬은 한 칸씩 하며 세 칸을 합치지 않습니다.</p>
            </>
          )}
        </section>
        <SideExamples q={q} />
      </div>
    </main>
  );
}

// ── 둘러보기 ───────────────────────────────────────────────────────────────

async function Collection({ c, sort }: { c: string; sort: SortId }) {
  const [colls, r] = await Promise.all([getCollections(), browseCollection(c)]);
  const collections = colls.ok ? colls.data : [];
  const active = collections.find((x) => x.id === c);
  const selfHref = `/search?c=${encodeURIComponent(c)}`;
  const items = r.ok ? sortItems(r.data, sort) : [];
  return (
    <main className={`container ${styles.page}`}>
      <div className="layout">
      <div className="layout-main">
      <div className={styles.top}>
        <h1 className="t-title">{active ? active.label : '둘러보기'}</h1>
        {active ? <p className="t-caption c-t2"><Rich text={active.desc} /></p> : null}
      </div>
      <section className={styles.body} aria-live="polite">
        {!r.ok ? (
          <ErrorState title="연결 오류" body={'서버가 응답하지 않습니다.\n잠시 뒤 다시 시도해 주시기 바랍니다.'} retryHref={selfHref} />
        ) : r.data.length === 0 ? (
          <EmptyState title="제품 없음" body="아직 모인 제품이 없습니다." />
        ) : (
          <>
            <p className={`t-caption c-t3 ${styles.count}`}>{r.data.length}개</p>
            <SortBar base={selfHref} sort={sort} />
            <ProductList items={items} grid ranked={!!sort} />
          </>
        )}
      </section>
      </div>
      <SideExamples />
      </div>
    </main>
  );
}

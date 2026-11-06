// 제품 판독 — 서버에서 그린다(재검증 1시간). 앱 ProductDetailScreen 과 같은 순서(2026-11-03 웹 리뉴얼 · DESIGN_RULES §5 상세 화면 순서):
//   첫 면(식품 종류 틴트 · 사진 · 제조사 · 이름 · 공유)
//   ① 한눈에 — 세 칸 요약 + 면책 한 줄
//   ② 판정 근거 — 세 축 카드 · 가공육 안내 · 주의 성분
//   ③ 다른 선택 — 같은 종류와 견주면 → 더 나은 선택 → 비슷한 상품
//   ④ 원재료와 상세 정보(톤 시트) — 원재료 · 영양성분(섭취량 바꾸기) · 앱 안내
// 대안 · 비슷한 상품은 제품과 **동시에** 요청을 시작하고(React cache) 본문을 먼저 흘려보낸 뒤 따로 채운다(Suspense) — 하나가 늦거나
// 실패해도 본문은 기다리지 않는다. 같은 종류 비교도 따로 기다린다(처음 한 번 수 초).
import { PageBar } from '@/components/PageBar';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAlternatives, getProduct, getSimilar } from '@/lib/api';
import { bandOf, glycemicView, plain } from '@/lib/axes';
import { FoodTile, foodKind } from '@/components/FoodTile';
import { brandName } from '@/components/ProductRow';
import { Icon } from '@/components/Icon';
import { AppStoreButton } from '@/components/AppStoreButton';
import { AxisCards } from '@/components/product/AxisCards';
import { ReportButton } from '@/components/product/ReportButton';
import { AxisSummary } from '@/components/axis/AxisSummary';
import { NutritionPanel } from '@/components/product/NutritionPanel';
import { IngredientChips, ProcessedMeat } from '@/components/product/Ingredients';
import { AltTrack } from '@/components/product/AltTrack';
import { AltChooser } from '@/components/product/AltChooser';
import { ShareButton } from '@/components/product/ShareButton';
import { PeerCard, PeerCardSkeleton } from '@/components/product/PeerCard';
import { RecordView } from '@/components/search/Recents';
import { ErrorState } from '@/components/States';
import { Rich } from '@/components/Rich';
import styles from '@/components/product/detail.module.css';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getProduct(params.id);
  if (!r.ok) return { title: '제품' };
  const p = r.data;
  const ax = p.axes;
  const desc = ax
    ? `${plain(ax.nutrition.label)}. 성분 ${plain(ax.ingredient.label)}. 당질 ${plain(ax.glycemic.label)}`
    : `${brandName(p.brand)} ${p.sub}`;
  return {
    title: p.name,
    description: desc,
    openGraph: { title: `${p.name} | What's In?`, description: desc, images: p.image_url ? [p.image_url] : undefined },
  };
}

// 다른 선택 → 비슷한 상품. 비슷한 상품에서 대안과 겹치는 것은 뺀다.
async function AltSections({ id, showEmpty }: { id: string; showEmpty: boolean }) {
  const [alts, sims] = await Promise.all([getAlternatives(id), getSimilar(id)]);
  const altList = alts.ok ? alts.data : [];
  const altIds = new Set(altList.map((a) => a.id));
  const similar = (sims.ok ? sims.data : []).filter((s) => !altIds.has(s.id));
  return (
    <>
      {altList.length > 0 ? (
        <section aria-labelledby="alt-h" className={styles.section}>
          <h2 id="alt-h" className={`t-headline ${styles.sectionTitle}`}>다른 선택</h2>
          <AltChooser items={altList} />
        </section>
      ) : null}
      {similar.length > 0 ? (
        <section aria-labelledby="sim-h" className={styles.section}>
          <h2 id="sim-h" className={`t-headline ${styles.sectionTitle}`}>비슷한 상품</h2>
          <AltTrack items={similar.slice(0, 8)} label="비슷한 상품" />
        </section>
      ) : null}
      {showEmpty && altList.length === 0 ? (
        <p className={`t-caption c-t3 ${styles.note}`}>{alts.ok ? '견줄 더 나은 제품이 아직 없습니다.' : '다른 선택을 불러오지 못했습니다.'}</p>
      ) : null}
    </>
  );
}

// 다른 선택을 받는 동안 같은 자리 — 제목 줄 + 카드 줄(가로 넘김 카드 높이).
function AltSkeleton() {
  return (
    <div className={styles.section} aria-busy="true" aria-label="다른 선택 불러오는 중">
      <div className="skel" style={{ width: 96, height: 22 }} />
      <div className="skel" style={{ height: 196, borderRadius: 20 }} />
    </div>
  );
}

export default async function ProductPage({ params }: Props) {
  // 기다리지 않고 시작만 — AltSections 가 같은 요청(cache)을 이어받는다(폭포 없음).
  void getAlternatives(params.id);
  void getSimilar(params.id);
  const pr = await getProduct(params.id);
  if (!pr.ok) {
    if (pr.status === 404 || pr.status === 422) notFound();
    return (
      <main className={`container ${styles.errorPage}`}>
        <ErrorState title="불러오기 실패" body={'서버 연결이 끊겼습니다.\n잠시 뒤 다시 시도해 주시기 바랍니다.'} retryHref={`/p/${params.id}`} />
      </main>
    );
  }
  const p = pr.data;
  const gly = p.axes ? glycemicView(p.axes.glycemic) : null;
  const basisG = p.daily_value?.basis_g ?? p.nutrition.basis_g ?? null;
  const kind = foodKind(p.sub);

  const productHead = (
    <div className={styles.heroBody}>
      <span className={styles.heroTile}>
        <FoodTile type={p.sub} src={p.image_url} size={104} priority />
      </span>
      <div className={styles.heroText}>
        {brandName(p.brand) ? <p className={`t-caption c-t2 ${styles.ellipsis}`}>{brandName(p.brand)}</p> : null}
        <h1 className={`t-title ${styles.name}`}>{p.name}</h1>
        {p.sub ? <p className="t-caption c-t2">{p.sub}</p> : null}
      </div>
    </div>
  );
  // 세 축을 하나도 판단하지 못한 제품 — 칸은 그대로 띄우고(「모름」) 왜 못 띄우는지 한 줄(2026-11-03 사용자).
  const noVerdict =
    !!p.axes && bandOf(p.axes.nutrition) == null && bandOf(p.axes.ingredient) == null &&
    p.axes.glycemic.band !== 'amount' && p.axes.glycemic.band !== 'n/a';
  const summary = p.axes ? (
    <section aria-label="한눈에" className={styles.stack}>
      <AxisSummary axes={p.axes} />
      {noVerdict ? (
        <p className={`t-caption c-t2 ${styles.note}`}>
          <Rich text={'데이터가 충분하지 않아 판단할 수 없습니다.\n원재료와 영양성분은 아래에 있습니다.'} />
        </p>
      ) : (
        <p className={`t-caption c-t3 ${styles.note}`}>
          <Rich text={'포장에 표시된 영양성분과 원재료를 공표 기준과 비교합니다.\n개인의 혈당 반응을 예측하지 않습니다.'} />{' '}
          <a href="/#how" className="c-t2">읽는 법</a>
        </p>
      )}
    </section>
  ) : (
    <p className={`card t-body c-t2 ${styles.preparing}`}>
      <Icon name="clock" size={20} className="c-t3" />
      <span><Rich text={p.note || '**판독 준비 중**\n원재료와 영양성분은 아래에 있습니다.'} /></span>
    </p>
  );

  return (
    <main className={styles.page}>
      <RecordView p={p} />
      {/* 맨 위 줄 — 제품 카드 · 틴트 면 바깥(2026-11-06 사용자) · 모바일 · PC 같은 자리 */}
      <div className={`container ${styles.topBar}`}>
        <PageBar fallback="/search">
          <ShareButton title={p.name} />
        </PageBar>
      </div>
      {/* 모바일 첫 면 — 제품마다 식품 종류 틴트가 달라 「다른 제품」임이 바로 읽힌다(앱 hero). PC 는 왼쪽 단의 제품 카드가 대신한다. */}
      <header className={`m-only ${styles.hero}`} style={{ background: `var(--tile-${kind}-bg)` }}>
        <div className={`container ${styles.col}`}>
          {productHead}
        </div>
      </header>

      <div className={`sheet sheet-paper sheet-last ${styles.sheet}`}>
        {/* PC 두 단 — 왼쪽(붙어 따라옴) 제품 · 세 칸 요약, 오른쪽 근거 → 다른 선택 → 원재료 · 영양성분 */}
        <div className="container layout side-left">
          <aside className={`layout-side ${styles.side}`}>
            <div className={`pc-only ${styles.productCard}`} style={{ background: `var(--tile-${kind}-bg)` }}>
              {productHead}
            </div>
            {summary}
          </aside>

          <div className="layout-main">
            {p.axes ? (
              <section aria-labelledby="why-h" className={styles.section}>
                <h2 id="why-h" className={`t-headline ${styles.sectionTitle}`}>판정 근거</h2>
                <AxisCards axes={p.axes} basisG={basisG} parts={p.score_detail?.base_parts} fiberPer100={p.nutrition?.per100?.fiber ?? null} flagged={p.flagged} liquid={p.nutrition?.per100?.unit === 'ml'} dvBasis={p.daily_value?.basis ?? null} dvBasisG={p.daily_value?.basis_g ?? null} />
                {p.processed_meat ? <ProcessedMeat n={p.processed_meat} /> : null}
              </section>
            ) : null}

            {p.axes && !noVerdict ? (
              <section aria-label="같은 종류와 견주면" className={styles.section}>
                <Suspense fallback={<PeerCardSkeleton />}>
                  <PeerCard id={params.id} />
                </Suspense>
              </section>
            ) : null}
            <Suspense fallback={<AltSkeleton />}>
              <AltSections id={params.id} showEmpty={!!p.axes && !noVerdict} />
            </Suspense>

            {p.ingredients.length > 0 ? <IngredientChips items={p.ingredients} /> : null}
            <NutritionPanel nutrition={p.nutrition} dailyValue={p.daily_value} axisBowls={gly?.amount ? gly.amount.carbBowls : null} axisSugars={gly?.amount?.sugarsG ?? null} axisCarb={gly?.amount?.carbG ?? null} />
            <aside className={styles.app}>
              <span className={styles.appIcon}><Icon name="scan" size={20} /></span>
              <span className={styles.appText}>
                <span className="t-strong">바코드 스캔, 내 기준 경고는 앱에서</span>
                <span className="t-caption c-t2">진열대 앞 바코드 스캔</span>
              </span>
              <AppStoreButton />
            </aside>
            <ReportButton id={p.id} name={p.name} />
          </div>
        </div>
      </div>
    </main>
  );
}

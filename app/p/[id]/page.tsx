// 제품 판독 — 2026-11-14 전면 개편(사용자 「직관 · 누구나 · 한눈에 · 여유롭게 채운 느낌」).
//   맨 위 두 칸(PC) — 왼쪽 제품 카드(사진 · 이름 · 비교) | 오른쪽 「내 기준으로 보면」(들었나 문장 · 먼저 볼 숫자)
//   그 아래 — 함께 살펴볼 것 → 원재료 | 영양성분(넓은 화면 나란히) → 다른 선택 → 자세한 평가(세 축) → 비슷한 상품 → 앱 · 신고
// 대안 · 비슷한 상품 · 같은 종류는 제품과 **동시에** 받아 한 번에 그린다(나중에 끼어들어 밀지 않게 — 레이아웃 규칙 ③).
// 비교는 별도 화면이 아니라 이 화면 위의 창(components/p/Compare · 주소 ?vs=).
import { PageBar } from '@/components/PageBar';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAlternatives, getPeers, getProductFor, getSimilar } from '@/lib/api';
import { bandOf, glycemicView, plain } from '@/lib/axes';
import { avoidParam, type Lens } from '@/lib/lens';
import { readLens } from '@/lib/lens.server';
import { lensTab } from '@/lib/lensAlt.server';
import { basisOf } from '@/lib/facts';
import { FoodTile, foodKind } from '@/components/FoodTile';
import { brandName } from '@/components/ProductRow';
import { Icon } from '@/components/Icon';
import { AppStoreButton } from '@/components/AppStoreButton';
import { AxisCards } from '@/components/product/AxisCards';
import { ReportButton } from '@/components/product/ReportButton';
import { NutritionPanel } from '@/components/product/NutritionPanel';
import { IngredientChips, ProcessedMeat } from '@/components/product/Ingredients';
import { AltTrack } from '@/components/product/AltTrack';
import { AltChooser } from '@/components/product/AltChooser';
import { ShareButton } from '@/components/product/ShareButton';
import { PeerCard } from '@/components/product/PeerCard';
import { RecordView } from '@/components/search/Recents';
import { ErrorState } from '@/components/States';
import { Rich } from '@/components/Rich';
import { MyLens } from '@/components/p/MyLens';
import { Considerations } from '@/components/p/Considerations';
import { CompareOpenButton, CompareProvider } from '@/components/p/Compare';
import ps from '@/components/p/p.module.css';

type Props = { params: { id: string }; searchParams?: { vs?: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getProductFor(params.id, '');
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

// 다른 선택 — 목적별 탭에 「내 기준」 탭을 앞에 더한다(맛이 비슷한 10개의 상세를 받아 내 첫 영양소로 줄 세움).
async function AltSection({ id, lens, showEmpty }: { id: string; lens: Lens | null; showEmpty: boolean }) {
  const alts = await getAlternatives(id);
  const list = alts.ok ? alts.data : [];
  if (!list.length) {
    return showEmpty ? (
      <p className={ps.note}>{alts.ok ? '견줄 다른 선택이 아직 없습니다.' : '다른 선택을 불러오지 못했습니다.'}</p>
    ) : null;
  }
  const tab = await lensTab(list, lens);
  return (
    <section aria-labelledby="alt-h" className={ps.section}>
      <div className={ps.sectionHead}>
        <h2 id="alt-h" className={ps.sectionTitle}>다른 선택</h2>
        <span className="t-caption c-t3">맛이 비슷한 제품 중에서</span>
      </div>
      <AltChooser items={list} lens={tab} />
    </section>
  );
}

// 비슷한 상품 — 대안과 겹치는 것은 뺀다.
async function SimilarSection({ id }: { id: string }) {
  const [alts, sims] = await Promise.all([getAlternatives(id), getSimilar(id)]);
  const altIds = new Set((alts.ok ? alts.data : []).map((a) => a.id));
  const similar = (sims.ok ? sims.data : []).filter((s) => !altIds.has(s.id));
  if (!similar.length) return null;
  return (
    <section aria-labelledby="sim-h" className={ps.section}>
      <div className={ps.sectionHead}>
        <h2 id="sim-h" className={ps.sectionTitle}>비슷한 상품</h2>
      </div>
      <AltTrack items={similar.slice(0, 8)} label="비슷한 상품" />
    </section>
  );
}

export default async function ProductPage({ params, searchParams }: Props) {
  const lens = readLens();
  const [pr] = await Promise.all([getProductFor(params.id, avoidParam(lens)), getAlternatives(params.id), getSimilar(params.id), getPeers(params.id)]);
  if (!pr.ok) {
    if (pr.status === 404 || pr.status === 422) notFound();
    return (
      <main className="container">
        <ErrorState title="불러오기 실패" body={'서버 연결이 끊겼습니다.\n잠시 뒤 다시 시도해 주시기 바랍니다.'} retryHref={`/p/${params.id}`} />
      </main>
    );
  }
  const p = pr.data;
  const gly = p.axes ? glycemicView(p.axes.glycemic) : null;
  const basisG = p.daily_value?.basis_g ?? p.nutrition.basis_g ?? null;
  const kind = foodKind(p.sub);
  const basis = basisOf(p);
  const noVerdict =
    !!p.axes && bandOf(p.axes.nutrition) == null && bandOf(p.axes.ingredient) == null &&
    p.axes.glycemic.band !== 'amount' && p.axes.glycemic.band !== 'n/a';
  const vs = (searchParams?.vs ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 3);
  const facts = [
    p.sub ? { k: '식품 종류', v: p.sub } : null,
    { k: '숫자 기준', v: basis.label },
    p.ingredients.length ? { k: '원재료', v: `${p.ingredients.length}종` } : null,
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <main className={ps.page}>
      <CompareProvider base={p} lens={lens} initial={vs}>
        <RecordView p={p} />
        <div className="container">
          <PageBar fallback="/search">
            <ShareButton title={p.name} />
          </PageBar>
        </div>

        <div className={`container ${ps.wrap}`}>
          {/* ── 맨 위 — 제품 | 내 기준 ── */}
          <div className={ps.top}>
            <section className={ps.idCard} aria-label="제품" style={{ ['--tile-bg' as string]: `var(--tile-${kind}-bg)` }}>
              <div className={ps.idMedia}>
                <span className={ps.idTileL}><FoodTile type={p.sub} src={p.image_url} size={200} priority /></span>
                <span className={ps.idTileS}><FoodTile type={p.sub} src={p.image_url} size={88} /></span>
              </div>
              <div className={ps.idText}>
                <p className={ps.idBrand}>{brandName(p.brand) || ' '}</p>
                <h1 className={ps.idName}>{p.name}</h1>
              </div>
              <dl className={ps.idFacts}>
                {facts.map((f) => (
                  <div key={f.k} className={ps.idFact}>
                    <dt>{f.k}</dt>
                    <dd>{f.v}</dd>
                  </div>
                ))}
              </dl>
              <div className={ps.idActions}>
                <CompareOpenButton />
              </div>
            </section>

            <div className={ps.answerCol}>
              {lens ? <MyLens p={p} lens={lens} /> : <div className={`skel ${ps.lensPlaceholder}`} aria-hidden />}
            </div>
          </div>

          {/* ── 본문 ── */}
          <div className={ps.body}>
            {lens ? <Considerations p={p} lens={lens} /> : null}

            <div className={ps.pair}>
              {p.ingredients.length > 0 ? <IngredientChips items={p.ingredients} /> : null}
              <NutritionPanel nutrition={p.nutrition} dailyValue={p.daily_value} axisBowls={gly?.amount ? gly.amount.carbBowls : null} axisSugars={gly?.amount?.sugarsG ?? null} axisCarb={gly?.amount?.carbG ?? null} />
            </div>

            <AltSection id={params.id} lens={lens} showEmpty={!!p.axes && !noVerdict} />

            {/* 자세한 평가 — 예전 맨 위였던 세 축(사용자 2026-11-13 「아래로」) */}
            {p.axes ? (
              <section aria-labelledby="why-h" className={`${ps.section} ${ps.detailed}`}>
                <div className={ps.detailedHead}>
                  <h2 id="why-h" className={ps.sectionTitle}>자세한 평가</h2>
                  <p className="t-caption c-t2">
                    <Rich text={'포장에 표시된 영양성분과 원재료를 공표 기준과 비교합니다. 개인의 혈당 반응을 예측하지 않습니다.'} />{' '}
                    <a href="/#how" className={ps.inlineLink}>읽는 법</a>
                  </p>
                </div>
                {noVerdict ? (
                  <p className={ps.note}>
                    <Rich text={'데이터가 충분하지 않아 판단할 수 없습니다.\n원재료와 영양성분은 위에 있습니다.'} />
                  </p>
                ) : null}
                <AxisCards axes={p.axes} basisG={basisG} parts={p.score_detail?.base_parts} fiberPer100={p.nutrition?.per100?.fiber ?? null} flagged={p.flagged} liquid={p.nutrition?.per100?.unit === 'ml'} dvBasis={p.daily_value?.basis ?? null} dvBasisG={p.daily_value?.basis_g ?? null} />
                {p.processed_meat ? <ProcessedMeat n={p.processed_meat} /> : null}
                {!noVerdict ? <PeerCard id={params.id} /> : null}
              </section>
            ) : (
              <p className={`card ${ps.preparing}`}>
                <Icon name="clock" size={20} className="c-t3" />
                <span><Rich text={p.note || '**판독 준비 중**\n원재료와 영양성분은 위에 있습니다.'} /></span>
              </p>
            )}

            <SimilarSection id={params.id} />

            <aside className={ps.app}>
              <span className={ps.appIcon}><Icon name="scan" size={22} /></span>
              <span className={ps.appText}>
                <span className="t-headline">진열대 앞에서는 바코드로</span>
                <span className="t-caption c-t2">앱에서 바코드를 찍으면 내 기준으로 바로 보여 드립니다.</span>
              </span>
              <AppStoreButton />
            </aside>
            <ReportButton id={p.id} name={p.name} />
          </div>
        </div>
      </CompareProvider>
    </main>
  );
}

// 제품 판독 — 2026-11-14 전면 개편(사용자 「직관 · 누구나 · 한눈에 · 여유롭게 채운 느낌」).
//   맨 위 두 칸(PC) — 왼쪽 제품 카드(사진 · 이름 · 비교) | 오른쪽 「내 기준으로 보면」(들었나 문장 · 먼저 볼 숫자)
//   그 아래 — 함께 살펴볼 것 → 원재료 | 영양성분(넓은 화면 나란히) → 다른 선택 → 자세한 평가(세 축) → 비슷한 상품 → 앱 · 신고
// 대안 · 비슷한 상품 · 같은 종류는 제품과 **동시에** 받아 한 번에 그린다(나중에 끼어들어 밀지 않게 — 레이아웃 규칙 ③).
// 비교는 별도 화면이 아니라 이 화면 위의 창(components/p/Compare · 주소 ?vs=).
import { DockSearch } from '@/components/shell/DockSearch';
import { PageBar } from '@/components/PageBar';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAlternatives, getPeers, getProductFor, getSimilar } from '@/lib/api';
import { bandOf, glycemicView, plain } from '@/lib/axes';
import { avoidParam, type Lens } from '@/lib/lens';
import { readLens } from '@/lib/lens.server';
import { altCells, lensTab } from '@/lib/lensAlt.server';
import { amountOf, basisOf } from '@/lib/facts';
import { FoodTile, foodCat, foodKind } from '@/components/FoodTile';
import { AskLink } from '@/components/home/Picks';
import Link from 'next/link';
import ls from '@/components/home/landing.module.css';
import { hubHref, hubSub, hubsForCat } from '@/lib/hubs';
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
import { LensPrompt } from '@/components/p/LensPrompt';
import { CoupangLink } from '@/components/product/CoupangLink';
import { PhotoContribute } from '@/components/product/PhotoContribute';
import { Considerations } from '@/components/p/Considerations';
import { CompareOpenButton, CompareProvider } from '@/components/p/Compare';
import ps from '@/components/p/p.module.css';

type Props = { params: { id: string }; searchParams?: { vs?: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getProductFor(params.id, '');
  if (!r.ok) return { title: '제품' };
  const p = r.data;
  // 검색 결과에 나가는 제목 · 설명(2026-11-18 사용자 「제품 이름으로 검색하면 우리 상세가 나오게」) — 이름 + 「성분, 영양 분석」, 설명은 라벨 숫자 그대로.
  const brand = brandName(p.brand);
  const b = basisOf(p);
  const nums = (['kcal', 'sugar', 'sodium', 'carb_net'] as const)
    .map((k) => amountOf(p, k, 'serving'))
    .filter((a) => a.value != null)
    .map((a) => `${a.label} ${a.text}`);
  const adds = p.score_detail?.additive_names?.length ?? 0;
  const ings = p.ingredients?.length ?? 0;
  const desc = [
    `${brand ? `${brand} ` : ''}${p.name}${p.sub ? `(${p.sub})` : ''}의 원재료와 영양성분.`,
    ings ? `원재료 ${ings}종${adds ? `, 식품첨가물 ${adds}종` : ''}.` : '',
    nums.length ? `${b.kind === 'per100' ? b.label : `${b.label} 기준`} ${nums.join(', ')}.` : '',
    '감미료, 첨가물과 비슷한 다른 선택을 함께 확인하세요.',
  ].filter(Boolean).join(' ');
  const title = `${p.name} 성분, 영양 분석`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/p/${p.id}` },
    openGraph: { title: `${title} | What's In?`, description: desc, url: `/p/${p.id}`, images: p.image_url ? [p.image_url] : undefined },
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
  const [tab, cells] = await Promise.all([lensTab(list, lens), altCells(list, lens)]);
  return (
    <section aria-labelledby="alt-h" className={ps.section}>
      <div className={ps.sectionHead}>
        <h2 id="alt-h" className={ps.sectionTitle}>다른 선택</h2>
        <span className="t-caption c-t3">맛이 비슷한 제품 중에서</span>
      </div>
      <AltChooser items={list} lens={tab} cells={cells} base={id} />
    </section>
  );
}

// 비슷한 상품 — 대안과 겹치는 것은 뺀다.
async function SimilarSection({ id, lens }: { id: string; lens: Lens | null }) {
  const [alts, sims] = await Promise.all([getAlternatives(id), getSimilar(id)]);
  const altIds = new Set((alts.ok ? alts.data : []).map((a) => a.id));
  const similar = (sims.ok ? sims.data : []).filter((s) => !altIds.has(s.id));
  if (!similar.length) return null;
  const shown = similar.slice(0, 8);
  const cells = await altCells(shown, lens);
  return (
    <section aria-labelledby="sim-h" className={ps.section}>
      <div className={ps.sectionHead}>
        <h2 id="sim-h" className={ps.sectionTitle}>비슷한 상품</h2>
      </div>
      <AltTrack items={shown} label="비슷한 상품" ev="similar_click" base={id} cellsOf={(a) => cells[a.id] ?? null} />
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
        <ErrorState title="불러오기 실패" body="잠시 뒤 다시 시도해 주시기 바랍니다." retryHref={`/p/${params.id}`} />
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
          <PageBar fallback="/">
            <ShareButton title={p.name} />
          </PageBar>
        </div>

        <div className={`container ${ps.wrap}`}>
          {/* ── 맨 위 — 제품 | 내 기준 ── */}
          {/* 내 기준이 없으면 오른쪽 칸에 설정으로 이어 주는 칸(LensPrompt · 2026-11-18 사용자 · 11-17 의 「아예 숨김」을 바꿨다) */}
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
                <CoupangLink url={p.coupang_partner_url} pid={p.id} />
                {/* 대표 사진이 없으면 사용자가 올린다(2026-11-18 · 검토 뒤 반영) */}
                {!p.image_url ? <PhotoContribute id={p.id} name={p.name} /> : null}
              </div>
            </section>

            <div className={ps.answerCol}>
              {lens ? <MyLens p={p} lens={lens} /> : <LensPrompt />}
            </div>
          </div>

          {/* ── 본문 ── */}
          <div className={ps.body}>
            {/* 다른 선택 — 맨 위 바로 아래(2026-11-17 사용자 「상단으로 옮겨 얼마나 확인하고 누르는지」 · 행동 기록 alt_view · alt_click) */}
            <AltSection id={params.id} lens={lens} showEmpty={!!p.axes && !noVerdict} />

            {lens ? <Considerations p={p} lens={lens} /> : null}

            <div className={ps.pair}>
              {p.ingredients.length > 0 ? <IngredientChips items={p.ingredients} /> : null}
              <NutritionPanel nutrition={p.nutrition} dailyValue={p.daily_value} axisBowls={gly?.amount ? gly.amount.carbBowls : null} axisSugars={gly?.amount?.sugarsG ?? null} axisCarb={gly?.amount?.carbG ?? null} />
            </div>


            {/* 자세한 평가 — 예전 맨 위였던 세 축(사용자 2026-11-13 「아래로」) */}
            {p.axes ? (
              <section aria-labelledby="why-h" className={`${ps.section} ${ps.detailed}`}>
                <div className={ps.detailedHead}>
                  <h2 id="why-h" className={ps.sectionTitle}>자세한 평가</h2>
                  <a href="/guide#how" className={`t-caption ${ps.inlineLink}`}>읽는 법</a>
                </div>
                {noVerdict ? (
                  <p className={ps.note}>
                    <Rich text={'자료가 부족해 판단하지 않습니다.'} />
                  </p>
                ) : null}
                <AxisCards axes={p.axes} basisG={basisG} parts={p.score_detail?.base_parts} fiberPer100={p.nutrition?.per100?.fiber ?? null} carbPer100={p.nutrition?.per100?.carb ?? null} flagged={p.flagged} liquid={p.nutrition?.per100?.unit === 'ml'} dvBasis={p.daily_value?.basis ?? null} dvBasisG={p.daily_value?.basis_g ?? null} additives={p.score_detail?.additive_names ?? []} ingredients={p.ingredients} />
                {p.processed_meat ? <ProcessedMeat n={p.processed_meat} /> : null}
                {!noVerdict ? <PeerCard id={params.id} /> : null}
              </section>
            ) : (
              <p className={`card ${ps.preparing}`}>
                <Icon name="clock" size={20} className="c-t3" />
                <span><Rich text={p.note || '**판독 준비 중**'} /></span>
              </p>
            )}

            <SimilarSection id={params.id} lens={lens} />

            {/* 같은 종류 조건으로 찾기(분류 허브 · 2026-11-18) — 이 제품 분류의 허브를 첫 화면 조건 카드 모양으로 */}
            {hubsForCat(foodCat(p.sub).id).length ? (
              <section aria-labelledby="hub-h" className={ps.section}>
                <div className={ps.sectionHead}>
                  <h2 id="hub-h" className={ps.sectionTitle}>{`${foodCat(p.sub).label} 조건으로 찾기`}</h2>
                  <Link href="/c" className="t-caption c-t2">전체 보기</Link>
                </div>
                <ul className={ls.asks}>
                  {hubsForCat(foodCat(p.sub).id).slice(0, 4).map((x) => (
                    <li key={x.slug}>
                      <AskLink href={hubHref(x)} type={x.tile} sub={hubSub(x)}>{x.title}</AskLink>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <aside className={ps.app}>
              <span className={ps.appIcon}><Icon name="scan" size={22} /></span>
              <span className={ps.appText}>
                <span className="t-headline">바코드는 앱으로</span>
                <span className="t-caption c-t2">매장에서 찍으면 바로 확인</span>
              </span>
              {/* 어두운 면 위라 밝은 단추(잉크 단추는 면에 묻혔다) */}
              <AppStoreButton tone="paper" />
            </aside>
            <ReportButton id={p.id} name={p.name} />
          </div>
        </div>
      </CompareProvider>
      <DockSearch autoHide />
    </main>
  );
}

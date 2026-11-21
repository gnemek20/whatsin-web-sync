// 세 축 카드 — 영양(칸) · 성분(칸) · 당질(양·구성) 순(2026-11-04 사용자). 문구는 lib/content(web/data) — 축 label · reason · note 는
// lib/api 가 코드로 다시 만들어 둔 값이고, 당질 카드의 문장은 carb.json copy 에서 읽는다.
// 수식($69\,\text{g}$)은 이 카드에만 있어 KaTeX 글꼴 CSS 도 여기서만 싣는다(다른 화면에 내려가지 않게).
import 'katex/dist/katex.min.css';
import type React from 'react';
import { Icon } from '../Icon';
import { Meter } from '../axis/Meter';
import { Rich } from '@/components/Rich';
import {
  AXIS_SOURCE,
  carbWhy,
  carbWhyMore,
  dvSugarG,
  liquidSugarNote,
  carbAnalogy,
  fmt1,
  sameAmountText,
  glycemicView,
  ingredientView,
  nutritionView,
  plain,
  type AxisView,
  type GlycemicView,
} from '@/lib/axes';
import type { Ingredient, ProductAxes, ScorePart } from '@/lib/types';
import { ConcernList } from './Ingredients';
import { NutrientConcerns, intakeParts } from './NutrientConcerns';
import { CARB_COPY, carbAmount, carbBandText, carbRef } from '@/lib/content/carb';
import { NUTRIENTS_BASIS } from '@/lib/content/nutrients';
import { fill } from '@/lib/content/text';
import styles from './product.module.css';
import ts from './axisTabs.module.css';
import { AxisTabs, type AxisTab } from './AxisTabs';
import { GridPeek } from '../ui/GridPeek';
import { bandWord, nnsCopy, type NnsCopy } from '@/lib/content/axes';

const ICON = { nutrition: 'apple', glycemic: 'bowl', ingredient: 'flask' } as const;

// 세 축(2026-11-14 개편) — 위 타일 세 칸(축 이름 · 판정 · 칸 막대 · 핵심 한 줄)으로 한눈에 보고, 고른 칸의 근거만 아래 패널에 편다
// (사용자 「너무 길고 방대해서 한 눈에 안 들어와」 · 예전 「한 판의 세 줄 + 아코디언」과 위 요약 카드를 하나로 합쳤다).
// 처음 펼친 칸은 가장 주의할 축(칸이 높은 쪽), 둘 다 낮으면 영양 균형. 긴 설명(개인차 · 혈당지수 대신 양인 이유)은 패널의 「자세히」 안.

/** note 의 첫 줄(타일 한 줄)과 나머지(패널) */
const firstLine = (t: string) => t.split('\n')[0] ?? '';
const restLines = (t: string) => t.split('\n').slice(1).join('\n');

function Tile({ v, value, bar, fact }: { v: AxisView; value: string; bar: React.ReactNode; fact: string }) {
  return (
    <>
      <span className={ts.tileHead}>
        <span
          className={ts.tileIcon}
          style={v.tone ? { color: `var(--band-${v.tone})`, background: `color-mix(in srgb, var(--band-${v.tone}) 14%, transparent)` } : undefined}
        >
          <Icon name={ICON[v.key]} size={18} />
        </span>
        <span className="t-caption">{v.name}</span>
      </span>
      <span className={ts.tileValue} style={v.tone ? { color: `var(--band-${v.tone}-t)` } : v.muted ? { color: 'var(--t3)' } : undefined}>
        <Rich text={value} />
      </span>
      <span className={ts.tileBar}>{bar}</span>
      <span className={ts.tileFact}>{fact ? <Rich text={fact} /> : null}</span>
    </>
  );
}

function More({ children }: { children: React.ReactNode }) {
  return (
    <details className={styles.why}>
      <summary className="t-caption c-t2">자세히</summary>
      <div className={styles.whyBody}>{children}</div>
    </details>
  );
}

// 기준 출처 한 줄 — 패널 맨 아래 가는 선 위에 늘 연하게(2026-11-05 사용자 「짧은 출처는 상시 연하게 · 긴 것만 자세히」).
function Source({ text }: { text: string }) {
  return <p className={`t-caption ${ts.foot}`}><Rich text={text} /></p>;
}

/** 패널 머리 — 판정 전체 문구(타일은 짧은 말) + 타일에 못 넣은 보조 줄 */
function PanelHead({ v, rest }: { v: AxisView; rest?: string }) {
  return (
    <div className={ts.panelHead}>
      <p className="t-headline" style={v.tone ? { color: `var(--band-${v.tone}-t)` } : undefined}><Rich text={v.value} /></p>
      {rest ? <p className="t-body c-t2"><Rich text={rest} /></p> : null}
    </div>
  );
}

/** 당류(아래끝) ~ 가용탄수(위끝) 구간을 밥 공기 눈금 위에 그린다. 색은 중립. */
// 밥그릇(위에서 본 모양) — 앱 AxisPanel.RiceBowl 과 같은 그림. 테두리 안을 fill 만큼 부채꼴로 채운다.
function RiceBowl({ fill }: { fill: number }) {
  const f = fill <= 0 ? 0 : Math.min(1, Math.max(0.04, fill));
  const C = 18;
  const R = 12.5;
  let rice: React.ReactNode = null;
  if (f >= 0.999) rice = <circle cx={C} cy={C} r={R} className={styles.bowlRice} />;
  else if (f > 0) {
    const ang = f * 2 * Math.PI;
    const x = C + R * Math.sin(ang);
    const y = C - R * Math.cos(ang);
    rice = <path d={`M${C} ${C}L${C} ${C - R}A${R} ${R} 0 ${ang > Math.PI ? 1 : 0} 1 ${x} ${y}Z`} className={styles.bowlRice} />;
  }
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
      <circle cx={C} cy={C} r={16} className={styles.bowlRim} />
      <circle cx={C} cy={C} r={R} className={styles.bowlIn} />
      {rice}
    </svg>
  );
}

const MAX_BOWLS = 5;

const pctText = (n: number) => `${Math.round(n * 100)}%`;
/** 「밥 한 끼(1공기)의 27%」 — 숫자만 굵게 */
const boldPct = (t: string) => t.replace(/(\d+%)$/, '**$1**');

// 당질 참고 기준(2026-11-10) — 「당질 보통」 + 「참고 기준」 꼬리표(늘 같이) + 「간식 한 번 몫의 62%」 · 「간식 1회 몫(24.3g) 대비」.
// 판정색을 쓰지 않는다(높음을 경고색으로 띄우지 않는다 · 참고 기준이다). 기준을 만드는 방법(explain · explain_band · explain_source)은
// docs/IP.md §3 점검 전이라 아직 보이지 않는다(핸드오프 §6).
function CarbBandLine({ cb }: { cb: NonNullable<GlycemicView['amount']>['budget'] & object }) {
  const t = carbBandText(cb);
  return (
    <div className={styles.concernTitle}>
      <span className={`t-caption ${styles.vtag}`}>{t.chip}</span>
      <span className={`t-micro ${styles.tag}`}>{t.reference}</span>
      <span className="t-caption c-t2">{t.share}, {t.basis}</span>
    </div>
  );
}

// 당질 — 타일 큰 글씨는 1회분 당질 g(2026-11-13 사용자 「실 수치가 메인」) · 막대는 당류 비중(무채색).
// 패널 왼쪽 = 양(1회분 줄 · 밥그릇 · 원물 비유 · 참고 기준), 오른쪽 = 구성(당류 비중 · 식이섬유 · 왜 양인가). 판정색 없음.
// 2026-11-18 사용자 「지금 당질은 순탄수화물이다」 — 축 값(서버 carb_g)은 탄수 − 섬유 − 흡수 안 되는 당알코올 = 순탄수화물.
// 당질(탄수 − 섬유 · 당알코올 포함)과 어떻게 이어지는지를 계산 줄로 보인다. 흡수 안 되는 당알코올 = 당질 − 순탄수(같은 기준의 차 — 따로 반올림한 값을 쓰면 식이 안 맞는다).
function CarbCalc({ carbG, fiberG, netG, unit }: { carbG: number; fiberG: number | null; netG: number; unit: string }) {
  const glucide = carbG - (fiberG ?? 0);
  const polyol = glucide - netG;
  if (glucide < 0 || polyol < -0.15) return null; // 라벨 모순 · 기준이 다른 값 — 식을 보이지 않는다
  const g = (n: number) => `${fmt1(Math.max(0, n))}${unit}`;
  const rows: { op: string; label: string; value: string; strong?: boolean }[] = [
    { op: '', label: CARB_COPY.calc_carb, value: g(carbG) },
    { op: '−', label: CARB_COPY.calc_fiber, value: fiberG == null ? CARB_COPY.calc_fiber_unlisted : g(fiberG) },
    { op: '=', label: CARB_COPY.calc_glucide, value: g(glucide), strong: polyol < 0.05 },
  ];
  if (polyol >= 0.05) {
    rows.push({ op: '−', label: CARB_COPY.calc_polyol, value: g(polyol) });
    rows.push({ op: '=', label: CARB_COPY.calc_net, value: g(netG), strong: true });
  }
  return (
    <dl className={styles.calc} aria-label={CARB_COPY.calc_title}>
      {rows.map((r) => (
        <div key={r.label} className={r.strong ? styles.calcStrong : undefined}>
          <dt className="t-caption"><span className={styles.calcOp} aria-hidden>{r.op}</span>{r.label}</dt>
          <dd className="t-caption">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function glycemicTab(v: GlycemicView, basisG: number | null, fiberPer100: number | null, liquid: boolean, carbPer100: number | null, carbLabelG: number | null): AxisTab {
  const m = v.amount;
  const share = m && m.sugarsG != null && m.carbG > 0 ? Math.min(1, m.sugarsG / m.carbG) : null;
  const an = m ? carbAnalogy(m.carbG, m.sugarsG) : null;
  const fiberG = fiberPer100 != null && fiberPer100 > 0 && basisG ? Math.round(fiberPer100 * basisG) / 100 : null;
  // 계산 줄 — 축과 같은 기준(1회분 · 포장 전체)의 탄수 · 섬유. 역산 제품은 서버가 준 1회분 라벨 탄수(carb_label_g)를 쓴다.
  const calcCarb = carbLabelG ?? (carbPer100 != null && basisG ? (carbPer100 * basisG) / 100 : null);
  const calcFiber = fiberPer100 != null && basisG ? (fiberPer100 * basisG) / 100 : 0;
  const n = m ? Math.min(MAX_BOWLS, Math.max(1, Math.ceil(m.carbBowls - 1e-9))) : 0;
  const extra = m ? Math.ceil(m.carbBowls) - MAX_BOWLS : 0;
  // 「1회분(30g)」 · 「한 포장(500mL)」 — 머리말은 nutrients.json basis
  const basisHead = m ? `${m.wholePack ? NUTRIENTS_BASIS.total_content : NUTRIENTS_BASIS.serving}${basisG ? `(${Math.round(basisG)}${liquid ? 'mL' : 'g'})` : ''}` : '';
  const bar = (
    <span className={ts.mixBar} aria-hidden>
      {share != null ? <span style={{ width: `${share * 100}%` }} /> : null}
    </span>
  );
  const fact = m ? [`${basisHead} 기준`, m.budget ? carbBandText(m.budget).chip : ''].filter(Boolean).join(', ') : firstLine(v.note);
  const tile = <Tile v={v} value={m ? carbAmount(m.carbG) : v.value} bar={bar} fact={fact} />;
  if (!m) {
    return {
      key: 'glycemic',
      tile,
      panel: (
        <>
          {v.note ? <p className="t-body c-t2"><Rich text={v.note} /></p> : null}
          <Source text={AXIS_SOURCE.glycemic} />
        </>
      ),
    };
  }
  const panel = (
    <>
      <div className={ts.cols}>
        <div className={ts.col}>
          <p className="t-headline"><Rich text={`${fill(CARB_COPY.basis_line, { basis: basisHead })} **${fmt1(m.carbG)}g**`} /></p>
          <div className={styles.bowls} aria-label={fill(CARB_COPY.meal_pct, { pct: an?.mealPct ?? 0 }) ?? undefined}>
            {Array.from({ length: n }, (_, i) => (
              <RiceBowl key={i} fill={Math.max(0, Math.min(1, m.carbBowls - i))} />
            ))}
            {extra > 0 ? <span className="t-caption c-t2">+{extra}</span> : null}
          </div>
          {an ? (
            <p className="t-caption c-t2">
              {[carbRef(an), an.food !== 'rice' ? fill(CARB_COPY.meal_pct, { pct: an.mealPct }) : ''].filter(Boolean).join(', ')}
            </p>
          ) : null}
          {m.budget ? <CarbBandLine cb={m.budget} /> : null}
        </div>
        <div className={ts.col}>
          {share != null ? (
            <div className={styles.mix}>
              <div className={styles.mixTrack}>
                <span className={styles.mixSugar} style={{ width: `${share * 100}%` }} />
              </div>
              <div className={`t-caption ${styles.mixLegend}`}>
                <span className="c-t2">{fill(CARB_COPY.sugar_part, { g: fmt1(m.sugarsG!), pct: pctText(share) })}</span>
                <span className="c-t3">{fill(CARB_COPY.starch_rest, { pct: pctText(1 - share) })}</span>
              </div>
            </div>
          ) : (
            <p className="t-caption c-t3">{CARB_COPY.sugar_unlisted}</p>
          )}
          {an?.sugarLed ? (
            <p className="t-caption c-t2"><Rich text={liquid ? `${CARB_COPY.sugar_led}\n${liquidSugarNote()}` : CARB_COPY.sugar_led} /></p>
          ) : null}
          {fiberG != null && calcCarb == null ? <p className="t-caption c-t2"><Rich text={fill(CARB_COPY.fiber_with, { g: fmt1(fiberG) })!} /></p> : null}
          <p className="t-caption c-t2"><Rich text={carbWhy()} /></p>
        </div>
      </div>
      {calcCarb != null ? <CarbCalc carbG={calcCarb} fiberG={fiberPer100 == null ? null : calcFiber} netG={m.carbG} unit="g" /> : null}
      {v.note ? <p className={`t-caption ${styles.caveat}`}><Icon name="info" size={16} /><Rich text={v.note} /></p> : null}
      {m.loud.map((c) => (
        <p key={c} className={`t-caption ${styles.caveat}`}>
          <Icon name="info" size={16} />
          <Rich text={c} />
        </p>
      ))}
      <More>
        <p className="t-caption c-t2"><Rich text={sameAmountText()} /></p>
        <p className="t-caption c-t2"><Rich text={CARB_COPY.definition} /></p>
        <p className="t-caption c-t2"><Rich text={CARB_COPY.why_not_gi} /></p>
        {m.carbPct != null || (m.sugarsG != null && m.sugarsG > 0) ? (
          <p className="t-caption c-t2">
            <Rich text={[
              m.carbPct != null ? fill(CARB_COPY.daily_carb, { pct: Math.round(m.carbPct) }) : '',
              m.sugarsG != null && m.sugarsG > 0 ? fill(CARB_COPY.daily_sugar, { pct: Math.round((m.sugarsG / dvSugarG()) * 100) }) : '',
            ].filter(Boolean).join('\n')} />
          </p>
        ) : null}
        <p className="t-caption c-t2"><Rich text={carbWhyMore()} /></p>
        {m.budget ? (
          <p className="t-caption c-t2">{[carbBandText(m.budget).guest, carbBandText(m.budget).limit].join(' ')}</p>
        ) : null}
        {m.quiet.map((c) => (
          <p key={c} className="t-caption c-t3"><Rich text={c} /></p>
        ))}
      </More>
      <Source text={AXIS_SOURCE.glycemic} />
    </>
  );
  return { key: 'glycemic', tile, panel };
}

function NnsCard({ c, tone }: { c: NnsCopy; tone: number | null }) {
  return (
    <ul className={`${styles.concerns} ${styles.concernCards}`}>
      <li className={styles.concern}>
        <Icon name="cup" size={20} className={styles.concernIcon} style={tone ? { color: `var(--band-${tone})` } : undefined} aria-hidden />
        <div className={styles.concernText}>
          <div className={styles.concernTitle}>
            <span className="t-strong">{c.title}</span>
            <span className={`t-micro ${styles.tag}`}>{c.tag}</span>
          </div>
          <span className="t-caption c-t2">{c.why}</span>
          <dl className={styles.facts3}>
            <dt className="t-caption c-t3">참고</dt>
            <dd className="t-body">{c.effect}</dd>
            <dt className="t-caption c-t3">주의 대상</dt>
            <dd className="t-body c-t2">{c.who}</dd>
          </dl>
          <span className="t-caption c-t3">{c.source}</span>
        </div>
      </li>
    </ul>
  );
}

// 세부 구성을 공개하지 않은 복합원료(소스 · 복합조미식품 · 혼합제제 …) — 그 안의 첨가물은 신고 원재료에 없어 셀 수 없다는 것을 말한다.
function undisclosedLine(a: ProductAxes['ingredient']): string {
  const u = a?.ingredients_undisclosed ?? 0;
  const t = a?.ingredients_total ?? 0;
  if (!u || !t) return '';
  return `원재료 ${t}개 중 ${u}개는 세부 구성을 공개하지 않은 복합원료입니다. 그 안의 세부 원료와 첨가물은 신고된 원재료에 적혀 있지 않아 확인할 수 없습니다.`;
}

export function AxisCards({
  axes,
  basisG,
  parts,
  fiberPer100 = null,
  carbPer100 = null,
  flagged = [],
  liquid = false,
  dvBasis = null,
  dvBasisG = null,
  additives = [],
  ingredients = [],
}: {
  axes: ProductAxes;
  basisG: number | null;
  parts?: ScorePart[] | null;
  fiberPer100?: number | null;
  carbPer100?: number | null;
  flagged?: Ingredient[];
  liquid?: boolean;
  dvBasis?: 'serving' | 'total_content' | null;
  dvBasisG?: number | null;
  additives?: string[];        // score_detail.additive_names — 성분 칸이 센 식품첨가물 이름
  ingredients?: Ingredient[];  // 이름마다 「무엇인지」 한 줄을 찾는다
}) {
  const nv = nutritionView(axes.nutrition, parts);
  const iv = ingredientView(axes.ingredient, flagged.map((f) => f.name));
  const gv = glycemicView(axes.glycemic);
  const meter = (v: AxisView) => <Meter band={v.meter} label={plain(v.value)} />;

  // 영양 균형 — 감점 큰 영양소가 있으면 카드로(섭취 시 · 주의 대상), 없으면 보조 줄 그대로
  const hasIntake = !!nv.tone && intakeParts(parts).length > 0;
  // 음료 감미료 감점 — 영양소가 다 0 이어도 「보통」인 제로 음료(2026-11-18 사용자 「펩시 제로 라임 영양 균형이 비어 있다」).
  //   감점 근거 줄에 값이 없어(n_nns · 값 "") 섭취 카드도 보조 줄도 안 나와 패널이 비었다 → 이유 카드 한 장 + 타일 한 줄.
  const nns = parts?.some((x) => x.key === 'n_nns' && x.points > 0) ? nnsCopy() : null;
  const nutrition: AxisTab = {
    key: 'nutrition',
    tile: <Tile v={nv} value={nv.value} bar={meter(nv)} fact={firstLine(nv.note) || nns?.fact || ''} />,
    panel: (
      <>
        {/* 판정 말(「아쉬움」)은 타일과 같아 다시 쓰지 않는다 — 남은 보조 줄만 */}
        {!hasIntake && restLines(nv.note) ? <p className="t-body c-t2"><Rich text={restLines(nv.note)} /></p> : null}
        {hasIntake ? <NutrientConcerns parts={parts} tone={nv.tone} basis={dvBasis} basisG={dvBasisG} unit={liquid ? 'ml' : 'g'} cards /> : null}
        {nns ? <NnsCard c={nns} tone={nv.tone} /> : null}
        <Source text={AXIS_SOURCE.nutrition} />
      </>
    ),
  };

  // 원재료 — 타일은 짧은 말(「주요 주의」), 패널 머리는 전체 라벨(「주요 주의 성분 포함」)
  const ingredient: AxisTab = {
    key: 'ingredient',
    tile: <Tile v={iv} value={iv.tone ? bandWord('ingredient', iv.tone) : iv.value} bar={meter(iv)} fact={firstLine(iv.note)} />,
    panel: (
      <>
        {/* 「섭취 시 영향은 아래에서 설명합니다」 같은 안내 줄은 바로 아래 카드가 대신한다 — 카드가 있으면 머리만 */}
        <PanelHead v={iv} rest={flagged.length ? undefined : restLines(iv.note)} />
        {flagged.length ? <ConcernList items={flagged} cards /> : null}
        {/* 주의 성분이 없을 때도 어떤 첨가물이 잡혔는지 칸으로 보인다(2026-11-18 사용자 「무슨 첨가물인지까지 짚어 줘야」).
            「식품첨가물혼합제제」처럼 신고 원재료에 세부 품목이 없으면 그 칸이 그렇다고 말하고, 세부를 공개하지 않은 복합원료 수를 한 줄로. */}
        {!flagged.length && additives.length ? (
          <GridPeek
            preview={6}
            popTitle="확인된 식품첨가물"
            items={additives.map((n, i) => {
              const ing = ingredients.find((x) => x.name === n);
              const plainText = ing?.plain ? ing.plain.replace(/\*\*/g, '') : '';
              return { key: `${n}-${i}`, title: n, sub: plainText || ing?.tag || '식품첨가물', long: plainText || undefined, icon: 'flask' as const, tone: 'warn' as const };
            })}
          />
        ) : null}
        {undisclosedLine(axes.ingredient) ? <p className="t-caption c-t2">{undisclosedLine(axes.ingredient)}</p> : null}
        <Source text={AXIS_SOURCE.ingredient} />
      </>
    ),
  };

  const tabs = [nutrition, ingredient, glycemicTab(gv, basisG, fiberPer100, liquid, carbPer100, axes.glycemic?.carb_label_g ?? null)];
  const initial = (iv.tone ?? 0) > (nv.tone ?? 0) ? 1 : 0;
  return <AxisTabs tabs={tabs} initial={initial} />;
}

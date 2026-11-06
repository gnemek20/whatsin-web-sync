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
import { CARB_COPY, analogyText } from '@/lib/content/carb';
import { NUTRIENTS_BASIS } from '@/lib/content/nutrients';
import { fill } from '@/lib/content/text';
import styles from './product.module.css';

const ICON = { nutrition: 'apple', glycemic: 'bowl', ingredient: 'flask' } as const;

// 판정 근거 — 세 축을 카드 셋이 아니라 **한 판의 세 줄**로(2026-11-03 사용자 「미니멀 · 높이가 달라도 이상하지 않게 · 글은 매우 짧게」).
// 줄마다 왼쪽 = 축 이름 · 판정 · 칸 막대, 오른쪽 = 사실 두세 줄. 긴 설명(개인차 · 혈당지수 대신 양인 이유)만 「자세히」 안 · 출처는 늘 연하게.
// 높이가 다른 카드 셋을 나란히 세우면 짧은 카드에 빈 면이 생겼다 — 위아래로 쌓으면 높이 차이가 보이지 않는다.
function Label({ v }: { v: AxisView }) {
  return (
    <div className={styles.evLabel}>
      <span
        className={styles.axisIcon}
        style={v.tone ? { color: `var(--band-${v.tone})`, background: `color-mix(in srgb, var(--band-${v.tone}) 14%, transparent)` } : undefined}
      >
        <Icon name={ICON[v.key]} size={20} />
      </span>
      <div className={styles.evLabelText}>
        <span className="t-micro c-t3">{v.name}</span>
        <span
          className={`t-headline ${styles.evValue}`}
          style={v.tone ? { color: `var(--band-${v.tone}-t)` } : { color: v.muted ? 'var(--t2)' : undefined }}
        >
          <Rich text={v.value} />
        </span>
      </div>
    </div>
  );
}

function More({ children }: { children: React.ReactNode }) {
  return (
    <details className={styles.why}>
      <summary className="t-caption c-t3">자세히</summary>
      <div className={styles.whyBody}>{children}</div>
    </details>
  );
}

// 기준 출처 한 줄 — 「자세히」에 넣지 않고 늘 연하게(2026-11-05 사용자 「짧은 출처는 상시 연하게 · 긴 것만 자세히」).
function Source({ text }: { text: string }) {
  return <p className={`t-caption ${styles.source}`}><Rich text={text} /></p>;
}

// 줄을 누르면 그 아래로 자세한 내용(영양 균형 — 감점 큰 영양소의 섭취 시 · 주의 대상, 성분 — 주의 성분 목록)이 펼쳐진다
// (2026-11-06 사용자 「판정 근거의 세 축을 탭하면 아코디언으로」 · 앱 AxisPanel 의 줄과 같다). 칸 3·4 는 펼친 채로 연다.
function BandCard({ v, panel, more, open }: { v: AxisView; panel?: React.ReactNode; more?: string; open?: boolean }) {
  const body = (
    <>
      <div className={styles.evLeft}>
        <Label v={v} />
        <Meter band={v.meter} label={plain(v.value)} />
      </div>
      <div className={styles.evRight}>
        {v.note ? <p className="t-body c-t2"><Rich text={v.note} /></p> : null}
        <Source text={AXIS_SOURCE[v.key]} />
        {panel ? (
          <span className={`t-caption ${styles.foldHint}`}>
            {more}
            <Icon name="next" size={16} className={styles.foldChevron} />
          </span>
        ) : null}
      </div>
    </>
  );
  if (!panel) return <article className={styles.ev}>{body}</article>;
  return (
    <details className={styles.fold} open={open}>
      <summary className={`${styles.ev} ${styles.foldSum}`}>{body}</summary>
      <div className={styles.foldBody}>{panel}</div>
    </details>
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

// 당질 — 큰 글씨는 원물 비유(「사과 1개만큼」 · lib/axes carbAnalogy), 아래는 「밥 한 끼의 N%」(제품끼리 같은 잣대) ·
// 구성(당류 비중 · 식이섬유). 판정색 없음. 혈당지수(GI)를 내지 않는 이유는 접힌 설명 안에(앱과 같다).
function GlycemicCard({ v, basisG, fiberPer100, liquid }: { v: GlycemicView; basisG: number | null; fiberPer100: number | null; liquid: boolean }) {
  const m = v.amount;
  const share = m && m.sugarsG != null && m.carbG > 0 ? Math.min(1, m.sugarsG / m.carbG) : null;
  const an = m ? carbAnalogy(m.carbG, m.sugarsG) : null;
  const fiberG = fiberPer100 != null && fiberPer100 > 0 && basisG ? Math.round(fiberPer100 * basisG) / 100 : null;
  const n = m ? Math.min(MAX_BOWLS, Math.max(1, Math.ceil(m.carbBowls - 1e-9))) : 0;
  const extra = m ? Math.ceil(m.carbBowls) - MAX_BOWLS : 0;
  // 「1회분(30g)」 · 「한 포장(500mL)」 — 머리말은 nutrients.json basis
  const basisHead = m ? `${m.wholePack ? NUTRIENTS_BASIS.total_content : NUTRIENTS_BASIS.serving}${basisG ? `(${Math.round(basisG)}${liquid ? 'mL' : 'g'})` : ''}` : '';
  return (
    <article className={styles.ev}>
      <div className={styles.evLeft}>
        <Label v={an ? { ...v, value: analogyText(an) } : v} />
        {m ? (
          <div className={styles.bowls} aria-label={fill(CARB_COPY.meal_pct, { pct: an?.mealPct ?? 0 }) ?? undefined}>
            {Array.from({ length: n }, (_, i) => (
              <RiceBowl key={i} fill={Math.max(0, Math.min(1, m.carbBowls - i))} />
            ))}
            {extra > 0 ? <span className="t-caption c-t2">+{extra}</span> : null}
          </div>
        ) : null}
      </div>
      <div className={styles.evRight}>
        {m ? (
          <>
            <p className="t-body c-t2">
              <Rich text={`${fill(CARB_COPY.basis_line, { basis: basisHead })} **${fmt1(m.carbG)}g**`} />
            </p>
            {v.note ? <p className={`t-caption ${styles.caveat}`}><Icon name="info" size={16} /><Rich text={v.note} /></p> : null}
            {an && an.food !== 'rice' ? (
              <p className="t-caption c-t2"><Rich text={boldPct(fill(CARB_COPY.meal_pct, { pct: an.mealPct })!)} /></p>
            ) : null}
            {an?.sugarLed ? (
              <p className="t-caption c-t2"><Rich text={liquid ? `${CARB_COPY.sugar_led}\n${liquidSugarNote()}` : CARB_COPY.sugar_led} /></p>
            ) : null}
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
            {fiberG != null ? <p className="t-caption c-t2"><Rich text={fill(CARB_COPY.fiber_with, { g: fmt1(fiberG) })!} /></p> : null}
            <p className="t-caption c-t2"><Rich text={carbWhy()} /></p>
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
              {m.quiet.map((c) => (
                <p key={c} className="t-caption c-t3"><Rich text={c} /></p>
              ))}
            </More>
            <Source text={AXIS_SOURCE.glycemic} />
          </>
        ) : (
          <>
            {v.note ? <p className="t-body c-t2"><Rich text={v.note} /></p> : null}
            <Source text={AXIS_SOURCE.glycemic} />
          </>
        )}
      </div>
    </article>
  );
}

export function AxisCards({
  axes,
  basisG,
  parts,
  fiberPer100 = null,
  flagged = [],
  liquid = false,
  dvBasis = null,
  dvBasisG = null,
}: {
  axes: ProductAxes;
  basisG: number | null;
  parts?: ScorePart[] | null;
  fiberPer100?: number | null;
  flagged?: Ingredient[];
  liquid?: boolean;
  dvBasis?: 'serving' | 'total_content' | null;
  dvBasisG?: number | null;
}) {
  const nv = nutritionView(axes.nutrition, parts);
  const iv = ingredientView(axes.ingredient, flagged.map((f) => f.name));
  return (
    <div className={`card ${styles.evidence}`}>
      <BandCard
        v={nv}
        more="섭취 시 영향"
        open={(nv.tone ?? 0) >= 3}
        panel={nv.tone && intakeParts(parts).length ? <NutrientConcerns parts={parts} tone={nv.tone} basis={dvBasis} basisG={dvBasisG} unit={liquid ? 'ml' : 'g'} /> : undefined}
      />
      <BandCard v={iv} more="주의 성분 설명" open={(iv.tone ?? 0) >= 3} panel={flagged.length ? <ConcernList items={flagged} /> : undefined} />
      <GlycemicCard v={glycemicView(axes.glycemic)} basisG={basisG} fiberPer100={fiberPer100} liquid={liquid} />
    </div>
  );
}

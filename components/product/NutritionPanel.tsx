'use client';
// 영양성분 + 섭취량 슬라이더. 처음엔 서버가 보낸 값(basis_label 기준)을 그대로 보이고,
// 사용자가 양을 바꾸면 per100 으로 다시 계산한다(서버 정수를 basis_g 로 나누지 않는다 — 반올림이 비율을 깬다).
// 밥 공기는 carb 가 아니라 available_carb 로만 — 당알코올·섬유를 뺀 값은 서버만 낼 수 있다.
import { useState } from 'react';
import { Icon } from '../Icon';
import { bowlsCarbLabel } from '@/lib/content/carb';
import { splitCaveats } from '@/lib/content/caveats';
import { NUTRIENTS } from '@/lib/content/nutrients';
import { fill } from '@/lib/content/text';
import type { DailyValue, Nutrition } from '@/lib/types';
import styles from './product.module.css';
import { RichLite as Rich } from '@/components/RichLite';

// TODO(data): move to packages/data/nutrition/nutrients.json basis — 사용자가 고른 양의 표시 기준.
const LIVE_BASIS = '{amount}{unit} 기준';

type Row = { key: string; label: string; unit: string; dp: number; server: number; per?: number | null };

export function NutritionPanel({
  nutrition,
  dailyValue,
  axisBowls,
  axisSugars,
  axisCarb,
}: {
  nutrition: Nutrition;
  dailyValue?: DailyValue | null;
  axisBowls: number | null;
  axisSugars?: number | null; // 축의 1회분 당류 — 「절반 이상이 당류」를 가르는 데(비유는 밥 공기만 · 2026-11-14)
  axisCarb?: number | null;   // 축의 1회분 당질 g — 공기 수 반올림을 거치지 않게
}) {
  const per100 = nutrition.per100 ?? null;
  const unit = per100?.unit === 'ml' ? 'mL' : 'g';
  const baseG = nutrition.basis_g && nutrition.basis_g > 0 ? nutrition.basis_g : 100;
  const min = Math.min(5, baseG);
  const max = Math.max(300, Math.ceil((baseG * 1.5) / 50) * 50);
  const step = max > 500 ? 10 : 5;
  const [x, setX] = useState<number>(Math.round(baseG));
  const [touched, setTouched] = useState(false);
  const live = touched && per100 != null;

  const rows: Row[] = [
    { key: 'kcal', label: NUTRIENTS.energy.label, unit: NUTRIENTS.energy.unit, dp: 0, server: nutrition.kcal, per: per100?.kcal },
    { key: 'carb', label: NUTRIENTS.carbohydrate.label, unit: NUTRIENTS.carbohydrate.unit, dp: 1, server: nutrition.carb, per: per100?.carb },
    { key: 'sugar', label: NUTRIENTS.sugars.label, unit: NUTRIENTS.sugars.unit, dp: 1, server: nutrition.sugar, per: per100?.sugar },
    { key: 'protein', label: NUTRIENTS.protein.label, unit: NUTRIENTS.protein.unit, dp: 1, server: nutrition.protein, per: per100?.protein },
    { key: 'fat', label: NUTRIENTS.fat.label, unit: NUTRIENTS.fat.unit, dp: 1, server: nutrition.fat, per: per100?.fat },
  ];
  const at = (v: number | null | undefined, dp: number) => {
    if (v == null) return '–';
    const n = (v * x) / 100;
    const f = 10 ** dp;
    return String(Math.round(n * f) / f);
  };

  const avail = per100?.available_carb;
  const liveBowls = live && avail != null && avail > 0 ? (avail * x) / 100 / per100!.rice_bowl_carb_g : null;
  const bowls = live ? liveBowls : axisBowls;
  // 2026-11-13 레이아웃 고정 — 한계 줄은 슬라이더를 움직이기 전에도 같은 자리에 둔다(움직이는 순간 줄이 생겨 아래가 밀렸다).
  // 「한 포장 기준」 줄(diluted_total_content)만 사용자가 양을 고르면 참이 아니게 된다 — 줄은 남기고 보이지 않게만 한다.
  const all = splitCaveats(per100?.caveats, false);
  const userSet = new Set([...splitCaveats(per100?.caveats, true).loud, ...splitCaveats(per100?.caveats, true).quiet]);
  const { loud, quiet } = all;
  const basis = live ? fill(LIVE_BASIS, { amount: x, unit })! : nutrition.basis_label ?? '';

  return (
    <section className={`card ${styles.block}`} aria-labelledby="nutri-h">
      <div className={styles.blockHead}>
        <h2 id="nutri-h" className="t-headline">영양성분</h2>
        <span className="t-caption c-t2">{basis}</span>
      </div>

      <dl className={styles.nutri}>
        {rows.map((r) => (
          <div key={r.key} className={styles.nutriCell}>
            <dt className="t-caption c-t2">{r.label}</dt>
            <dd>
              <span className={`t-title ${styles.num}`}>{live ? at(r.per, r.dp) : r.server}</span>
              <span className="t-caption c-t3"> {r.unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      {bowls != null ? (
        <p className={`t-body ${styles.bowlLine}`}>
          <Icon name="bowl" size={20} />
          {live
            ? bowlsCarbLabel(bowls, per100?.sugar != null ? (per100.sugar * x) / 100 : null, avail != null ? (avail * x) / 100 : null)
            : bowlsCarbLabel(bowls, axisSugars ?? null, axisCarb ?? null)}
        </p>
      ) : null}
      {loud.map((c) => (
        <p key={c} className={`t-caption ${styles.caveat}`} style={live && !userSet.has(c) ? { visibility: 'hidden' } : undefined}>
          <Icon name="info" size={16} />
          <Rich text={c} />
        </p>
      ))}
      {quiet.map((c) => (
        <p key={c} className="t-caption c-t3" style={live && !userSet.has(c) ? { visibility: 'hidden' } : undefined}><Rich text={c} /></p>
      ))}

      {per100 ? (
        <div className={styles.slider}>
          <div className={styles.sliderHead}>
            <label htmlFor="serving" className="t-strong">
              섭취량 변경
            </label>
            <span className={`t-strong ${styles.num}`}>
              {x}
              {unit}
            </span>
          </div>
          <input
            id="serving"
            type="range"
            min={min}
            max={max}
            step={step}
            value={x}
            onChange={(e) => {
              setX(Number(e.target.value));
              setTouched(true);
            }}
            className={styles.range2}
            style={{ ['--p' as string]: `${((x - min) / (max - min)) * 100}%` }}
          />
          <div className={`t-micro c-t3 ${styles.rangeScale}`}>
            <span>
              {min}
              {unit}
            </span>
            {/* 자리는 늘 두고 보일 때만 보인다(나타나며 줄 높이가 바뀌지 않게) */}
            <button
              type="button"
              className={styles.reset}
              style={touched ? undefined : { visibility: 'hidden' }}
              tabIndex={touched ? 0 : -1}
              aria-hidden={touched ? undefined : true}
              onClick={() => {
                setX(Math.round(baseG));
                setTouched(false);
              }}
            >
              원래대로
            </button>
            <span>
              {max}
              {unit}
            </span>
          </div>
        </div>
      ) : null}

      {/* 1일 기준치 막대는 「1회분 기준」 문장이라 양을 바꿔도 참이다 — 늘 둔다(사라지면 아래가 올라붙었다) */}
      {dailyValue && dailyValue.items.length > 0 ? (
        <ul className={styles.dv} style={live ? { opacity: 0.55 } : undefined}>
          {dailyValue.items.map((it) => (
            <li key={it.nutrient} className={styles.dvRow}>
              <span className={styles.dvBar} aria-hidden="true">
                <span style={{ width: `${Math.min(100, it.pct)}%` }} />
              </span>
              <span className="t-body"><Rich text={it.sentence} /></span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

// 제품 → 내 기준으로 본 사실(2026-11-13 웹 개편). 서버 · 브라우저 둘 다 쓴다(순수 함수).
//
// 맨 위 세 질문(docs/pmf-research/README.md §1): ① 들었나 ② 얼마나 ③ 나한테 많은가.
//   ① avoidCheck — 서버가 붙인 avoided_keys 로만 판단한다(웹이 이름 매칭을 다시 만들지 않는다).
//      「없음」은 확인한 원재료 안에서만 말한다 — 미확인 원재료가 있으면 그 수를 같이 말한다(「없다」를 단정하지 않는다).
//   ② amount — 라벨 숫자. 1회분은 서버 nutrition.basis(daily_value 와 같은 기준)를 따르고, 없으면 100 g(mL)당.
//   ③ 기준은 아직 정하지 않았다(사용자 2026-11-13 「기준점은 차차」). 지금은 공표된 1일 기준치 대비 %만 사실로 붙인다 —
//      「많다 · 적다」 판정은 만들지 않는다.
import type { Ingredient, ProductDetail } from './types';
import { NUTRIENTS, avoidKeys, type AvoidItem, type NutrientKey } from './lens';
import { splitCaveats } from './content/caveats';

export type Mode = 'serving' | 'per100';

export type Basis = {
  kind: 'serving' | 'total_content' | 'per100';
  g: number | null; // 1회분(또는 포장 전체) g · mL
  unit: 'g' | 'ml';
  label: string; // 「1회분 30g」 · 「포장 전체 200mL」 · 「100g당」
};

const unitText = (u: 'g' | 'ml') => (u === 'ml' ? 'mL' : 'g');

export function basisOf(p: ProductDetail): Basis {
  const n = p.nutrition;
  const unit = n.per100?.unit ?? 'g';
  const g = n.basis_g ?? null;
  if ((n.basis === 'serving' || n.basis === 'total_content') && g) {
    return { kind: n.basis, g, unit, label: `${n.basis === 'serving' ? '1회분' : '포장 전체'} ${fmtNum(g)}${unitText(unit)}` };
  }
  return { kind: 'per100', g: null, unit, label: `100${unitText(unit)}당` };
}

export const per100Label = (b: Basis) => `100${unitText(b.unit)}당`;

export type Amount = {
  key: NutrientKey;
  label: string;
  unit: string;
  value: number | null; // 고른 기준(1회분 또는 100당)의 값 · 모르면 null
  text: string; // 「12g」 · 「표시 없음」
  numText: string; // 「12」(단위 없이) · 값이 없으면 ''
  per100: number | null;
  per100Text: string;
  dailyPct: number | null; // 공표 1일 기준치 대비(고른 기준) · 기준치가 없는 영양소는 null
  missing: string | null; // 값이 없을 때 이유
};

export function fmtNum(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString('ko-KR');
  if (n >= 10) return String(Math.round(n));
  return String(Math.round(n * 10) / 10);
}

/** 100 g(mL)당 값 — 라벨에서 정규화한 값. 나트륨은 1일 기준치 % 에서 되돌린다(API 의 per100 에 나트륨 칸이 없다). */
function per100Of(p: ProductDetail, key: NutrientKey): number | null {
  const x = p.nutrition.per100;
  switch (key) {
    case 'kcal': return x?.kcal ?? null;
    case 'carb': return x?.carb ?? null;
    case 'sugar': return x?.sugar ?? null;
    case 'protein': return x?.protein ?? null;
    case 'fat': return x?.fat ?? null;
    case 'fiber': return x?.fiber ?? null;
    case 'carb_net': return x?.available_carb ?? null;
    case 'sodium': {
      const dv = p.daily_value;
      const it = dv?.items.find((i) => i.nutrient === 'sodium');
      if (!dv || !it || !dv.basis_g) return null;
      return ((it.pct / 100) * 2000 * 100) / dv.basis_g;
    }
    case 'polyol': {
      const a = p.axes?.glycemic;
      const g = p.nutrition.basis_g;
      if (!a || a.polyol_g == null || !g) return null;
      return (a.polyol_g * 100) / g;
    }
  }
}

/** 이 제품에 당알코올(감미료 중 당알코올 태그) 원재료가 있는가 — 함량을 몰라도 「들어 있음」은 말할 수 있다. */
export const polyolIngredients = (p: ProductDetail) => p.ingredients.filter((i) => i.concern_tags?.includes('sugar_alcohol'));

export function amountOf(p: ProductDetail, key: NutrientKey, mode: Mode): Amount {
  const meta = NUTRIENTS[key];
  const b = basisOf(p);
  const v100 = per100Of(p, key);
  const useServing = mode === 'serving' && b.kind !== 'per100' && b.g;
  const value = v100 == null ? null : useServing ? (v100 * (b.g as number)) / 100 : v100;
  let missing: string | null = null;
  if (value == null) {
    if (key === 'fiber') missing = '표시 없음';
    else if (key === 'polyol') missing = polyolIngredients(p).length ? '들어 있음, 함량 미표시' : '목록에 없음';
    else if (key === 'sodium') missing = '자료 없음';
    else missing = '자료 없음';
  }
  const daily = meta.daily;
  return {
    key,
    label: meta.label,
    unit: meta.unit,
    value,
    text: value == null ? (missing as string) : `${fmtNum(value)}${meta.unit}`,
    numText: value == null ? '' : fmtNum(value),
    per100: v100,
    per100Text: v100 == null ? '' : `${fmtNum(v100)}${meta.unit}`,
    dailyPct: value != null && daily ? (value / daily) * 100 : null,
    missing,
  };
}

// ── ① 들었나 ───────────────────────────────────────────────────────────

export type AvoidResult = {
  item: AvoidItem;
  hits: { ing: Ingredient; pos: number }[]; // pos = 원재료 순서(1부터)
};

export type AvoidCheck = {
  results: AvoidResult[];
  total: number; // 원재료 수
  unknown: number; // 세부를 확인하지 못한 원재료(미매칭 · 이름만으로 내용을 모르는 것)
  noIngredients: boolean;
};

const isUnknown = (i: Ingredient) => i.verdict === 'unknown' || i.kind === 'unmatched' || i.kind === 'placeholder';

export function avoidCheck(p: ProductDetail, avoid: AvoidItem[]): AvoidCheck {
  const ings = p.ingredients ?? [];
  const results = avoid.map((item) => {
    const keys = avoidKeys(item);
    return {
      item,
      hits: ings
        .map((ing, idx) => ({ ing, pos: idx + 1 }))
        .filter(({ ing }) => (ing.avoided_keys ?? []).some((k) => keys.includes(k)) || keys.includes(ing.key)),
    };
  });
  return { results, total: ings.length, unknown: ings.filter(isUnknown).length, noIngredients: ings.length === 0 };
}

export const hitNames = (c: AvoidCheck) => c.results.filter((r) => r.hits.length).map((r) => r.item.l);

// ── 함께 살펴볼 것 ───────────────────────────────────────────────────────
// 사실만 적는다 — 성분이 들어 있다 · 표시와 계산이 이렇다. 문턱(「많다」)을 새로 만들지 않는다.

export type Consider = { id: string; title: string; body: string; tone: 'hit' | 'plain'; href?: string };

export function considerations(p: ProductDetail, focus: NutrientKey[], check: AvoidCheck): Consider[] {
  const out: Consider[] = [];
  const covered = new Set(check.results.flatMap((r) => r.hits.map((h) => h.ing.key)));

  // 주의 성분(서버 판정 risk · caution) 중 내 피할 성분에 이미 걸린 것은 빼고
  for (const f of p.flagged ?? []) {
    if (covered.has(f.key)) continue;
    out.push({ id: `flag-${f.key}`, title: f.name, body: f.plain || '주의해서 볼 성분입니다.', tone: 'plain', href: `/i/${encodeURIComponent(f.key)}` });
  }

  // 감미료 — 「제로」에서 사람들이 가장 많이 묻는 것(pmf-research §2-2)
  const sweet = p.ingredients.filter((i) => (i.tag === '감미료' || i.function_classes?.includes('감미료')) && !covered.has(i.key));
  if (sweet.length) {
    const polyol = sweet.filter((i) => i.concern_tags?.includes('sugar_alcohol'));
    out.push({
      id: 'sweeteners',
      title: `감미료 ${sweet.length}종`,
      body:
        sweet.map((i) => i.name).join(', ') +
        (polyol.length ? `\n당알코올(${polyol.map((i) => i.name).join(', ')})은 당류 표시에 들어가지 않습니다.` : ''),
      tone: 'plain',
    });
  }

  // 당류 0 인데 당질이 있는 제품 — 「당류 0g인데 왜?」(pmf-research §1-2 가장 강한 불만)
  const b = basisOf(p);
  const sugar = amountOf(p, 'sugar', 'serving').value;
  const net = amountOf(p, 'carb_net', 'serving').value;
  if (sugar != null && net != null && sugar < 0.5 && net >= 5) {
    out.push({
      id: 'zero-sugar-carb',
      title: '당류는 0g, 당질은 있습니다',
      body: `${b.kind === 'per100' ? b.label : b.label + ' 기준'} 당류는 ${fmtNum(sugar)}g이지만 당질은 ${fmtNum(net)}g입니다. 당류에는 전분, 당알코올이 들어가지 않습니다.`,
      tone: 'plain',
    });
  }

  // 식이섬유를 표시하지 않으면 당질 = 탄수화물(실제보다 많거나 같다)
  if (focus.includes('carb_net') && p.nutrition.per100 && p.nutrition.per100.fiber == null) {
    out.push({ id: 'fiber-missing', title: '식이섬유 표시 없음', body: '식이섬유를 표시하지 않아 당질을 탄수화물과 같은 값으로 셉니다. 실제 당질은 이보다 적을 수 있습니다.', tone: 'plain' });
  }

  // 당질 축의 한계(서버 caveat 코드 → web/data 문장)
  const gly = p.axes?.glycemic;
  if (gly) {
    const { loud } = splitCaveats(gly.caveats, false, ['fiber_missing']);
    loud.forEach((t, i) => out.push({ id: `cv-${i}`, title: '계산할 때 알아 둘 점', body: t, tone: 'plain' }));
  }

  // 자료 의심(나트륨 0 인데 소금이 있다 등) — 영양 균형 축 note
  const nut = p.axes?.nutrition;
  if (nut && (nut.caveats ?? []).length && nut.note) {
    out.push({ id: 'data-doubt', title: '영양 자료 확인 필요', body: nut.note, tone: 'plain' });
  }

  if (p.processed_meat) {
    out.push({ id: 'meat', title: p.processed_meat.label, body: p.processed_meat.summary, tone: 'plain' });
  }
  return out;
}

/** 내 기준에 없는 나머지 영양소(목록 순서) — 「그 밖의 영양」 한 줄. */
export function otherNutrients(focus: NutrientKey[]): NutrientKey[] {
  const order: NutrientKey[] = ['kcal', 'carb', 'carb_net', 'sugar', 'protein', 'fat', 'sodium', 'fiber'];
  return order.filter((k) => !focus.includes(k));
}

/** 정렬 방향 — 단백질 · 식이섬유는 많은 순, 나머지는 적은 순(판정이 아니라 줄 세우는 방향일 뿐). */
export const sortDesc = (k: NutrientKey) => k === 'protein' || k === 'fiber';

// ── 목록 한 줄(검색 결과 · 둘러보기 · 다른 선택) ─────────────────────────────

export type LensRow = { nums: { key: NutrientKey; label: string; text: string; has: boolean }[]; hits: string[] };

/** 목록 줄에 붙일 내 기준 숫자(100g(mL)당 — 제품마다 1회분이 달라 같은 양으로 맞춘다)와 「들어 있음」. */
export function lensRow(p: ProductDetail, focus: NutrientKey[], avoid: AvoidItem[]): LensRow {
  return {
    nums: focus.map((k) => {
      const a = amountOf(p, k, 'per100');
      return { key: k, label: a.label, text: a.value == null ? (k === 'polyol' && a.missing?.startsWith('들어') ? '들어 있음' : '-') : a.text, has: a.value != null };
    }),
    hits: hitNames(avoidCheck(p, avoid)),
  };
}

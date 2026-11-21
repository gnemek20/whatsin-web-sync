// 영양소 이름 · 단위 · 1일 기준치 · 표시 기준 문구 · 하루 기준치 문장 · 검색 정렬 문구.
// 정본 web/data/nutrition/nutrients.json([별표 5] 1일 영양성분 기준치). 작은 JSON이라 클라이언트에서도 읽는다.
import nutrients from '@/data/nutrition/nutrients.json';
import axes from '@/data/axes/axes.json';
import { amount, fill } from './text';

export type Intake = { tag: string; effect: string; who: string; source: string };
type Item = { label: string; unit: string; daily?: number; why?: string; api: string; intake?: Intake };
export const NUTRIENTS = nutrients.items as Record<string, Item>;
export const NUTRIENTS_BASIS = nutrients.basis;

/** 표시 단위 — 서버는 'ml' 로 보낸다. 화면은 「mL」. */
export const unitText = (u?: string | null) => ((u ?? '').toLowerCase() === 'ml' ? 'mL' : 'g');

/** 「1회분 30g 기준」 · 「한 포장 500mL 기준」 · 「100g당」. 양이 없으면 null(부르는 쪽이 서버 문구로). */
export function basisLabel(basis: string | null | undefined, g: number | null | undefined, unit?: string | null): string | null {
  const u = unitText(unit);
  if (basis === 'per100') return fill(nutrients.basis.per100, { unit: u });
  if (basis !== 'serving' && basis !== 'total_content') return null;
  if (g == null || !(g > 0)) return null;
  return fill(nutrients.basis.basis_label, { head: nutrients.basis[basis], amount: amount(g), unit: u });
}

/** 「1회분 기준 하루 나트륨의 90%」 · 넘으면 「… 기준치 초과(**120%**)」. */
export function dailySentence(basis: string | null | undefined, nutrient: string, pct: number, over: boolean): string | null {
  const head = basis === 'serving' || basis === 'total_content' ? nutrients.basis[basis] : null;
  const name = NUTRIENTS[nutrient]?.label;
  return fill(over ? nutrients.daily_sentence.over : nutrients.daily_sentence.normal, { head, name, pct: Math.round(pct) });
}

export const dvSugarG = () => NUTRIENTS.sugars.daily ?? 100;

// Nutri-Score 감점 키 → 영양소 키(「왜 문제인지」 한 줄을 찾는다).
const PART_NUTRIENT: Record<string, string> = { n_energy: 'energy', n_sugar: 'sugars', n_satfat: 'saturated_fat', n_sodium: 'sodium' };
/** 걸린 영양소가 「왜 문제인지」 한 줄 — 일반적인 영향이고 개인 예측이 아니다(출처는 packages/data $comment). */
/** 감점 키 → 영양소 키(n_sodium → sodium). 영양 칸 펼침이 섭취 시 문구를 찾는다.
 *  key 가 없는 옛 응답(웹은 제품 응답을 1시간 캐시한다)은 이름으로 찾는다 — 키로만 찾으면 위 요약은 「당류, 포화지방」을 말하는데
 *  펼친 칸은 걸린 것이 없다고 해서 앞뒤가 안 맞았다(2026-11-06 사용자). */
export const partNutrient = (partKey?: string | null, label?: string | null) =>
  (partKey ? PART_NUTRIENT[partKey] : undefined) ?? (label ? Object.keys(NUTRIENTS).find((x) => NUTRIENTS[x].label === label) : undefined) ?? null;
export const INTAKE_COPY = nutrients.intake_copy;

export function nutrientWhy(partKey?: string | null, label?: string | null): string {
  const k = partNutrient(partKey, label);
  return (k && NUTRIENTS[k]?.why) || '';
}

// ── 검색 정렬(GET /products/search/v2 · sort {key, dir}) ───────────────────────────────
// TODO(data): move to packages/data/nutrition/nutrients.json — 정렬 기준 문구 · 방향 말 · 정렬 값 표기.
const SORT_COPY = {
  label: '{name} {word} 순, 100g(mL)당',
  asc: '낮은',
  desc: '높은',
  metric: '{name} {num}{unit}/{per}',
  per_g: '100g',
  per_ml: '100mL',
};
// 서버 정렬 키 → 영양소. c100 은 100 g 당 가용탄수(탄수화물 − 식이섬유) = 당질.
const SORT_KEY: Record<string, string> = { energy: 'energy', sugars: 'sugars', sodium: 'sodium', protein: 'protein', fat: 'fat', c100: 'carbohydrate' };
const sortName = (key: string) => (key === 'c100' ? axes.name.glycemic : NUTRIENTS[SORT_KEY[key]]?.label);

/** 「당류 낮은 순, 100g(mL)당」. 판단어(judge) · 모르는 키면 null — 서버 sort_label 로. */
export function sortLabel(sort: { key: string; dir?: string } | null | undefined): string | null {
  if (!sort || !SORT_KEY[sort.key] || (sort.dir !== 'asc' && sort.dir !== 'desc')) return null;
  return fill(SORT_COPY.label, { name: sortName(sort.key), word: SORT_COPY[sort.dir] });
}

/** 「당류 2g/100g」 · 「나트륨 1,200mg/100mL」 — g 은 10 미만이면 소수 한 자리(뒤 0 은 뗀다), 그 밖은 정수. */
export function metricText(key: string | null | undefined, value: number | null | undefined, unit: string | null | undefined): string | null {
  if (!key || value == null || !SORT_KEY[key]) return null;
  const u = NUTRIENTS[SORT_KEY[key]].unit;
  const num = u !== 'g' || value >= 10 ? Math.round(value).toLocaleString('en-US') : String(Math.round(value * 10) / 10);
  return fill(SORT_COPY.metric, { name: sortName(key), num, unit: u, per: unitText(unit) === 'mL' ? SORT_COPY.per_ml : SORT_COPY.per_g });
}

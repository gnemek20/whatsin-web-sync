// 칸(band 1~4) 판정 — 문구 없이 숫자만. 목록 줄(AxisStrip)처럼 브라우저에서도 그리는 곳이 문구 사전 전체를 끌고 오지 않게 따로 둔다.
import type { Axis } from './types';

export type AxisKey = 'nutrition' | 'glycemic' | 'ingredient';
export type Band = 1 | 2 | 3 | 4;

export function bandOf(a?: Axis | null): Band | null {
  const b = a?.band;
  return b === 1 || b === 2 || b === 3 || b === 4 ? b : null;
}

/** 칸1 인데 원재료를 한 종도 확인하지 못했으면 「없음」의 근거가 0 — 좋음 색을 쓰지 않는다. */
export function ingredientNoBasis(a: Axis): boolean {
  return bandOf(a) === 1 && (!!a.no_basis || ((a.ingredients_total ?? 0) > 0 && a.ingredients_matched === 0));
}

/** 판정색을 칠해도 되는 칸. 없으면 회색. */
export function toneOf(key: AxisKey, a?: Axis | null): Band | null {
  if (!a || key === 'glycemic') return null;
  if (key === 'ingredient' && ingredientNoBasis(a)) return null;
  return bandOf(a);
}

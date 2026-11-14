// 검색 결과 · 둘러보기 정렬 — 2026-11-14 사용자 「소비자가 실제로 세우는 기준 순으로」(대안 「다른 선택」 탭과 같은 말).
//   검색어와 가까운 순 · 내 기준 · 다이어트할 때 · 혈당 관리할 때 · 첨가물 적게 · 영양 균형 좋은 순
// 세 축을 하나로 합치지 않는다(DECISIONS — 가중치를 우리가 정하지 않는다). 고른 기준 하나로 줄 세우고, 같으면 원래 순서(관련도)를 지킨다.
// 값을 모르는 제품은 늘 맨 뒤. 정렬은 브라우저가 순서만 바꾼다(components/search/SortableResults).
import type { Axis, ProductSummary } from './types';

export type SortId = '' | 'lens' | 'diet' | 'glucose' | 'additive' | 'nutrition';
export type SortOpt = { id: SortId; label: string; sub: string };

/** 정렬 기준 — 「내 기준」은 렌즈가 있을 때만(첫 영양소 이름을 sub 에 넣는다). relLabel: 검색은 「검색어와 가까운 순」, 둘러보기는 「기본 순」. */
export function sortOptions(opts: { relLabel: string; relSub: string; lens?: { first: string; desc: boolean } | null }): SortOpt[] {
  const xs: SortOpt[] = [{ id: '', label: opts.relLabel, sub: opts.relSub }];
  if (opts.lens) xs.push({ id: 'lens', label: '내 기준', sub: `피할 성분이 없는 것부터, ${opts.lens.first} ${opts.lens.desc ? '많은' : '적은'} 것부터(100g(mL)당)` });
  xs.push(
    { id: 'diet', label: '다이어트할 때', sub: '열량이 낮은 것부터(100g(mL)당)' },
    { id: 'glucose', label: '혈당 관리할 때', sub: '1회분 당질이 적은 것부터' },
    { id: 'additive', label: '첨가물 적게', sub: '성분 칸이 좋은 것부터' },
    { id: 'nutrition', label: '영양 균형 좋은 순', sub: '영양 균형 칸이 좋은 것부터' },
  );
  return xs;
}

// 예전 주소(sort=carb · ingredient · by=…)도 받는다 — 공유된 링크가 깨지지 않게
const LEGACY: Record<string, SortId> = { carb: 'glucose', ingredient: 'additive', nutrition: 'nutrition' };
export function parseSort(v?: string | null, by?: string | null): SortId {
  if (by) return 'lens';
  if (v === 'lens' || v === 'diet' || v === 'glucose' || v === 'additive' || v === 'nutrition') return v;
  return (v && LEGACY[v]) || '';
}

const LAST = 1e9;
const bandKey = (a?: Axis | null) => (a && typeof a.band === 'number' ? a.band : LAST);
// 1회분 당질 g — 「해당 없음」(당질 0)이 가장 앞, 양을 모르면 맨 뒤
const carbKey = (a?: Axis | null) => {
  if (!a) return LAST;
  if (a.band === 'n/a') return 0;
  if (a.band === 'amount') return a.carb_g ?? (a.carb_rice_bowls != null ? a.carb_rice_bowls * 69 : LAST);
  return LAST;
};

/** 한 제품의 세 축 정렬 값(작을수록 앞). */
export function axisKey(p: ProductSummary, k: 'nutrition' | 'additive' | 'glucose'): number {
  return k === 'nutrition' ? bandKey(p.axes?.nutrition) : k === 'additive' ? bandKey(p.axes?.ingredient) : carbKey(p.axes?.glycemic);
}

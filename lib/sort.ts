// 검색 결과 · 둘러보기 정렬(2026-11-03 사용자 「탄수화물 적은 순, 영양 좋은 순, 성분 좋은 순처럼 원하는 것 먼저」).
// 세 축을 하나로 합치지 않는다(DECISIONS — 가중치를 우리가 정하지 않는다). 고른 한 축으로 줄 세우고, 같으면 원래 순서(관련도)를 지킨다.
// 판정이 없는 제품(칸 없음 · 모름)은 늘 맨 뒤.
import type { Axis, ProductSummary } from './types';

export type SortId = '' | 'nutrition' | 'ingredient' | 'carb';
export const SORTS: { id: SortId; label: string }[] = [
  { id: '', label: '관련도순' },
  { id: 'nutrition', label: '영양 균형 좋은 순' },
  { id: 'ingredient', label: '성분 좋은 순' },
  { id: 'carb', label: '당질 적은 순' },
];

export function parseSort(v?: string | null): SortId {
  return SORTS.some((s) => s.id === v) ? (v as SortId) : '';
}

const LAST = 1e9;
const bandKey = (a?: Axis | null) => (a && typeof a.band === 'number' ? a.band : LAST);
// 1회분 탄수화물(밥 공기) — 「해당 없음」(탄수화물 0)이 가장 앞, 양을 모르면 맨 뒤
const carbKey = (a?: Axis | null) => {
  if (!a) return LAST;
  if (a.band === 'n/a') return 0;
  if (a.band === 'amount') return a.carb_rice_bowls ?? (a.carb_g != null ? a.carb_g / 69 : LAST);
  return LAST;
};

export function sortItems<T extends ProductSummary>(items: T[], sort: SortId): T[] {
  if (!sort) return items;
  const key = (p: T) =>
    sort === 'nutrition' ? bandKey(p.axes?.nutrition) : sort === 'ingredient' ? bandKey(p.axes?.ingredient) : carbKey(p.axes?.glycemic);
  return items.map((p, i) => ({ p, i, k: key(p) })).sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.p);
}

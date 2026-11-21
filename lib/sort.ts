// 검색 결과 · 둘러보기 정렬 — 2026-11-14 사용자 「소비자가 실제로 세우는 기준 순으로」(대안 「다른 선택」 탭과 같은 말).
//   검색어와 가까운 순 · 내 기준 · 다이어트할 때 · 혈당 관리할 때 · 첨가물 적게 · 영양 균형 좋은 순
// 세 축을 하나로 합치지 않는다(DECISIONS — 가중치를 우리가 정하지 않는다). 고른 기준 하나로 줄 세우고, 같으면 원래 순서(관련도)를 지킨다.
// 값을 모르는 제품은 늘 맨 뒤. 정렬은 브라우저가 순서만 바꾼다(components/search/SortableResults).
import type { Axis, ProductSummary } from './types';
import type { IconName } from '@/components/Icon';

export type SortId = '' | 'lens' | 'diet' | 'glucose' | 'additive' | 'nutrition';
/** label 카드 이름 · desc 카드 아래 한 줄(어떤 순서인지) · icon 카드 그림 · sub 옛 한 줄(둘러보기 등) */
export type SortOpt = { id: SortId; label: string; desc: string; icon: IconName; sub: string };

/** 정렬 기준 — 「내 기준」은 렌즈가 있을 때만(첫 영양소 이름을 desc 에 넣는다). relLabel: 검색은 「검색어와 가까운 순」, 둘러보기는 「기본 순」.
 *  2026-11-17 — 알약 나열 대신 상황 카드(그림 · 이름 · 한 줄)로 보인다(components/search/SortableResults). 검색에서는 뜻 검색일 때만 나온다. */
export function sortOptions(opts: { relLabel: string; relSub: string; relDesc?: string; lens?: { first: string; desc: boolean } | null }): SortOpt[] {
  const xs: SortOpt[] = [{ id: '', label: opts.relLabel, desc: opts.relDesc ?? '찾는 말과 가까운 것부터', icon: 'search', sub: opts.relSub }];
  if (opts.lens) {
    const d = `${opts.lens.first} ${opts.lens.desc ? '많은' : '적은'} 것부터`;
    xs.push({ id: 'lens', label: '내 기준', desc: `피할 성분 없고 ${d}`, icon: 'sliders', sub: `피할 성분이 없는 것부터, ${d}(100g(mL)당)` });
  }
  xs.push(
    { id: 'diet', label: '다이어트할 때', desc: '100g당 열량이 낮은 것부터', icon: 'flame', sub: '열량이 낮은 것부터(100g(mL)당)' },
    { id: 'glucose', label: '혈당 관리할 때', desc: '1회분 순탄수화물이 적은 것부터', icon: 'bowl', sub: '1회분 순탄수화물이 적은 것부터' },
    { id: 'additive', label: '첨가물 적게', desc: '원재료 평가가 좋은 것부터', icon: 'flask', sub: '성분 칸이 좋은 것부터' },
    { id: 'nutrition', label: '영양 균형 좋은 순', desc: '영양 균형이 좋은 것부터', icon: 'apple', sub: '영양 균형 칸이 좋은 것부터' },
  );
  return xs;
}

/** 이름 맞추기 키 — 서버 app/db/search.name_key 와 같다(소문자 · 한글 · 영문 · 숫자만). 「치즈앤(&)초코픽」 → 「치즈앤초코픽」. */
export const nameKey = (s?: string | null) => (s ?? '').toLowerCase().replace(/[^0-9a-z가-힣ㄱ-ㅣ]+/g, '');
/** 찾은 말과 이름이 같은 제품(뒤에 용량 · 숫자만 더 붙은 것 포함) — 어느 정렬에서도 맨 앞에 둔다(2026-11-17 사용자
 *  「어느 정렬이든 항상 가장 일치하는 제품이 먼저」). 0 = 같음 · 1 = 아님.
 *  **분류어 질의는 고정하지 않는다**(2026-11-19 사용자 「다 만들고 바꾸자」) — 부르는 쪽이 서버 `category` 를 보고 q 를 비운다(ResultsView).
 *  「콜라」라는 이름의 제품 하나가 콜라 종류 전체 앞에 서지 않게 · 대명사 · 브랜드 질의 4 묶음에서 1위 · 3위 안이 모두 같거나 나았다(docs/search/EXPERIMENTS pin-rules). */
export function namePin(name: string, q: string): number {
  const k = nameKey(q);
  if (k.length < 2) return 1;
  const n = nameKey(name);
  return n === k || (n.startsWith(k) && /^[0-9a-z]*$/.test(n.slice(k.length))) ? 0 : 1;
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

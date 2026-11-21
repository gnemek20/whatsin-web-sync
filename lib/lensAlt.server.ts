// 「다른 선택」의 내 기준 탭(2026-11-13) — 대안 후보 중 맛이 가장 비슷한 10개의 상세를 받아(avoid= 포함) 내 첫 영양소로 줄 세운다.
// 피할 성분이 든 것은 뒤로 · 값을 모르면 뒤로. 「더 낫다」고 말하지 않고 숫자(100g(mL)당)를 바닥 한 줄에 적는다.
import 'server-only';
import { getProductsFor } from './api';
import type { Alternative } from './types';
import { NUTRIENTS, avoidParam, type Lens, type NutrientKey } from './lens';
import { amountOf, avoidCheck, hitAmount, sortDesc } from './facts';
import type { LensTab } from '@/components/product/AltChooser';

const N = 10;

// 카드 세 칸(2026-11-18 사용자 「대안 카드도 기준 3개 · 3축은 상세 맨 아래에서만」) — 모든 탭 · 비슷한 상품 카드가 내가 고른 영양소(100g(mL)당)를 보인다.
// 내 기준이 없으면 공통 셋(열량 · 당류 · 나트륨 — lens.defaultFocus 의 빈 목표 기본값과 같다). 상세를 받아야 하므로 최대 CELL_MAX 개.
const CARD_DEFAULT: NutrientKey[] = ['kcal', 'sugar', 'sodium'];
const CELL_MAX = 24;
export type CardCell = { label: string; text: string };
export async function altCells(items: { id: string }[], lens: Lens | null): Promise<Record<string, CardCell[]>> {
  const keys = (lens?.focus.length ? lens.focus : CARD_DEFAULT).slice(0, 3);
  const pick = items.slice(0, CELL_MAX);
  const ds = await getProductsFor(pick.map((a) => a.id), avoidParam(lens));
  return Object.fromEntries(
    pick.map((a, i) => {
      const d = ds[i];
      return [a.id, keys.map((k) => {
        const x = d ? amountOf(d, k, 'per100') : null;
        return { label: NUTRIENTS[k].label, text: x?.value != null ? x.text : '—' };
      })];
    }),
  );
}

export async function lensTab(alts: Alternative[], lens: Lens | null): Promise<LensTab | null> {
  if (!lens || !alts.length) return null;
  const pick = [...alts].sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0)).slice(0, N);
  const ds = await getProductsFor(pick.map((a) => a.id), avoidParam(lens));
  const first = lens.focus[0];
  const desc = sortDesc(first);
  const rows = pick.map((a, i) => {
    const d = ds[i];
    const v = d ? amountOf(d, first, 'per100') : null;
    const check = d && lens.avoid.length ? avoidCheck(d, lens.avoid) : null;
    const hitRows = check ? check.results.filter((r) => r.hits.length) : [];
    const hits = hitRows.map((r) => r.item.l);
    // 들어 있으면 「무엇이 · 얼마나」(facts.hitAmount · 100g(mL)당 — 이 탭의 줄 세우기 기준과 같다) — 「당알코올 전체 들어 있음」 대신(2026-11-18 사용자)
    const hitText = d && hitRows.length ? hitRows.map((r) => { const h = hitAmount(d, r.hits, 'per100'); return `${h.names}, ${h.amount}`; }).join(' / ') : '';
    // 카드 세 칸 = 내가 고른 영양소(최대 3) · 100g(mL)당 — 세 축 대신(2026-11-18 사용자 「대안도 내 기준 3개만」)
    const cells = lens.focus.slice(0, 3).map((k) => {
      const x = d ? amountOf(d, k, 'per100') : null;
      return { label: NUTRIENTS[k].label, text: x?.value != null ? x.text : '—' };
    });
    return { a, v: v?.value ?? null, text: v?.value != null ? v.text : null, unit: d?.nutrition.per100?.unit === 'ml' ? '100mL' : '100g', hits, hitText, cells };
  });
  rows.sort((x, y) => {
    if (x.hits.length !== y.hits.length) return x.hits.length - y.hits.length;
    if (x.v == null && y.v == null) return 0;
    if (x.v == null) return 1;
    if (y.v == null) return -1;
    return desc ? y.v - x.v : x.v - y.v;
  });
  const label = NUTRIENTS[first].label;
  return {
    label: '내 기준',
    sub: `${lens.avoid.length ? '피할 성분이 없는 것부터, ' : ''}${label} ${desc ? '많은' : '적은'} 것부터(100g(mL)당)`,
    order: rows.map((r) => r.a.id),
    notes: Object.fromEntries(rows.map((r) => [r.a.id, ''])),
    foot: Object.fromEntries(
      rows.map((r) => [
        r.a.id,
        r.hits.length
          ? { lead: `피할 성분 들어 있음, ${r.unit}당`, text: r.hitText || r.hits.join(', '), tone: 'warn' as const }
          : lens.avoid.length
            ? { lead: '내 기준으로', text: '피할 성분 없음', tone: 'good' as const }
            : null,
      ]),
    ),
    cells: Object.fromEntries(rows.map((r) => [r.a.id, r.cells])),
    warn: rows.filter((r) => r.hits.length).map((r) => r.a.id),
  };
}

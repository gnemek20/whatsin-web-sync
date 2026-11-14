// 「다른 선택」의 내 기준 탭(2026-11-13) — 대안 후보 중 맛이 가장 비슷한 10개의 상세를 받아(avoid= 포함) 내 첫 영양소로 줄 세운다.
// 피할 성분이 든 것은 뒤로 · 값을 모르면 뒤로. 「더 낫다」고 말하지 않고 숫자(100g(mL)당)를 바닥 한 줄에 적는다.
import 'server-only';
import { getProductsFor } from './api';
import type { Alternative } from './types';
import { NUTRIENTS, avoidParam, type Lens } from './lens';
import { amountOf, avoidCheck, hitNames, sortDesc } from './facts';
import type { LensTab } from '@/components/product/AltChooser';

const N = 10;

export async function lensTab(alts: Alternative[], lens: Lens | null): Promise<LensTab | null> {
  if (!lens || !alts.length) return null;
  const pick = [...alts].sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0)).slice(0, N);
  const ds = await getProductsFor(pick.map((a) => a.id), avoidParam(lens));
  const first = lens.focus[0];
  const desc = sortDesc(first);
  const rows = pick.map((a, i) => {
    const d = ds[i];
    const v = d ? amountOf(d, first, 'per100') : null;
    const hits = d && lens.avoid.length ? hitNames(avoidCheck(d, lens.avoid)) : [];
    return { a, v: v?.value ?? null, text: v?.value != null ? v.text : null, unit: d?.nutrition.per100?.unit === 'ml' ? '100mL' : '100g', hits };
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
    notes: Object.fromEntries(
      rows.map((r) => [r.a.id, r.hits.length ? `${r.hits.join(', ')} 들어 있음` : r.text ? `${r.unit}당 ${label} ${r.text}` : `${label} 미확인`]),
    ),
    warn: rows.filter((r) => r.hits.length).map((r) => r.a.id),
  };
}

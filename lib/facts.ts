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
    // 당질 = 탄수 − 표시 섬유(섬유 미표시면 탄수 그대로 · 서버 available_carb 와 같은 규칙). 섬유가 탄수를 넘는 모순 라벨은 값을 내지 않는다.
    case 'glucide': {
      if (x?.carb == null) return null;
      const f = x.fiber ?? 0;
      return f > x.carb ? null : x.carb - f;
    }
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

/**
 * 대체당이 들었나(2026-11-20 · 사용자 「대체당이라 표기하면 모순이 없는지」) — **서버 `sweeteners` 로 정한다**(제품 상세 · 먹은 기록 같은 함수).
 * 대체당 = 당알코올 · 희소당(알룰로스) · 고감미(수크랄로스 · 스테비아 …). 올리고당 · 포도당은 당이라 아니다.
 * 전에는 당알코올 태그로만 정해 「대체당」 줄이 고감미만 든 제품 · 알룰로스 · 원재료 모르는 제품에서 「목록에 없음」이라 했다(docs/product/마이페이지_설계 §4-1).
 *   bulk 당알코올 · 희소당(양은 탄수화물에서 역산 · 모르면 미표시) · intense 고감미만(mg 수준 — 양을 말하지 않는다) · unspecified 그냥 「감미료」
 *   none 목록에 없음 · unknown 원재료 정보 없음. 칸이 없는 옛 응답이면 옛 규칙(당알코올 태그).
 */
export type SweetState = 'bulk' | 'intense' | 'unspecified' | 'none' | 'unknown' | 'nofind';
export function sweetState(p: ProductDetail): SweetState {
  const sw = p.sweeteners;
  // 옛 서버(칸 없음) — 원재료 태그 · 이름으로 최선을 다하고, 못 찾으면 「없음」이라 **단정하지 않는다**(괄호 속 · 제품 이름은 못 본다 · API 를 먼저 배포한다).
  if (sw === undefined) {
    if (!p.ingredients.length) return 'unknown';
    const tags = new Set(p.ingredients.flatMap((i) => i.concern_tags ?? []));
    if (tags.has('sugar_alcohol') || tags.has('rare_sugar') || p.ingredients.some((i) => i.name.includes('알룰로'))) return 'bulk';
    if (tags.has('artificial_sweetener') || tags.has('intense_natural_sweetener')) return 'intense';
    return 'nofind';
  }
  if (sw === null) return 'unknown';
  if (sw.kinds.includes('polyol') || sw.kinds.includes('rare')) return 'bulk';
  if (sw.kinds.includes('intense')) return 'intense';
  return sw.unspecified ? 'unspecified' : 'none';
}
const SWEET_MISSING: Record<SweetState, string> = {
  bulk: '들어 있음, 양 미표시', intense: '고감미 감미료만, 양은 아주 적음', unspecified: '감미료(종류 미표시)', none: '목록에 없음', unknown: '원재료 정보 없음',
  nofind: '목록에서 못 찾음',
};
const SWEET_SHORT: Record<SweetState, string> = { bulk: '들어 있음', intense: '고감미만', unspecified: '종류 미표시', none: '-', unknown: '-', nofind: '-' };

export function amountOf(p: ProductDetail, key: NutrientKey, mode: Mode): Amount {
  const meta = NUTRIENTS[key];
  const b = basisOf(p);
  const v100 = per100Of(p, key);
  const useServing = mode === 'serving' && b.kind !== 'per100' && b.g;
  // 순탄수화물 1회분은 축 값(carb_g) 그대로 — per100 6.15 × 1 을 웹이 반올림하면 6.2, 서버 축은 6.1 이라 한 화면에 두 값이 났다(2026-11-18).
  const gly = p.axes?.glycemic;
  const axisNet = key === 'carb_net' && useServing && gly?.band === 'amount' && gly.carb_g != null && gly.basis === b.kind ? gly.carb_g : null;
  const value = axisNet ?? (v100 == null ? null : useServing ? (v100 * (b.g as number)) / 100 : v100);
  let missing: string | null = null;
  if (value == null) {
    if (key === 'fiber') missing = '표시 없음';
    else if (key === 'polyol') missing = SWEET_MISSING[sweetState(p)];
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
      // 하위 원재료(복합원료 속 · 괄호 속)의 걸림도 센다(2026-11-20 · 서버 `avoided_nested` · pos 0 = 표시 목록 밖).
      // 전에는 최상위만 봐서 「당알코올(감미료)」가 소스 안에 있으면 「감미료 전체, 들어 있지 않습니다」였다.
      hits: [...ings.map((ing, idx) => ({ ing, pos: idx + 1 })), ...(p.avoided_nested ?? []).map((ing) => ({ ing, pos: 0 }))]
        .filter(({ ing }) => (ing.avoided_keys ?? []).some((k) => keys.includes(k)) || keys.includes(ing.key)),
    };
  });
  return { results, total: ings.length, unknown: ings.filter(isUnknown).length, noIngredients: ings.length === 0 };
}

/** 피할 성분이 들어 있을 때 — 「무엇이 · 얼마나」(2026-11-18 사용자 「2번째처럼 모호하게 말고 정확히 무엇이 얼마나」).
 *  양은 있는 근거만 쓴다(지어내지 않는다):
 *   ① 원재료에 함량(%)이 적혀 있으면 그 % — 기준 양이 있으면 g 로도(「20%, 약 2g」)
 *   ② 당알코올이면 영양표의 당알코올 양(라벨 값 · 고른 기준) — 원재료마다가 아니라 합계라 「당알코올 합계」라고 쓴다
 *   ③ 당류 원재료(설탕 · 물엿 …)면 영양표의 당류 양 — 설탕만의 양이 아니라 「당류 합계」
 *   ④ 그 밖에는 「함량 미표시」 */
const SUGARY = /^(설탕|백설탕|흑설탕|갈색설탕|황설탕|당|물엿|과당|액상과당|고과당|포도당|올리고당|맥아당|맥아시럽|조청|꿀|시럽|.*시럽|.*당$)/;
export type HitAmount = { names: string; amount: string; detail: string };
export function hitAmount(p: ProductDetail, hits: { ing: Ingredient; pos: number }[], mode: Mode): HitAmount {
  const b = basisOf(p);
  const names = [...new Set(hits.map((h) => h.ing.name))].join(', ');
  // 순서 번호(「2번째」)는 쓰지 않는다(2026-11-18 사용자) — 복합원료 안에 있을 때만 어디 안인지
  const inside = [...new Set(hits.map((h) => h.ing.found_in).filter(Boolean))].map((f) => `${f} 안`).join(', ');
  const where = inside ? `, ${inside}` : '';
  const useServing = mode === 'serving' && b.kind !== 'per100' && b.g;
  const basisText = useServing ? b.label : per100Label(b);
  const pct = hits.find((h) => h.ing.percent != null)?.ing;
  if (pct && pct.percent != null) {
    const g = useServing ? (pct.percent * (b.g as number)) / 100 : pct.percent;
    const amount = `${fmtNum(pct.percent)}%, ${basisText} 약 ${fmtNum(g)}${unitText(b.unit)}`;
    return { names, amount, detail: `${pct.name} ${amount}${where}` };
  }
  if (hits.some((h) => h.ing.concern_tags?.includes('sugar_alcohol'))) {
    const a = amountOf(p, 'polyol', mode);
    if (a.value != null) {
      // 그 양은 벌크 대체당 역산값(당알코올 + 알룰로스) — 알룰로스가 같이 들었으면 「당알코올」만의 양이 아니다(2026-11-20)
      const amount = `${p.sweeteners?.kinds.includes('rare') ? '대체당 합계' : '당알코올 합계'} ${a.text}`;
      return { names, amount, detail: `${basisText} ${amount}(탄수화물과 열량으로 계산한 추정, 원재료마다 나뉘어 있지 않음)${where}` };
    }
  }
  if (hits.some((h) => SUGARY.test(h.ing.name))) {
    const a = amountOf(p, 'sugar', mode);
    if (a.value != null) {
      const amount = `당류 합계 ${a.text}`;
      return { names, amount, detail: `${basisText} ${amount}(영양표 값, ${names}만의 양은 미표시)${where}` };
    }
  }
  return { names, amount: '함량 미표시', detail: `라벨에 함량이 표시되지 않았습니다${where}` };
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

  // 당류 0 인데 당질이 있는 제품 — 「당류 0g인데 왜?」(pmf-research §1-2 가장 강한 불만). 2026-11-18 — 당알코올까지 든 진짜 당질로 말한다.
  const b = basisOf(p);
  const sugar = amountOf(p, 'sugar', 'serving').value;
  const net = amountOf(p, 'glucide', 'serving').value;
  if (sugar != null && net != null && sugar < 0.5 && net >= 5) {
    out.push({
      id: 'zero-sugar-carb',
      title: '당류는 0g, 당질은 있습니다',
      body: `${b.kind === 'per100' ? b.label : b.label + ' 기준'} 당류는 ${fmtNum(sugar)}g이지만 당질은 ${fmtNum(net)}g입니다. 당류에는 전분, 당알코올이 들어가지 않습니다.`,
      tone: 'plain',
    });
  }

  // 식이섬유를 표시하지 않으면 당질 = 탄수화물(실제보다 많거나 같다)
  const carbFocus = focus.find((k) => k === 'carb_net' || k === 'glucide');
  if (carbFocus && p.nutrition.per100 && p.nutrition.per100.fiber == null) {
    const w = NUTRIENTS[carbFocus].label;
    out.push({ id: 'fiber-missing', title: '식이섬유 표시 없음', body: `식이섬유를 표시하지 않아 탄수화물에서 빼지 않고 셉니다. 실제 ${w}은 이보다 적을 수 있습니다.`, tone: 'plain' });
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
  const order: NutrientKey[] = ['kcal', 'carb', 'glucide', 'carb_net', 'sugar', 'protein', 'fat', 'sodium', 'fiber'];
  return order.filter((k) => !focus.includes(k));
}

/** 정렬 방향 — 단백질 · 식이섬유는 많은 순, 나머지는 적은 순(판정이 아니라 줄 세우는 방향일 뿐). */
export const sortDesc = (k: NutrientKey) => k === 'protein' || k === 'fiber';

// ── 목록 한 줄(검색 결과 · 둘러보기 · 다른 선택) ─────────────────────────────

// hits = 걸린 피할 성분 이름(줄 세우기 · 개수) · hitDetails = 「무엇이 · 얼마나」(카드 배지 · 2026-11-18 사용자 「당알코올 전체 대신 실제 원재료와 양」)
export type LensRow = { nums: { key: NutrientKey; label: string; text: string; has: boolean }[]; hits: string[]; hitDetails: string[] };

/** 목록 줄에 붙일 내 기준 숫자(100g(mL)당 — 제품마다 1회분이 달라 같은 양으로 맞춘다)와 「들어 있음」. */
export function lensRow(p: ProductDetail, focus: NutrientKey[], avoid: AvoidItem[]): LensRow {
  return {
    nums: focus.map((k) => {
      const a = amountOf(p, k, 'per100');
      return { key: k, label: a.label, text: a.value == null ? (k === 'polyol' ? SWEET_SHORT[sweetState(p)] : '-') : a.text, has: a.value != null };
    }),
    ...(() => {
      const c = avoidCheck(p, avoid);
      const rows = c.results.filter((r) => r.hits.length);
      return {
        hits: rows.map((r) => r.item.l),
        hitDetails: rows.map((r) => {
          const h = hitAmount(p, r.hits, 'per100');
          return `${h.names}\n${h.amount.replace(' 합계', '')}`; // 「이름\n양」 — 카드 배지가 두 줄로 나눠 쓴다
        }),
      };
    })(),
  };
}

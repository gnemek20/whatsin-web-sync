// 세 축(영양 · 성분 · 당질) 문구 — 이름 · 칸 말 · 라벨 · 판정 못 한 이유 · 한계 · 자료 모순 · 「왜 이 점수인가」 근거 줄.
// 정본 web/data/axes/*.json(packages/data). API 는 코드(band · reason_code · caveats · *_sources · key/note_code/flags)와 숫자를 보내고
// 문장은 여기서 만든다. 코드를 모르면 null 을 돌려 부르는 쪽이 서버 문장(옛 앱용)으로 떨어진다.
// 작은 JSON(합 6 kB)이라 클라이언트(섭취량 슬라이더의 한계 문구)에서도 읽는다.
import axesJson from '@/data/axes/axes.json';
import issuesJson from '@/data/axes/data-issues.json';
import notesJson from '@/data/axes/score-notes.json';
import type { Axis, ScorePart } from '../types';
import { fill, quoted } from './text';

export type AxisKey = 'nutrition' | 'glycemic' | 'ingredient';
export type Band = 1 | 2 | 3 | 4;

export const AXIS_NAME = axesJson.name as Record<AxisKey, string>;
export const AXIS_SOURCE = axesJson.source as Record<AxisKey, string>;
/** 칸 말 — 영양은 「미흡」, 성분은 「주의」까지. 목록 줄처럼 좁은 자리는 성분 쪽 짧은 말을 같이 쓴다. */
export const BAND_WORD = axesJson.band_word as { nutrition: Record<string, string>; ingredient: Record<string, string> };
export const bandWord = (key: 'nutrition' | 'ingredient', b: Band) => BAND_WORD[key][String(b)];
export const SHORT_WORD = (b: Band, key: 'nutrition' | 'ingredient' = 'ingredient') => BAND_WORD[key][String(b)];

const L = axesJson.label;
export const AXIS_LABEL = L;
const isBand = (b: unknown): b is Band => b === 1 || b === 2 || b === 3 || b === 4;

/** 판정 못 한 이유(reason_code) → 문장. 모르는 코드 · 채울 값이 없으면 null. */
export function reasonText(a: Axis): string | null {
  const code = a.reason_code;
  if (!code) return null;
  const reasons = axesJson.reason as Record<string, string>;
  if (code.startsWith('not_covered:')) {
    const subject = (axesJson.not_covered_subject as Record<string, string>)[code.slice('not_covered:'.length)];
    return subject ? fill(reasons.not_covered, { subject }) : null;
  }
  if (code === 'nutrients_missing') {
    const m = a.missing_nutrients ?? [];
    return m.length ? fill(reasons.nutrients_missing, { missing: m.join(', ') }) : reasons.nutrients_missing_some;
  }
  return reasons[code] ?? null;
}

/** 성분 칸1 인데 「없음」의 근거가 없거나 모자라는 경우의 라벨. */
function ingredientBasisLabel(a: Axis): string | null {
  if (a.no_basis) {
    const unknown = (a.ingredients_total ?? 0) - (a.ingredients_matched ?? 0);
    return (a.ingredients_undisclosed ?? 0) >= unknown ? L.ingredient_no_basis_undisclosed : L.ingredient_no_basis_unmatched;
  }
  if (a.partial_basis) return L.ingredient_partial_basis;
  return null;
}

/** 축 라벨(칸 말이 아닌 긴 이름 — 「영양 구성 아쉬움」 · 「식품첨가물이 확인됨」 · 「평가 대상 아님」). 당질 양은 carb.ts 가 만든다. */
export function labelText(key: AxisKey, a: Axis): string | null {
  const b = a.band;
  if (key !== 'glycemic' && isBand(b)) {
    if (key === 'ingredient' && b === 1) {
      const nb = ingredientBasisLabel(a);
      if (nb) return nb;
    }
    return (L[key] as Record<string, string>)[String(b)] ?? null;
  }
  if (a.reason_code === 'no_data') return L.unknown;
  if (b === 'n/a') return key === 'glycemic' ? L.na : a.reason_code?.startsWith('not_covered:') ? L.not_covered : null;
  if (b === 'unresolved') return L.unresolved;
  if (b === 'unknown' && a.reason_code) return key === 'nutrition' ? L.nutrition_unknown : key === 'ingredient' ? L.ingredient_unknown : L.calc_unknown;
  return null;
}

export { splitCaveats } from './caveats';

// ── 영양 축 note — 자료 모순 문장(최대 2줄 + 결론 한 번) · 판매 상태 그대로 ─────────────────
const ISSUE = issuesJson.templates as Record<string, string>;

/** 영양 축의 모순 코드를 문장으로. 근거(*_sources · *_type_median)가 비면 그 줄은 내지 않는다(서버 _data_issue_note 와 같다). */
export function nutritionNote(a: Axis): string | null {
  const cav = a.caveats ?? [];
  const vars: Record<string, string | number | null> = {};
  for (const [k, v] of Object.entries(a)) {
    if (k.endsWith('_sources')) vars[k] = Array.isArray(v) && v.length ? quoted(v as string[]) : null;
    else if (k.endsWith('_type_median')) vars[k] = typeof v === 'number' ? v : null;
  }
  const lines: string[] = [];
  for (const code of Object.keys(ISSUE)) {
    if (lines.length >= issuesJson.max) break;
    if (!cav.includes(code)) continue;
    const t = fill(ISSUE[code], vars);
    if (t) lines.push(t);
  }
  if (lines.length) lines.push(issuesJson.tail);
  if (cav.includes('as_sold_undiluted')) lines.push(notesJson.as_sold);
  return lines.length ? lines.join('\n') : null;
}

/** 당질 축 note — 영양 자료 전체가 의심스러우면 한 줄. */
export function glycemicNote(a: Axis): string | null {
  return (a.caveats ?? []).includes('nutrition_data_doubtful') ? notesJson.glycemic_doubt : null;
}

// ── 성분 축 note — 첨가물 이름(3종까지 · 넘으면 「외 N종」) · 주의 성분 이름 ─────────────────
const ING = axesJson.ingredient_note;
function names3(names: string[]) {
  return names.slice(0, 3).join(', ') + (names.length > 3 ? fill(ING.additives_more, { more: names.length - 3 })! : '');
}
/** 「식품첨가물 7종, 변성전분, 난각칼슘, 면류첨가알칼리제 외 4종」 — 칸2 의 근거. 이름이 없으면 null. */
export function additivesNote(count: number | null | undefined, names: string[] | null | undefined): string | null {
  if (!names || names.length === 0) return null;
  return fill(ING.additives, { n: count ?? names.length, names: names3(names) });
}
/** 「**주의 성분** 경화유, 합성향료\n아래에 섭취 시 영향 설명」 */
export function flaggedNote(names: string[]): string {
  if (!names.length) return '';
  return fill(ING.flagged, { names: names.slice(0, 3).join(', ') + (names.length > 3 ? fill(ING.flagged_more, { more: names.length - 3 })! : '') })!;
}
/** 「**걸린 항목** 당류, 포화지방」 */
export const worstNote = (names: string) => (names ? fill(ING.worst, { names })! : '');

// ── 「왜 이 점수인가」 근거 줄(ScorePart) ─────────────────────────────────────────
const PART_LABEL = notesJson.part_label as Record<string, string>;
const PART_FLAG = notesJson.part_flag as Record<string, string>;
const FATS_LABEL = notesJson.fats_label as Record<string, string>;

export function partLabel(p: ScorePart): string {
  if (!p.key) return p.label;
  const flags = p.flags ?? [];
  let label = flags.includes('fats') && FATS_LABEL[p.key] ? FATS_LABEL[p.key] : PART_LABEL[p.key];
  if (!label) return p.label;
  for (const f of flags) if (PART_FLAG[f]) label = fill(PART_FLAG[f], { label }) ?? label;
  return label;
}

export function partNote(p: ScorePart): string | undefined {
  const c = p.note_code;
  if (!c) return p.note;
  if (c === 'missing') return notesJson.missing;
  if (c === 'protein_gate') return notesJson.protein_gate;
  const [head, sub] = c.split(':');
  const table = head === 'protein_excluded' ? notesJson.protein_excluded : head === 'fvl_excluded' ? notesJson.fvl_excluded : null;
  return (table && sub && (table as Record<string, string>)[sub]) || p.note;
}

/** 근거 줄 대신 보일 한 문장 — 영양 축이 판정하지 않았으면 그 이유만.
 *  「모두 기준 아래라 반영된 영양소가 없습니다」(base_empty · base_empty_fats)는 내지 않는다(2026-11-06 사용자 「기준 아래라는 내용은
 *  노출하지 않는다」 · 사용자에게 전할 것이 없는 문장). 문장은 score-notes.json 에 남긴다(10-30 부터 있던 기존 문구). */
export function baseNote(nutrition: Axis | null | undefined, _parts: ScorePart[], _fats: boolean, server?: string | null): string {
  if (nutrition && (nutrition.band === 'unknown' || nutrition.band === 'n/a')) return reasonText(nutrition) ?? server ?? notesJson.base_silent;
  return '';
}

export const noDataReason = () => notesJson.no_data;

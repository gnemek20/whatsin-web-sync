// 원재료 화면 문구 — 성분 사전(web/data/ingredients/dictionary.json · 약 290 kB)과 분류 · 주의 태그 문구.
// ⚠️ 서버 전용이다. 사전은 클라이언트 번들에 절대 넣지 않는다 — 서버 컴포넌트(lib/api 의 응답 정리)에서만 읽고,
// 다 만든 짧은 문자열만 화면으로 내려간다. 'server-only' 가 클라이언트에서 import 되면 빌드가 실패한다.
import 'server-only';
import dictionary from '@/data/ingredients/dictionary.json';
import kinds from '@/data/ingredients/kinds.json';
import concerns from '@/data/ingredients/concerns.json';
import type { Ingredient, IngredientConcern, IngredientInfo, IngredientOfDay } from '../types';
import { fill } from './text';

type Entry = {
  name: string;
  summary?: string;
  detail?: string;
  function?: string;
  advice?: string;
  gi?: string;
  sensitive_groups?: string[];
  concerns?: { type: string; label: string; severity: string; note?: string }[];
  authorities?: { body: string; assessment: string }[];
};
const DICT = (dictionary as unknown as { items: Record<string, Entry> }).items;
const TAG = kinds.tag as Record<string, string>;
const PLAIN_BY_CATEGORY = kinds.plain as Record<string, string>;
const PLAIN_BY_TAG = concerns.plain as Record<string, string>;
const GI_BY_TAG = concerns.gi as Record<string, string>;
const INSTEAD = concerns.instead as Record<string, string>;
// 목록은 부를 때 본다(CDN 새 판이 배열을 제자리에서 바꾼다).
const MIXTURES = { has: (x: string) => kinds.additive_mixtures.includes(x) };
const BARE = { has: (x: string) => kinds.additive_bare.includes(x) };
const TABLE4 = { has: (x: string) => kinds.table4_uses.includes(x) };

/** API Ingredient.key 와 같은 규칙 — 공백을 뗀 정규화 이름 앞 40자(backend ingredient_view._slug). */
export const keyOf = (name: string) => name.replace(/\s+/g, '').slice(0, 40);

/** 자리표시자(「혼합제제」 · 「향료」 · 「소스」) 설명 — 무엇을 모르는지 말한다. */
function placeholderPlain(name: string, fclasses: string[]): string {
  if (MIXTURES.has(name)) return kinds.placeholder.additive_mixture;
  if (BARE.has(name)) return kinds.placeholder.additive_bare;
  if (!fclasses.length) return PLAIN_BY_CATEGORY.placeholder;
  if (TABLE4.has(fclasses[0])) return kinds.placeholder.table4_use;
  return fill(kinds.placeholder.use_only, { use: fclasses[0] })!;
}

function toInfo(e: Entry): IngredientInfo | null {
  if (!e.concerns?.length && !e.authorities?.length && !e.function && !e.advice) return null;
  return {
    summary: e.summary ?? '',
    function: e.function ?? '',
    concerns: (e.concerns ?? []).map((c) => ({ type: c.type, label: c.label, severity: c.severity as IngredientConcern['severity'], note: c.note ?? '' })),
    sensitive_groups: e.sensitive_groups ?? [],
    authorities: e.authorities ?? [],
    advice: e.advice ?? '',
  };
}

/**
 * 원재료 한 줄의 문구를 사전으로 다시 만든다. 사전에 키가 없으면(미매칭 · 사전 밖) 서버 문구 그대로.
 * 판정(verdict) · 걸린 회피 키 · 함량 · 「○○ 안」 같은 사실은 건드리지 않는다.
 */
export function localizeIngredient<T extends Omit<Ingredient, 'found_in'>>(it: T): T {
  const e = DICT[it.key];
  if (!e) return it;
  const kind = it.kind ?? null;
  const fclasses = it.function_classes ?? [];
  const prim = it.primary_tag ?? null;
  const tag = kind === 'function' ? fclasses[0] : kind ? TAG[kind] : undefined;
  const plain =
    e.summary ||
    (prim ? PLAIN_BY_TAG[prim] : undefined) ||
    (it.category === 'placeholder' ? placeholderPlain(e.name || it.name, fclasses) : undefined) ||
    (it.category ? PLAIN_BY_CATEGORY[it.category] : undefined) ||
    it.plain;
  const flaggedVerdict = it.verdict === 'risk' || it.verdict === 'caution';
  return {
    ...it,
    tag: tag || it.tag,
    plain,
    detail: e.detail ?? it.detail,
    gi: e.gi || (prim ? GI_BY_TAG[prim] : undefined) || '—',
    info: toInfo(e) ?? it.info ?? null,
    // 「대신 이런 제품」은 주의 성분(risk · caution)에만
    instead: flaggedVerdict ? (prim ? INSTEAD[prim] : undefined) || it.instead || '' : '',
  };
}

/** 오늘의 성분 — 응답에 분류 코드가 없어 이름으로 사전을 찾는다. 설명만 바꾼다. */
export function localizeIngredientOfDay(d: IngredientOfDay): IngredientOfDay {
  const e = DICT[d.key ?? keyOf(d.name)];
  return e?.summary ? { ...d, plain: e.summary } : d;
}

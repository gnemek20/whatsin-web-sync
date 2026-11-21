// 축 이름 · 칸 말 · 「없음」 — 목록 줄처럼 브라우저에서도 그리는 짧은 말만. 이름을 골라 가져와(named import) 번들에는
// axes.json · carb.json 의 이 칸들만 들어간다(이유 문장 · 자료 모순 틀 · 당질 설명은 빠진다).
import { name, band_word } from '@/data/axes/axes.json';
import { copy } from '@/data/nutrition/carb.json';
import type { AxisKey, Band } from '../bands';

export const AXIS_NAME = name as Record<AxisKey, string>;
/** 목록 줄 · 대안 카드의 짧은 칸 말 — 축마다 제 말(영양 「좋음 … 아쉬움」 · 성분 「주의 없음 … 주요 주의」 · 2026-11-06). */
export const SHORT_WORD = (b: Band, key: 'nutrition' | 'ingredient' = 'ingredient') =>
  (band_word[key] as Record<string, string>)[String(b)];
export const CARB_NONE = copy.none;

// 세 축(영양 · 성분 · 당질) 표시 매핑 — 앱 app/src/data/axes.ts 와 같은 규칙. 문구는 lib/content(web/data JSON)에서 읽는다.
//   · 2026-11-04 「탄수화물」→「당질」(사용자). 서버 carb_g 는 원래 가용탄수(탄수화물 − 표시 식이섬유 · 대체당 보정)라 당질이 맞는 말이다.
//     식이섬유를 안 적은 제품(약 98 %)은 탄수화물 그대로라 실제 당질보다 많거나 같다(caveat fiber_missing).
//   · 영양·성분은 서버 band 1~4 를 그대로 칸으로 쓴다. 웹이 컷을 다시 긋지 않는다.
//   · 당질(서버 키 glycemic)은 칸이 아니라 1회분 당질 **양**과 **구성**(band "amount"). 판정색을 쓰지 않는다.
//   · unknown·n/a·unresolved 는 숨기지 않고 회색 + 이유(reason_code → axes.json)로 「모른다」를 보인다.
//   · 밥 공기는 「양」의 환산이다 — 「밥 N공기만큼 혈당이 오른다」로 쓰지 않는다.
// 응답의 label · reason · note 는 lib/api 가 이미 코드로 다시 만들어 둔 값이다(lib/content/localize.server).
import type { Axis, IngredientVerdict, ScorePart } from './types';
import { parseMarkup, texToText } from './markup';
import { AXIS_LABEL, AXIS_NAME, bandWord, flaggedNote, splitCaveats, worstNote, type AxisKey, type Band } from './content/axes';
import { CARB_COPY, carbBand as carbBandOf, type CarbBand as CarbBandT } from './content/carb';
import { nutrientWhy } from './content/nutrients';

export type { AxisKey, Band };
export { bandOf, toneOf } from './bands';
import { bandOf, ingredientNoBasis } from './bands';
export { AXIS_NAME, AXIS_SOURCE, SHORT_WORD, splitCaveats } from './content/axes';
export { carbBand, carbBandText, type CarbBand } from './content/carb';
export { CARB_FOODS, mealCarbG, bowlsCarbLabel, carbAnalogy, countWord, riceLabel, sameAmountText, type CarbAnalogy, type CarbFood } from './content/carb';
export { dvSugarG } from './content/nutrients';

// 문장은 **부를 때 읽는다** — CDN 새 판(lib/content/remote.server)이 JSON 객체를 제자리에서 바꾸므로 상수로 복사해 두면 옛 문장이 남는다.
export const carbWhy = () => CARB_COPY.why;
export const carbWhyMore = () => CARB_COPY.why_more;
export const liquidSugarNote = () => CARB_COPY.liquid;

export type AxisView = {
  key: AxisKey;
  name: string;
  tone: Band | null;   // 판정색 칸(없으면 회색)
  meter: Band | null;  // 4칸 미터를 그릴 칸(혈당은 없음)
  value: string;       // 큰 글자 — 칸 말 또는 양
  note: string;        // 보조 줄
  muted: boolean;      // 모름·해당 없음
};

/** 영양 칸을 가장 많이 깎은 영양소 둘 — 이름만(점수는 내지 않는다). */
function worstParts(parts?: ScorePart[] | null): ScorePart[] {
  return (parts ?? [])
    .filter((p) => p.kind === 'penalty' && p.points > 0)
    .sort((x, y) => y.points - x.points)
    .slice(0, 2);
}
export const worstNutrients = (parts?: ScorePart[] | null) => worstParts(parts).map((p) => p.label).join(', ');
/** 감점이 큰 영양소 둘 — 판정 근거 줄과 맨 위 영양 칸 펼침이 같은 둘을 말하게 한 곳에서 고른다. */
export const worstPartsOf = worstParts;

export function nutritionView(a: Axis, parts?: ScorePart[] | null): AxisView {
  const b = bandOf(a);
  const worst = b && b > 1 ? worstParts(parts) : [];
  return {
    key: 'nutrition',
    name: AXIS_NAME.nutrition,
    tone: b,
    meter: b,
    value: b ? bandWord('nutrition', b) : a.label,
    note: b
      ? [
          worstNote(worst.map((p) => p.label).join(', ')),
          ...worst.map((p) => nutrientWhy(p.key, p.label)),
          a.note ?? '',
        ].filter(Boolean).join('\n')
      : a.reason ?? '',
    muted: b == null,
  };
}

/** `flagged` — 주의 성분 이름. 칸3·4 면 이름을 적는다(「주의해서 볼 성분 있음」 옆에 「특이 사항 없음」이 뜨던 모순). */
export function ingredientView(a: Axis, flagged: string[] = []): AxisView {
  const b = bandOf(a);
  const noBasis = ingredientNoBasis(a);
  const named = b && b >= 3 ? flaggedNote(flagged) : '';
  return {
    key: 'ingredient',
    name: AXIS_NAME.ingredient,
    tone: noBasis ? null : b,
    meter: noBasis ? null : b,
    value: a.label, // 성분 축은 라벨이 곧 의미(「식품첨가물이 확인됨」 · 「원재료 미확인」)
    note: b == null ? a.reason ?? '' : [named, a.note ?? ''].filter(Boolean).join('\n'),
    muted: b == null || noBasis,
  };
}

export type GlycemicView = AxisView & {
  amount: null | {
    carbG: number;
    sugarsG: number | null;
    carbBowls: number;
    carbPct: number | null; // [별표 5] 1일 탄수화물 기준치 324 g 대비 %(서버)
    sugarsBowls: number | null;
    wholePack: boolean;
    budget: CarbBandT | null; // 당질 참고 기준(낮음 · 보통 · 높음) — carb_budget 이 없으면 null(밴드 자리를 비운다)
    loud: string[];
    quiet: string[];
  };
};

export function glycemicView(a: Axis): GlycemicView {
  const base = { key: 'glycemic' as const, name: AXIS_NAME.glycemic, tone: null, meter: null };
  if (a.band === 'amount' && a.carb_g != null) {
    // 「영양성분 자료 의심」은 note(glycemic_doubt)가 말한다 — 같은 말을 한계 줄로 한 번 더 내지 않는다.
    const { loud, quiet } = splitCaveats(a.caveats, false, a.note ? ['nutrition_data_doubtful'] : []);
    const carbBowls = a.carb_rice_bowls ?? a.carb_g / 69;
    return {
      ...base,
      value: a.label,
      note: a.note ?? '',
      muted: false,
      amount: {
        carbG: a.carb_g,
        sugarsG: a.sugars_g ?? null,
        carbBowls,
        carbPct: a.carb_pct ?? null,
        sugarsBowls: a.sugars_g == null ? null : a.sugars_rice_bowls ?? a.sugars_g / 69,
        wholePack: a.basis === 'total_content',
        budget: carbBandOf(a),
        loud,
        quiet,
      },
    };
  }
  const value = a.band === 'n/a' ? AXIS_LABEL.na : a.band === 'unresolved' ? a.label : AXIS_LABEL.calc_unknown;
  return { ...base, value, note: a.reason || '', muted: true, amount: null };
}

/** 목록용 짧은 당질 값(1회분 g). 모르면 null. */
export function bowlsShort(a?: Axis | null): string | null {
  if (!a || a.band !== 'amount' || a.carb_g == null) return null;
  const g = a.carb_g;
  return `${AXIS_NAME.glycemic} ${g < 10 ? Math.round(g * 10) / 10 : Math.round(g)}g`;
}

/** 마크업(**굵게** · $KaTeX$ · 줄바꿈 · 「- 」 목록)을 뗀 평문 — title·aria·메타 description 처럼 HTML 을 못 쓰는 자리용. */
export function plain(s: string | null | undefined): string {
  // 서식 규칙은 lib/markup 한 곳 — 줄은 「, 」로 잇는다(aria·메타 설명처럼 HTML 을 못 쓰는 자리 · 가운뎃점 나열 금지 §0-7).
  return parseMarkup(s ?? '')
    .map((l) => l.segs.map((g) => (g.kind === 'math' ? texToText(g.text) : g.text)).join('').trim())
    .filter(Boolean)
    .join(', ');
}

export const fmt1 = (n: number) => String(Math.round(n * 10) / 10);
export const fmt2 = (n: number) => String(Math.round(n * 100) / 100);

// ── 원재료 판정(글자색·틴트) ───────────────────────────────────────────
// TODO(data): move to packages/data/ingredients/kinds.json — 원재료 판정 이름표(범례 · 화면 읽기용).
export const VERDICT_LABEL: Record<IngredientVerdict, string> = {
  risk: '특히 조심',
  caution: '주의',
  ok: '첨가물',
  good: '일반 원재료',
  unknown: '세부 미확인',
};

/** 판정 글자·틴트 색 — risk·caution·good 만 판정색, ok·unknown 은 중립(unknown 은 점선 테두리). */
export function verdictTone(v: IngredientVerdict): Band | null {
  return v === 'risk' ? 4 : v === 'caution' ? 3 : v === 'good' ? 1 : null;
}

export { cleanReason } from './reason';

export const IMPROVE_LABEL: Record<string, string> = {
  nutrition: AXIS_NAME.nutrition,
  glycemic: CARB_COPY.improve,
  ingredient: AXIS_NAME.ingredient,
};

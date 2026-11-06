// 당질 축 — 원물 비유 · 공기 분수 · 문구. 값과 문구는 web/data/nutrition/carb.json(정본 packages/data · 식품교환표 2023 제4판).
//   곡류군 1교환 = 탄수화물 23 g = 밥 70 g(1/3공기) = 감자 140 g(중 1개) → 밥 1공기 69 g · 감자 중 1개 23 g
//   과일군 1교환 = 탄수화물 12 g = 사과 100 g(중 1/2개) → 사과 중 1개 24 g
// 고르는 법 — 당류가 당질의 절반 이상이면 사과(당으로 먹는 원물), 아니면 2/3공기 이상은 밥(한 끼), 그 아래는 감자.
// 「같은 양」의 비유다. 같은 혈당 반응이라는 뜻이 아니다(GI 는 원물마다 다르고 우리는 GI 를 모른다).
// 작은 JSON(2 kB)이라 클라이언트(섭취량 슬라이더)에서도 읽는다.
import carb from '@/data/nutrition/carb.json';
import { fill } from './text';

export type CarbFood = 'rice' | 'potato' | 'apple';
export const CARB_FOODS = carb.foods as Record<CarbFood, { name: string; unit: string; g: number }>;
export const CARB_COPY = carb.copy;
const R = carb.rules;
export const mealCarbG = () => CARB_FOODS[R.meal_food as CarbFood].g; // 「밥 한 끼」 = 밥 1공기 · 부를 때 읽는다(CDN 새 판)

// 0.875 이상이면 반 개 단위로 센다(「1개」 · 「1개 반」) — 분수 표(3/4 = 0.75)와 1 사이의 가운데.
const WHOLE_FROM = 0.875;
type Frac = [number, string];

function nearest(fracs: Frac[], n: number): string {
  return fracs.reduce((best, f) => (Math.abs(f[0] - n) < Math.abs(best[0] - n) ? f : best))[1];
}

function countIn(n: number, unit: string, fracs: Frac[], tiny: number, tinyText: string): string {
  if (n < tiny) return tinyText;
  if (n < WHOLE_FROM) {
    const w = nearest(fracs, n);
    return w === '반' ? fill(CARB_COPY.count_half, { unit })! : `${w}${unit}`;
  }
  const halves = Math.max(2, Math.round(n * 2));
  const whole = Math.floor(halves / 2);
  return halves % 2 ? fill(CARB_COPY.count_and_half, { whole, unit })! : `${whole}${unit}`;
}

/** 「반 개」 · 「1/3개」 · 「1개 반」 — 원물 개수. */
export function countWord(n: number, unit: string): string {
  return countIn(n, unit, carb.fractions as Frac[], R.tiny_count, fill(CARB_COPY.count_tiny, { unit })!);
}

/** 밥 공기 분수(「1/3공기」 · 「반 공기」 · 「1공기 반」). 앱 data/axes riceLabel 과 같은 규칙. */
export function riceLabel(bowls: number): string {
  const rf = carb.rice_fractions as Frac[];
  return countIn(bowls, CARB_FOODS.rice.unit, rf, rf[0][0], CARB_COPY.rice_tiny);
}

export type CarbAnalogy = { food: CarbFood; text: string; sugarLed: boolean; mealPct: number };

/** 「사과 반 개」 · 「감자 1/3개」 · 「밥 1공기」 — 당질 g 과 당류 g 으로 원물을 고른다. */
export function carbAnalogy(carbG: number, sugarsG: number | null): CarbAnalogy | null {
  if (!(carbG > 0)) return null;
  const sugarLed = sugarsG != null && sugarsG >= carbG * R.sugar_led_share;
  const food: CarbFood = sugarLed ? 'apple' : carbG >= mealCarbG() * R.rice_min_meals ? 'rice' : 'potato';
  const f = CARB_FOODS[food];
  return { food, text: `${f.name} ${countWord(carbG / f.g, f.unit)}`, sugarLed, mealPct: Math.round((carbG / mealCarbG()) * 100) };
}

/** 당질 g 표기 — 10 g 미만은 소수 한 자리. */
export const carbG = (g: number) => String(g < 10 ? Math.round(g * 10) / 10 : Math.round(g));

/** 「사과 반 개만큼」 */
export const analogyText = (a: CarbAnalogy) => fill(CARB_COPY.analogy, { food: a.text })!;

// TODO(data): move to packages/data/nutrition/carb.json — 당질이 0 이라 원물을 못 고를 때의 한 줄.
const BOWLS_ONLY = '당질 = 밥 {bowls}';

/** 단독으로 쓰는 자리 — 「당질 19g, 감자 1개 반만큼」. carbG 를 알면 그것을 쓴다(반올림된 공기 수에서 g 을 되살리면 당류 절반 경계가 흔들린다). */
export function bowlsCarbLabel(bowls: number, sugarsG: number | null = null, g: number | null = null): string {
  const v = g ?? bowls * mealCarbG();
  const an = carbAnalogy(v, sugarsG);
  return an ? fill(CARB_COPY.line, { g: carbG(v), analogy: analogyText(an) })! : fill(BOWLS_ONLY, { bowls: riceLabel(bowls) })!;
}

// TODO(data): move to packages/data/nutrition/carb.json — 「자세히」 안 원물 목록 한 줄(밥은 「당질」을 붙이고 나머지는 「중 1개」).
// (틀 대신 함수 — 수식 `\text{g}` 의 중괄호가 fill 자리와 겹친다.)
const foodLine = (f: { name: string; unit: string; g: number }, first: boolean) =>
  first ? `- ${f.name} 1${f.unit} = 당질 $${f.g}\\,\\text{g}$` : `- ${f.name} 중 1${f.unit} = $${f.g}\\,\\text{g}$`;

/** 「같은 양의 원물」 설명 — 머리 한 줄 · 원물 목록 · 한계 한 줄. */
export function sameAmountText(): string {
  const [head, ...rest] = CARB_COPY.same_amount.split('\n');
  const foods = (['rice', 'potato', 'apple'] as CarbFood[]).map((k, i) => foodLine(CARB_FOODS[k], i === 0));
  return [head, ...foods, ...rest].join('\n');
}

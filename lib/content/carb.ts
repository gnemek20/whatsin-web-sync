// 당질 축 — 원물 비유 · 공기 분수 · 문구. 값과 문구는 web/data/nutrition/carb.json(정본 packages/data · 식품교환표 2023 제4판).
//   곡류군 1교환 = 탄수화물 23 g = 밥 70 g(1/3공기) = 감자 140 g(중 1개) → 밥 1공기 69 g · 감자 중 1개 23 g
//   과일군 1교환 = 탄수화물 12 g = 사과 100 g(중 1/2개) → 사과 중 1개 24 g
// ~~고르는 법 — 당류가 당질의 절반 이상이면 사과, 2/3공기 이상은 밥, 그 아래는 감자.~~ → 2026-11-14 사용자 「사과나 감자 비유를 빼고 전부 공기밥으로」 —
//   웹은 늘 밥 공기로 센다(공용 carb.json 의 감자 · 사과 값은 앱이 아직 읽어서 그대로 둔다). sugarLed(당류 절반 이상)는 「절반 이상이 당류」 줄에만 쓴다.
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

/** 「밥 1/4공기」 · 「밥 1공기 반」 — 당질 g 을 밥 공기로 센다(2026-11-14 · 사과 · 감자 비유 걷음). */
export function carbAnalogy(carbG: number, sugarsG: number | null): CarbAnalogy | null {
  if (!(carbG > 0)) return null;
  const sugarLed = sugarsG != null && sugarsG >= carbG * R.sugar_led_share;
  return { food: 'rice', text: `${CARB_FOODS.rice.name} ${riceLabel(carbG / mealCarbG())}`, sugarLed, mealPct: Math.round((carbG / mealCarbG()) * 100) };
}

/** 당질 g 표기 — 10 g 미만은 소수 한 자리. */
export const carbG = (g: number) => String(g < 10 ? Math.round(g * 10) / 10 : Math.round(g));

// 2026-11-13 사용자 「당질도 비유로 표현하지 않고 정확한 용량으로 · 비교가 참고용, 실 수치가 메인」 — 웹은 큰 글씨를 g 으로 쓰고
// 원물 비유는 「참고」 한 줄로 내린다. 공용 문구(carb.json · 앱도 읽는다)는 그대로 두고 웹 코드에서만 바꾼다(앱은 따로 정한다).
/** 큰 글씨 — 「10g」 · 0.05g 미만이면 「0.1g 미만」(0g 이라고 쓰면 「없다」로 읽힌다). */
export const carbAmount = (g: number) => (g > 0 && g < 0.05 ? '0.1g 미만' : `${carbG(g)}g`);
/** 참고 한 줄 — 「참고: 밥 1/4공기 분량」 · 원물을 못 고르면(0) 빈 문자열. */
export const carbRef = (a: CarbAnalogy | null) => (a ? `참고: ${a.text} 분량` : '');

/** 「밥 반 공기만큼」 */
export const analogyText = (a: CarbAnalogy) => fill(CARB_COPY.analogy, { food: a.text })!;


/** 단독으로 쓰는 자리 — 「당질 19g (참고: 밥 1/4공기 분량)」. carbG 를 알면 그것을 쓴다(반올림된 공기 수에서 g 을 되살리면 당류 절반 경계가 흔들린다). */
export function bowlsCarbLabel(bowls: number, sugarsG: number | null = null, g: number | null = null): string {
  const v = g ?? bowls * mealCarbG();
  const an = carbAnalogy(v, sugarsG);
  // 2026-11-13 — 실 수치가 먼저, 비유는 괄호 속 참고(위 carbAmount 주석)
  return an ? `당질 ${carbAmount(v)} (${carbRef(an)})` : `당질 ${carbAmount(v)}`;
}

/** 「같은 양」 비유의 한계 한 줄(2026-11-14 밥만 남아 목록을 걷었다). */
export function sameAmountText(): string {
  // 2026-11-14 밥만 남아 「같은 양의 원물」 목록이 한 줄짜리가 됐고, 「밥 1공기 = 당질 69g」은 출처 줄이 이미 말한다 — 한계 줄만 남긴다.
  const [, ...rest] = CARB_COPY.same_amount.split('\n');
  return rest.join('\n');
}

// ── 당질 참고 기준(2026-11-10 · 핸드오프 docs/product/프론트_핸드오프_당질참고기준_2026-11-10.md · 앱 data/axes carbBand 와 같은 규칙) ──
// 1회분 당질(carb_g) ÷ 간식 한 번 몫(또는 식사 한 끼 몫). 기준값 · 문구는 carb.json budget — g 문턱을 코드에 적지 않는다(개인 설정이면 비율이 움직인다).
// 「참고 기준」이다 — 판정색 · 「혈당이 낮다/높다」로 쓰지 않는다.
export type CarbBudget = { energy_kcal: number; carb_energy_share: number; snack_share: number; snacks_per_day: number; meals_per_day: number };
export type CarbLevel = 'low' | 'mid' | 'high';
export type CarbBand = { level: CarbLevel; label: string; pct: number; slot: number; kind: 'snack' | 'meal' };
// CDN 판이 이 키보다 옛것이면(빌드 · 서버가 받은 carb.json 에 budget 이 없으면) 밴드를 내지 않는다 — 2026-11-10 웹 빌드가 그래서 죽었다.
const budgetOf = (): (typeof carb)['budget'] | null => (carb as { budget?: (typeof carb)['budget'] }).budget ?? null;
export const CARB_BUDGET = budgetOf; // 부를 때 읽는다(CDN 새 판)

export function budgetShares(b: CarbBudget) {
  const daily = (b.energy_kcal * b.carb_energy_share) / 4;
  return { daily, snack: (daily * b.snack_share) / b.snacks_per_day, meal: (daily * (1 - b.snack_share)) / b.meals_per_day };
}

export function carbBand(
  a: { band: unknown; carb_g?: number | null; carb_budget?: 'snack' | 'meal' | null } | null | undefined,
  given?: CarbBudget,
): CarbBand | null {
  if (!a || a.band !== 'amount' || a.carb_g == null || (a.carb_budget !== 'snack' && a.carb_budget !== 'meal')) return null;
  const B = budgetOf();
  if (!B) return null;
  const b = given ?? B.guest;
  const s = budgetShares(b);
  const slot = a.carb_budget === 'snack' ? s.snack : s.meal;
  const ratio = a.carb_g / slot;
  const { low_max, high_over } = B.band;
  const level: CarbLevel = ratio <= low_max ? 'low' : ratio > high_over ? 'high' : 'mid';
  return { level, label: B.labels[level], pct: Math.round(ratio * 100), slot: Math.round(slot * 10) / 10, kind: a.carb_budget };
}

/** 「당질 보통」 · 「간식 한 번 몫의 62%」 · 「간식 1회 몫(24.3g) 대비」 · 「하루 2,000kcal 기준입니다.」 */
export function carbBandText(cb: CarbBand, given?: CarbBudget) {
  const B = budgetOf()!; // carbBand 가 밴드를 냈으면 있다
  const b = given ?? B.guest;
  const c = B.copy;
  return {
    chip: fill(c.chip, { label: cb.label })!,
    reference: c.reference,
    share: fill(cb.kind === 'snack' ? c.share_snack : c.share_meal, { pct: cb.pct })!,
    basis: fill(cb.kind === 'snack' ? c.snack_basis : c.meal_basis, { g: cb.slot })!,
    guest: fill(c.guest_note, { energy: b.energy_kcal.toLocaleString('en-US') })!,
    limit: c.explain_limit,
  };
}

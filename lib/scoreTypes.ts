// 백엔드 Pydantic 계약(backend/app/schemas/catalog.py)과 1:1 손유지 타입.
// 웹엔 공유 타입 패키지가 없어 앱(app/src/api/types.ts)과 동일하게 수기 미러링한다.

export type Verdict = 'risk' | 'caution' | 'ok' | 'good';

/** GET /products/search 결과 카드(필요 필드만) */
export type ProductSummary = {
  id: string;
  name: string;
  sub: string;
  brand: string;
  score: number;
  verdict: Verdict;
  status: 'ready' | 'preparing';
  image_url?: string | null;
};

/** 영양 기본점수 성분 1개 */
export type ScoreExplainPart = {
  key: string;
  label: string;
  measured: string;
  points: number;
  kind: 'penalty' | 'credit';
  threshold_note: string;
};

export type NutritionBaseExplain = {
  parts: ScoreExplainPart[];
  n_total: number;
  p_total: number;
  nutri_raw: number;
  scale_lo: number;
  scale_hi: number;
  base100: number;
  base_formula: string;
  nutri_grade: string;
  beverage: boolean;
  protein_counted: boolean;
  protein_rule_note: string;
};

export type ConcernPenaltyItem = {
  tag: string;
  label: string;
  weight: number;
  high_severity: boolean;
};

export type PenaltyExplain = {
  concern_items: ConcernPenaltyItem[];
  concern_total: number;
  penalty_cap: number;
  penalty_cap_hit: boolean;
  additive_count: number;
  additive_names: string[];
  additive_penalty: number;
  penalty_total: number;
};

export type CapExplain = {
  flag: string;
  label: string;
  cap: number;
  note: string;
};

export type BloodSugarExplain = {
  level: string;
  gl: number;
  gi: number;
  avail_carb_100?: number | null;
  sugars_c?: number | null;
  starch_c?: number | null;
  serving?: number | null;
  fiber_missing: boolean;
  signals: string[];
};

/** GET /products/{id}/score-explain */
export type ScoreExplain = {
  id: string;
  name: string;
  brand: string;
  food_type: string;
  serving_amount?: number | null;
  basis: string;
  scored: boolean;
  reason: string;
  nutrition_base: NutritionBaseExplain | null;
  penalty: PenaltyExplain | null;
  caps: CapExplain[];
  base_minus_penalty: number;
  final: number;
  grade: string;
  grade_note: string;
  blood_sugar: BloodSugarExplain | null;
};

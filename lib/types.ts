// 백엔드 Pydantic 계약(backend/app/schemas/catalog.py)의 웹 미러 — 웹이 쓰는 필드만.
// 공유 타입 패키지가 없어 앱(app/src/api/types.ts)처럼 손으로 맞춘다. 계약이 바뀌면 여기도.

export type Verdict = 'risk' | 'caution' | 'ok' | 'good';
export type IngredientVerdict = Verdict | 'unknown';

/** 판정 축 1개. band 는 1~4 칸이거나 문자열 상태다(칸이 아니면 판정색을 쓰지 않는다). */
export type Axis = {
  band: number | 'unknown' | 'n/a' | 'unresolved' | 'amount';
  label: string;
  reason?: string | null;
  note?: string | null;
  carb_g?: number | null;
  carb_pct?: number | null;
  carb_rice_bowls?: number | null;
  sugars_g?: number | null;
  sugars_rice_bowls?: number | null;
  basis?: 'serving' | 'total_content' | null;
  caveats?: string[];
  additive_count?: number | null;
  ingredients_total?: number | null;
  ingredients_matched?: number | null;
  // 2026-11-04 — 문장 대신 코드(문구는 lib/content 가 web/data 로 만든다)
  reason_code?: string | null; // axes.json reason 키 · not_covered:<주어>
  missing_nutrients?: string[] | null;
  ingredients_undisclosed?: number | null;
  no_basis?: boolean | null;
  partial_basis?: boolean | null;
  sodium_sources?: string[] | null;
  cholesterol_sources?: string[] | null;
  energy_sources?: string[] | null;
  sugar_sources?: string[] | null;
  animal_sources?: string[] | null;
  sodium_type_median?: number | null;
  cholesterol_type_median?: number | null;
  energy_type_median?: number | null;
};

export type ProductAxes = {
  nutrition: Axis;
  glycemic: Axis;
  ingredient: Axis;
};

export type ProductSummary = {
  id: string;
  name: string;
  sub: string;
  brand: string;
  image_url?: string | null;
  status: 'ready' | 'preparing';
  axes?: ProductAxes | null;
};

export type SearchItem = ProductSummary & { metric?: string | null; metric_value?: number | null; metric_unit?: 'g' | 'ml' | null };
export type SearchSort = { key: string; dir?: 'asc' | 'desc' };
export type SearchResult = { query: string; mode: 'semantic' | 'name'; sort_label: string | null; sort?: SearchSort | null; items: SearchItem[] };

export type IngredientConcern = {
  type: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  note: string;
};

export type IngredientInfo = {
  summary: string;
  function: string;
  concerns: IngredientConcern[];
  sensitive_groups: string[];
  authorities: { body: string; assessment: string }[];
  advice: string;
};

export type IngredientKind = 'fvl' | 'function' | 'whole_food' | 'processed' | 'placeholder' | 'additive' | 'unmatched';

export type Ingredient = {
  key: string;
  kind?: IngredientKind | null;
  category?: string | null;
  concern_tags?: string[];
  primary_tag?: string | null;
  function_classes?: string[];
  gi?: string;
  name: string;
  tag: string;
  verdict: IngredientVerdict;
  plain: string;
  detail?: string;
  info?: IngredientInfo | null;
  percent?: number | null;
  found_in?: string | null;
  exempt?: string | null;
  instead?: string; // 「대신 이런 제품」 한 줄(서버)
};

export type NutritionPer100 = {
  unit: 'g' | 'ml';
  kcal?: number | null;
  carb?: number | null;
  sugar?: number | null;
  protein?: number | null;
  fat?: number | null;
  fiber?: number | null;
  available_carb?: number | null;
  rice_bowl_carb_g: number;
  caveats: string[];
};

export type Nutrition = {
  basis?: 'serving' | 'total_content' | 'per100' | null;
  kcal: number;
  sugar: number;
  carb: number;
  protein: number;
  fat: number;
  basis_label?: string | null;
  basis_g?: number | null;
  per100?: NutritionPer100 | null;
};

export type DailyValue = {
  basis: 'serving' | 'total_content';
  basis_g?: number | null;
  items: { nutrient: 'sodium' | 'sugars'; label: string; pct: number; over_daily: boolean; sentence: string }[];
  infant_basis: boolean;
};

export type ProcessedMeatNotice = {
  label: string;
  summary: string;
  detail: string;
  source: string;
};

export type ScorePart = {
  label: string; value: string; points: number; kind: 'penalty' | 'credit' | 'excluded'; note?: string;
  key?: string | null; note_code?: string | null; flags?: string[];
};

export type ProductDetail = ProductSummary & {
  note: string;
  score_detail?: { base_parts: ScorePart[]; base_note?: string; additive_names?: string[] } | null;
  nutrition: Nutrition;
  daily_value?: DailyValue | null;
  ingredients: Ingredient[];
  flagged: Ingredient[];
  processed_meat?: ProcessedMeatNotice | null;
};

export type Alternative = {
  id: string;
  name: string;
  brand: string;
  sub: string;
  reason: string;
  image_url?: string | null;
  axes?: ProductAxes | null;
  improves?: string[]; // /similar 에는 없다
  declines?: string[];
  tradeoff: string;
  kind: 'better' | 'lateral';
  similarity?: number; // 맛 프로필 유사도 0~1
  // 목적별 정렬 재료 — 100 g(mL)당 라벨 값(2026-11-03)
  per100_unit?: 'g' | 'ml' | null;
  kcal100?: number | null;
  sugars100?: number | null;
  sodium100?: number | null;
};

export type CollectionOption = { id: string; label: string; desc: string };

export type IngredientOfDay = { name: string; tag: string; verdict: IngredientVerdict; plain: string; key?: string };

export type IngredientDetail = Omit<Ingredient, 'found_in'> & {
  aliases: string[];
  found_in: ProductSummary[];
};

// 같은 종류와 견주면 — GET /products/{id}/peers(docs/product/프론트_핸드오프_같은종류위치_2026-11-02.md).
export type PeerAxis = {
  key: 'nutrition' | 'glycemic' | 'ingredient';
  status: 'ok' | 'silent';
  label: string;
  reason_code?: string | null;
  n: number; better: number; better_per100: number | null;
  band: 1 | 2 | 3 | 4 | null;
  dist: number[] | null;
  tier?: 'good' | 'middle' | 'weak' | null;
};
export type PeerKey = 'nutrition' | 'glycemic' | 'ingredient';
export type PeerSummary = { scope: 'peer' | 'self'; good: PeerKey[]; weak: PeerKey[]; middle: PeerKey[] };
export type PeerPosition = {
  status: 'ok' | 'silent';
  reason: string | null;
  reason_code?: string | null;
  title: string | null;
  group: string | null; group_basis: 'canon' | 'canon_parent' | 'food_type' | null;
  basis: string | null; as_of: string | null;
  headline: string | null; headline_note: string | null;
  n: number; better: number; worse: number; mixed: number;
  per100: { better: number; worse: number; mixed: number } | null;
  axes: PeerAxis[];
  rank?: number | null; rank_of?: number | null; top_pct?: number | null; // 비슷한 식품 중 순위(셋 다 나은 제품 수 + 1)
  summary?: PeerSummary | null; // 한줄 평 재료
};

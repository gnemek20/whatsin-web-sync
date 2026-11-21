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
  carb_budget?: 'snack' | 'meal' | null; // 2026-11-10 당질 참고 기준 — 간식 · 식사 몫(없으면 밴드를 보이지 않는다)
  // 2026-11-06 당알코올 내역(1회분 · 열량에서 역산한 제품만)
  carb_label_g?: number | null;
  polyol_g?: number | null;
  polyol_counted_g?: number | null;
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
// also — 함께 줄 세운 나머지 조건(「저당 고단백 과자」 · 2026-11-19). 있으면 문구는 서버 sort_label(「당류 낮고 단백질 높은 순」)을 쓴다.
export type SearchSort = { key: string; dir?: 'asc' | 'desc'; also?: { key: string; dir: 'asc' | 'desc' }[] };
// category — 검색어(표기를 바로잡은 뒤)가 분류어인가(「콜라」 · 「과자」 · 「쥬스」 → 주스 · 2026-11-19). 분류어면 이름 고정(namePin)을 하지 않는다.
// name_first — 정렬 질의에서 이름이 맞아 정렬 앞에 둔 카드 수(2026-11-21 · 「큰잔치」 → 게맛살 큰잔치 · 「펩시제로슈거」). 0 보다 크면 문구는 서버 sort_label(「이름이 맞는 제품 먼저, 나머지는 …」).
export type SearchResult = { query: string; mode: 'semantic' | 'name'; sort_label: string | null; sort?: SearchSort | null; category?: boolean; name_first?: number; items: SearchItem[] };

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
  // 상세를 avoid= 와 함께 부르면 서버가 붙인다(services/ingredient_view.py) — 내 피할 성분 키 중 이 성분에 걸린 것.
  avoided?: boolean;
  avoided_keys?: string[];
};

export type NutritionPer100 = {
  unit: 'g' | 'ml';
  kcal?: number | null;
  carb?: number | null;
  sugar?: number | null;
  protein?: number | null;
  fat?: number | null;
  fiber?: number | null;
  // 2026-11-18 — 라벨 나머지 칸(없으면 null)
  sodium?: number | null; // mg
  sat_fat?: number | null;
  trans_fat?: number | null;
  cholesterol?: number | null; // mg
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
  total_content?: number | null;
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
  // 쿠팡 파트너스 링크(2026-11-15 API · 약 1,800 제품만 · 대부분 null) — 있으면 상세에 「쿠팡에서 보기」(components/product/CoupangLink)
  coupang_partner_url?: string | null;
  score_detail?: { base_parts: ScorePart[]; base_note?: string; additive_names?: string[] } | null;
  nutrition: Nutrition;
  daily_value?: DailyValue | null;
  ingredients: Ingredient[];
  flagged: Ingredient[];
  processed_meat?: ProcessedMeatNotice | null;
  // 대체당 종류(2026-11-20 · 서버 한 함수 `services/sweeteners.py`) — 당알코올 polyol · 희소당 rare(알룰로스) · 고감미 intense.
  // null = 원재료 모름 · 칸 없음(undefined) = 옛 서버 → facts.sweetState 가 옛 규칙(당알코올 태그)으로 떨어진다.
  sweeteners?: { kinds: ('polyol' | 'rare' | 'intense')[]; unspecified: boolean } | null;
  // 하위 원재료(복합원료 속 · 괄호 속)의 피할 성분 걸림(2026-11-20) — `ingredients` 는 최상위만이라 facts.avoidCheck 가 둘을 합친다. found_in = 든 원재료.
  avoided_nested?: Ingredient[];
  barcode?: string | null;
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

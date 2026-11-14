// 내 기준(렌즈) — 온보딩에서 받은 관심사. 2026-11-13 웹 개편(docs/pmf-research/README.md 「맨 위는 내 기준에 걸리는 것」).
// 서버(쿠키 읽기)와 브라우저(온보딩 · 수정) 둘 다 쓰므로 순수 함수만 둔다.
//
// 지킬 선(pmf-research §3) — 관심사만 받는다. 검사 수치(공복혈당 · HbA1c)는 받지 않는다. 「먹어도 됩니다」 같은 허락 문장을 만들지 않는다.
// 저장은 이 브라우저의 쿠키 하나(wi_lens)뿐이다. 서버는 그 쿠키에서 피할 성분 키를 꺼내 제품 상세 API 의 avoid= 로 넘긴다
// (백엔드 services/ingredient_view.py 가 성분마다 avoided_keys 를 붙인다 — 매칭 규칙을 웹에 다시 만들지 않는다).

export type GoalId = 'glucose' | 'weight' | 'protein' | 'sodium' | 'additives' | 'kids';
export type Level = 'new' | 'some' | 'own';
export type NutrientKey = 'carb_net' | 'sugar' | 'kcal' | 'protein' | 'sodium' | 'fat' | 'carb' | 'fiber' | 'polyol';

/**
 * 피할 성분 하나. t: 'g' = 백엔드 묶음 키(당알코올 · 합성 색소 …) · 'i' = 성분 사전의 성분 키(그 성분 하나).
 * ks — 여러 성분 키를 한 항목으로 묶을 때(「당알코올, 에리스리톨 제외」). 있으면 k 대신 ks 를 API 에 보낸다(k 는 항목 이름표).
 */
export type AvoidItem = { k: string; l: string; t: 'g' | 'i'; ks?: string[] };

/** 이 항목이 API 에 보내고 맞춰 보는 키들. */
export const avoidKeys = (a: AvoidItem) => (a.ks && a.ks.length ? a.ks : [a.k]);

export type Lens = {
  v: 1;
  goals: GoalId[];
  level: Level;
  focus: NutrientKey[]; // 최대 3 · 고른 순서가 화면 순서
  avoid: AvoidItem[];
  at: number; // 동의 · 저장 시각
};

export const LENS_COOKIE = 'wi_lens';
export const MAX_FOCUS = 3;
export const MAX_GOALS = 2;
export const MAX_AVOID = 12;

export const GOALS: { id: GoalId; label: string; desc: string }[] = [
  { id: 'glucose', label: '혈당 관리', desc: '당질과 당류, 대체당을 먼저 봅니다' },
  { id: 'weight', label: '체중 관리', desc: '열량과 단백질을 먼저 봅니다' },
  { id: 'protein', label: '단백질 챙기기', desc: '한 번에 단백질이 얼마인지 봅니다' },
  { id: 'sodium', label: '짠 음식 줄이기', desc: '나트륨을 먼저 봅니다' },
  { id: 'additives', label: '첨가물 확인', desc: '피하고 싶은 성분이 있는지 봅니다' },
  { id: 'kids', label: '아이 먹거리', desc: '당류와 색소, 카페인을 봅니다' },
];

export const LEVELS: { id: Level; label: string; desc: string }[] = [
  { id: 'new', label: '이제 막 시작했어요', desc: '숫자마다 무엇인지 짧은 설명을 붙여 드립니다' },
  { id: 'some', label: '어느 정도 알아요', desc: '필요할 때만 설명을 보여 드립니다' },
  { id: 'own', label: '제 기준이 있어요', desc: '숫자만 간결하게 보여 드립니다' },
];

// 영양소 — daily 는 「식품등의 표시기준」 [별표 5] 1일 영양성분 기준치(web/data/nutrition/nutrients.json 과 같은 값).
// 당질 · 당알코올은 1일 기준치가 없다(공표 기준 없음) — 비율을 만들지 않는다.
export const NUTRIENTS: Record<NutrientKey, { label: string; unit: 'g' | 'mg' | 'kcal'; daily: number | null; desc: string; more?: boolean }> = {
  carb_net: { label: '당질', unit: 'g', daily: null, desc: '탄수화물에서 식이섬유를 뺀 양입니다. 혈당 관리에서 주로 봅니다.' },
  sugar: { label: '당류', unit: 'g', daily: 100, desc: '설탕, 과당처럼 단맛을 내는 당의 양입니다. 당알코올은 들어가지 않습니다.' },
  kcal: { label: '열량', unit: 'kcal', daily: 2000, desc: '다이어트에서 가장 먼저 보는 숫자입니다.' },
  protein: { label: '단백질', unit: 'g', daily: 55, desc: '근력과 포만감에 관심이 있다면 봅니다.' },
  sodium: { label: '나트륨', unit: 'mg', daily: 2000, desc: '짠맛의 양입니다. 라면, 소스류에 많습니다.' },
  fat: { label: '지방', unit: 'g', daily: 54, desc: '1g에 9kcal로 열량이 가장 큰 영양소입니다.' },
  carb: { label: '탄수화물', unit: 'g', daily: 324, desc: '당류, 전분, 식이섬유, 당알코올을 모두 합한 양입니다.', more: true },
  fiber: { label: '식이섬유', unit: 'g', daily: 25, desc: '표시 의무가 없어 적지 않은 제품이 많습니다.', more: true },
  polyol: { label: '당알코올', unit: 'g', daily: null, desc: '말티톨, 에리스리톨 같은 대체당입니다. 당류 표시에는 들어가지 않습니다.', more: true },
};
export const NUTRIENT_ORDER: NutrientKey[] = ['carb_net', 'sugar', 'kcal', 'protein', 'sodium', 'fat', 'carb', 'fiber', 'polyol'];

/** 목표별 기본 영양소(첫 목표가 앞) — 온보딩이 미리 골라 두고 사람이 바꾼다. */
export const GOAL_FOCUS: Record<GoalId, NutrientKey[]> = {
  glucose: ['carb_net', 'sugar', 'polyol'],
  weight: ['kcal', 'protein', 'sugar'],
  protein: ['protein', 'kcal', 'fat'],
  sodium: ['sodium', 'kcal', 'fat'],
  additives: ['sugar', 'sodium', 'kcal'],
  kids: ['sugar', 'sodium', 'kcal'],
};

// 피할 성분 — 2026-11-13 조사 근거로 다시 골랐다(사용자 「실제로 많이 언급되고 기피하는 성분 위주 · 말티톨이 안 잡혀 있으면 안 된다」).
// 근거 docs/pmf-research — 커뮤니티 인용 줄에서 센 언급: 말티톨 54 · 설탕 22 · 당알코올 18 · 감미료 16 · 알룰로스 10 · 에리스리톨 9 · 아질산 8 ·
// 카페인 4(네이버 자동완성 「제품명 + 카페인」 8) · 이소말트 3 · 카라기난 2 · 수크랄로스 2 · 소르비톨 2 · 색소 2. MSG · 팜유 · 액상과당 · 쇼트닝은 0.
//   알룰로스 · 에리스리톨은 「피하는」 쪽이 아니라 **골라 쓰는** 대체당으로 나온다(「OO톨로 끝나는 것만 피하면 됨(에리스리톨 제외)」 ·
//   「알룰로스 사려고 하는데」) — 그래서 「당알코올, 에리스리톨 제외」를 따로 둔다.
// 키는 백엔드와 **글자 그대로** 같아야 한다 — 묶음 키는 services/ingredient_view.py(_CONCERN_AVOIDKEYS · _CONCERN_GROUPKEYS · _GROUP_NAME_KEYWORDS),
// 성분 키는 사전 이름(/ingredients/search 로 확인 · 소르비톨의 키는 「소비톨」이다). 말티톨시럽은 사전에서 「말티톨」로 붙는다.
// 알레르기 식품군(밀 · 계란 · 대두 · 견과 · 갑각류)은 일부러 두지 않는다 — 라벨 알레르기 자료가 일부뿐이라 「걸러 주겠지」라는 믿음을 만들면
// 위험하다(OPEN_ISSUES ⓪-2 · 앱 personalize.ts 와 같은 판단).
export type AvoidPreset = AvoidItem & { hint: string; top: boolean };
export const AVOID_PRESETS: AvoidPreset[] = [
  // 조사에서 많이 나온 것(언급 순)
  { k: '말티톨', l: '말티톨', t: 'i', top: true, hint: '말티톨시럽 포함. 무설탕 캔디, 저당 과자에 흔합니다' },
  { k: 'polyol_gi', l: '당알코올 (에리스리톨 제외)', t: 'g', top: true, ks: ['말티톨', '소비톨', '이소말트', '폴리글리시톨', '락티톨'], hint: '말티톨, 소르비톨, 이소말트 등' },
  { k: '설탕', l: '설탕', t: 'i', top: true, hint: '백설탕 포함' },
  { k: 'sugar_alcohol', l: '당알코올 전체', t: 'g', top: true, hint: '에리스리톨 포함. 많이 먹으면 배탈이 날 수 있습니다' },
  { k: 'artificial', l: '인공 감미료', t: 'g', top: true, ks: ['수크랄로스', '아스파탐', '아세설팜칼륨', '사카린나트륨'], hint: '수크랄로스, 아스파탐, 아세설팜칼륨, 사카린' },
  { k: 'nitrite', l: '아질산나트륨', t: 'g', top: true, hint: '햄, 소시지, 명란젓 발색제' },
  { k: 'caffeine', l: '카페인', t: 'g', top: true, hint: '커피, 과라나 포함' },
  { k: '카라기난', l: '카라기난', t: 'i', top: true, hint: '젤리, 유제품, 분유의 증점제' },
  // 그 밖에(조사 언급은 적지만 일반적으로 고르는 것)
  { k: 'syncolor', l: '합성 색소', t: 'g', top: false, hint: '황색4호, 적색40호 등' },
  { k: 'hfcs', l: '액상과당', t: 'g', top: false, hint: '과당, 고과당 포함' },
  { k: 'sweetener', l: '감미료 전체', t: 'g', top: false, hint: '당알코올, 인공 감미료, 스테비아 등' },
  { k: 'msg', l: 'MSG', t: 'g', top: false, hint: '향미증진제' },
  { k: 'preservative', l: '보존료', t: 'g', top: false, hint: '안식향산, 소브산, 아황산 등' },
  { k: 'palm', l: '팜유', t: 'g', top: false, hint: '' },
  { k: 'shortening', l: '쇼트닝, 경화유', t: 'g', top: false, hint: '마가린 포함' },
  { k: 'phosphate', l: '인산염', t: 'g', top: false, hint: '' },
  { k: 'synflavor', l: '합성 착향료', t: 'g', top: false, hint: '' },
  { k: 'milk', l: '우유 성분', t: 'g', top: false, hint: '유당, 분유, 유청 등' },
  { k: 'phenylalanine', l: '아스파탐만', t: 'g', top: false, hint: '페닐알라닌 함유 표시 성분' },
];

export const GOAL_AVOID: Record<GoalId, string[]> = {
  glucose: ['말티톨', 'polyol_gi', '설탕'],
  weight: ['설탕', 'hfcs'],
  protein: [],
  sodium: [],
  additives: ['nitrite', 'syncolor', 'artificial', 'preservative'],
  kids: ['caffeine', 'syncolor', '카라기난'],
};

export function defaultFocus(goals: GoalId[]): NutrientKey[] {
  const out: NutrientKey[] = [];
  for (const g of goals) for (const n of GOAL_FOCUS[g]) if (!out.includes(n)) out.push(n);
  return (out.length ? out : (['kcal', 'sugar', 'sodium'] as NutrientKey[])).slice(0, MAX_FOCUS);
}

export function suggestedAvoid(goals: GoalId[]): string[] {
  const out: string[] = [];
  for (const g of goals) for (const k of GOAL_AVOID[g]) if (!out.includes(k)) out.push(k);
  return out;
}

const GOAL_IDS = new Set(GOALS.map((g) => g.id));
const NUT_IDS = new Set(NUTRIENT_ORDER);

/** 쿠키 값 → 렌즈. 모양이 다르면 null(온보딩을 다시 연다). */
export function parseLens(raw: string | null | undefined): Lens | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(decodeURIComponent(raw));
    if (!o || o.v !== 1) return null;
    const goals = (Array.isArray(o.goals) ? o.goals : []).filter((g: string) => GOAL_IDS.has(g as GoalId)).slice(0, MAX_GOALS);
    const focus = (Array.isArray(o.focus) ? o.focus : []).filter((n: string) => NUT_IDS.has(n as NutrientKey)).slice(0, MAX_FOCUS);
    const avoid = (Array.isArray(o.avoid) ? o.avoid : [])
      .filter((a: AvoidItem) => a && typeof a.k === 'string' && typeof a.l === 'string' && (a.t === 'g' || a.t === 'i'))
      .slice(0, MAX_AVOID)
      .map((a: AvoidItem) => {
        const ks = Array.isArray(a.ks) ? a.ks.filter((x) => typeof x === 'string').slice(0, 8).map((x) => x.slice(0, 40)) : [];
        return ks.length ? { k: a.k.slice(0, 40), l: a.l.slice(0, 40), t: a.t, ks } : { k: a.k.slice(0, 40), l: a.l.slice(0, 40), t: a.t };
      });
    const level: Level = o.level === 'new' || o.level === 'own' ? o.level : 'some';
    if (!focus.length) return null;
    return { v: 1, goals, level, focus, avoid, at: Number(o.at) || 0 };
  } catch {
    return null;
  }
}

export const serializeLens = (l: Lens) => encodeURIComponent(JSON.stringify(l));

/** 제품 상세 API 의 avoid= 값 — 렌즈가 없으면 빈 문자열. */
export const avoidParam = (l: Lens | null) => (l ? [...new Set(l.avoid.flatMap(avoidKeys))].join(',') : '');

/** 「당질, 당류, 당알코올」 — 사람이 읽는 영양소 목록(가운뎃점 대신 쉼표). */
export const focusText = (l: Lens) => l.focus.map((n) => NUTRIENTS[n].label).join(', ');

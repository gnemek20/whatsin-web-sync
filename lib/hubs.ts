// 분류 허브(2026-11-18 · 로컬 시험) — 「당류 낮은 아이스크림」처럼 사람들이 실제로 찾는 말 하나에 페이지 하나.
// 화면은 「조건으로 찾기」 결과 화면 그대로다(2026-11-18 사용자 「조건으로 찾기를 페이지화」) — 제목(허브 이름)으로 같은 검색을 돌리고, 머리와 끝 카드만 허브용.
// 그 제목으로 검색하면 이 주소로 온다(app/page.tsx). 열 말은 지금 손으로 고른 31개 — 뒤에 검색 기록에서 많이 찾은 조건 말로 넓힌다.
// 사람도 쓰는 페이지다(검색엔진 전용 · 숨은 페이지가 아니다 — 키워드만 모은 페이지는 구글 · 네이버 스팸 정책 위반).
// 뺀 것 — 김치 · 만두 나트륨(맨 앞이 1 mg/100 g 신고 오류) · 떡 순탄수(6 g/100 g 오류): 맨 앞이 자료 오류면 페이지가 틀린 말을 한다.
export type HubMetric = 'sugars' | 'c100' | 'protein' | 'sodium' | 'energy' | 'fat';
// tile — 그림 칸(FoodTile type · 식품유형 말) · cat — 제품 상세에서 「같은 종류 비교」로 이을 분류(FoodTile foodCat id)
export type Hub = { slug: string; title: string; q: string; by: HubMetric; order: 'asc' | 'desc'; group: string; tile: string; cat: string };

const TILE: Record<string, [string, string]> = {
  아이스크림: ['아이스크림', 'icecream'], 요거트: ['요거트', 'yogurt'], 그릭요거트: ['요거트', 'yogurt'], 두유: ['가공두유', 'soymilk'],
  시리얼: ['시리얼', 'grain'], 초콜릿: ['초콜릿', 'chocolate'], 젤리: ['젤리', 'candy'], 과자: ['과자', 'snack'], 빵: ['빵', 'bread'],
  '커피 음료': ['커피', 'coffee'], 잼: ['잼', 'jam'], 소스: ['소스', 'sauce'], 면: ['숙면', 'noodle'], 프로틴바: ['과자', 'snack'],
  닭가슴살: ['양념육', 'meat'], '단백질 음료': ['음료', 'drink'], 라면: ['라면', 'ramen'], 소시지: ['소시지', 'ham'], 햄: ['햄', 'ham'],
  즉석밥: ['즉석조리식품', 'meal'], '제로 음료': ['탄산음료', 'soda'], 도시락: ['도시락', 'meal'],
};
const h = (title: string, q: string, by: HubMetric, order: 'asc' | 'desc', group: string): Hub => {
  const [tile, cat] = TILE[q] ?? ['', 'other'];
  return { slug: title.replace(/\s+/g, '-'), title, q, by, order, group, tile, cat };
};

export const HUBS: Hub[] = [
  h('당류 낮은 아이스크림', '아이스크림', 'sugars', 'asc', '당류 낮은'),
  h('당류 낮은 요거트', '요거트', 'sugars', 'asc', '당류 낮은'),
  h('당류 낮은 그릭요거트', '그릭요거트', 'sugars', 'asc', '당류 낮은'),
  h('당류 낮은 두유', '두유', 'sugars', 'asc', '당류 낮은'),
  h('당류 낮은 시리얼', '시리얼', 'sugars', 'asc', '당류 낮은'),
  h('당류 낮은 초콜릿', '초콜릿', 'sugars', 'asc', '당류 낮은'),
  h('당류 낮은 젤리', '젤리', 'sugars', 'asc', '당류 낮은'),
  h('당류 낮은 과자', '과자', 'sugars', 'asc', '당류 낮은'),
  h('당류 낮은 빵', '빵', 'sugars', 'asc', '당류 낮은'),
  h('당류 낮은 커피 음료', '커피 음료', 'sugars', 'asc', '당류 낮은'),
  h('당류 낮은 잼', '잼', 'sugars', 'asc', '당류 낮은'),
  h('당류 낮은 소스', '소스', 'sugars', 'asc', '당류 낮은'),
  h('순탄수화물 낮은 과자', '과자', 'c100', 'asc', '순탄수화물 낮은'),
  h('순탄수화물 낮은 빵', '빵', 'c100', 'asc', '순탄수화물 낮은'),
  h('순탄수화물 낮은 아이스크림', '아이스크림', 'c100', 'asc', '순탄수화물 낮은'),
  h('순탄수화물 낮은 면', '면', 'c100', 'asc', '순탄수화물 낮은'),
  h('순탄수화물 낮은 시리얼', '시리얼', 'c100', 'asc', '순탄수화물 낮은'),
  h('단백질 많은 프로틴바', '프로틴바', 'protein', 'desc', '단백질 많은'),
  h('단백질 많은 닭가슴살', '닭가슴살', 'protein', 'desc', '단백질 많은'),
  h('단백질 많은 음료', '단백질 음료', 'protein', 'desc', '단백질 많은'),
  h('단백질 많은 과자', '과자', 'protein', 'desc', '단백질 많은'),
  h('단백질 많은 요거트', '요거트', 'protein', 'desc', '단백질 많은'),
  h('나트륨 적은 라면', '라면', 'sodium', 'asc', '나트륨 적은'),
  h('나트륨 적은 소시지', '소시지', 'sodium', 'asc', '나트륨 적은'),
  h('나트륨 적은 햄', '햄', 'sodium', 'asc', '나트륨 적은'),
  h('나트륨 적은 즉석밥', '즉석밥', 'sodium', 'asc', '나트륨 적은'),
  h('열량 낮은 음료', '제로 음료', 'energy', 'asc', '열량 낮은'),
  h('열량 낮은 아이스크림', '아이스크림', 'energy', 'asc', '열량 낮은'),
  h('열량 낮은 과자', '과자', 'energy', 'asc', '열량 낮은'),
  h('열량 낮은 도시락', '도시락', 'energy', 'asc', '열량 낮은'),
  h('지방 적은 과자', '과자', 'fat', 'asc', '지방 적은'),
];

export const hubBySlug = (slug: string) => HUBS.find((x) => x.slug === slug) ?? null;
const norm = (t: string) => t.replace(/\s+/g, '').toLowerCase();
/** 검색어가 허브 제목과 같으면(띄어쓰기 무시) 그 허브 — 검색이 같은 화면의 허브 주소로 보낸다. */
export const hubForQuery = (q: string) => HUBS.find((x) => norm(x.title) === norm(q)) ?? null;
/** 제품 상세의 「같은 종류 비교」 — 그 제품 분류(foodCat id)의 허브. */
export const hubsForCat = (cat: string) => HUBS.filter((x) => x.cat === cat);
/** 받침에 따라 조사 — 「아이스크림을」 · 「두유를」 */
export const josa = (w: string, withF: string, without: string) => {
  const c = w.trim().charCodeAt(w.trim().length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? withF : without;
};
/** 「100g당 당류 적은 순」 */
export const hubSub = (x: Hub) => `100g당 ${METRIC[x.by].name} ${x.order === 'desc' ? '많은' : '적은'} 순`;
export const hubHref = (x: Hub) => `/c/${encodeURIComponent(x.slug)}`;

/** 기준마다 이름 · 왜 보는지(사실만 · 판정하지 않는다). */
// ro · ga — 조사(「당류로 · 당류가」 / 「나트륨으로 · 나트륨이」)
export const METRIC: Record<HubMetric, { name: string; ro: string; ga: string; why: string }> = {
  sugars: { ro: '로', ga: '가', name: '당류', why: '당류는 설탕, 과당처럼 단맛을 내는 당의 양입니다. 하루 기준치는 100g이며, 당알코올과 감미료는 당류에 들어가지 않습니다.' },
  c100: { ro: '로', ga: '이', name: '순탄수화물', why: '순탄수화물은 탄수화물에서 식이섬유와 몸에 흡수되지 않는 대체당(당알코올, 알룰로스)을 뺀 양으로, 혈당을 올리는 쪽의 탄수화물입니다.' },
  protein: { ro: '로', ga: '이', name: '단백질', why: '단백질은 근육과 포만감에 관여합니다. 하루 기준치는 55g입니다.' },
  sodium: { ro: '으로', ga: '이', name: '나트륨', why: '나트륨은 소금의 주성분입니다. 하루 기준치는 2,000mg입니다.' },
  energy: { ro: '으로', ga: '이', name: '열량', why: '열량은 탄수화물, 단백질, 지방에서 오는 에너지의 합입니다. 하루 기준치는 2,000kcal입니다.' },
  fat: { ro: '으로', ga: '이', name: '지방', why: '지방은 1g에 9kcal로 열량이 가장 큰 영양소입니다. 하루 기준치는 54g입니다.' },
};

// 사이트 상수 — 링크는 한 곳에서만.
export const APP_STORE_URL =
  'https://apps.apple.com/kr/app/whats-in-%EC%99%80%EC%B8%A0%EC%9D%B8/id6794344998';

// Google Play — 등록 · 공개 전에는 링크를 내지 않는다(PLAY_LIVE). 설치 리퍼러에 utm 과 웹 기기 키(wid)를 실어 웹→앱 전환을 잇는다.
export const PLAY_PACKAGE = 'app.whatsin.mobile';
export const PLAY_LIVE = false;
export function playStoreUrl(r?: { wid?: string; utm_source?: string; utm_campaign?: string }): string {
  const base = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`;
  if (!r) return base;
  const ref = new URLSearchParams();
  ref.set('utm_source', r.utm_source || 'web');
  ref.set('utm_medium', 'web');
  if (r.utm_campaign) ref.set('utm_campaign', r.utm_campaign);
  if (r.wid) ref.set('wid', r.wid);
  return `${base}&referrer=${encodeURIComponent(ref.toString())}`;
}

// 법적 고지 원본은 백엔드가 서빙한다(backend/app/api/routers/ops.py · /legal/terms · /legal/privacy).
export const TERMS_URL = 'https://api.whatsin.kr/legal/terms';
export const PRIVACY_URL = 'https://api.whatsin.kr/legal/privacy';

// 첫 화면 「바로 열어 보기」 — 실제 사진이 있는 익숙한 제품(2026-11-16 운영 API 로 사진 · 판독 확인). 못 받으면 그 칸만 빠진다.
export const LANDING_PICKS = [
  'fc0c927f-21a6-4fed-9075-cc1fd8d29a03', // 코카-콜라
  '2e60373f-4805-45fc-81f4-42e36db1edfc', // 새우깡
  '23106f3f-7f6d-4ea4-b742-99e9956f1a76', // 신라면
  '759ba1ca-2f35-4de2-923c-363242a414b0', // 빙그레 바나나맛 우유
  '04ab3819-80e9-40e3-9f0d-da17779436cb', // 포카칩 오리지널
  '22dc1a8a-2965-4010-b279-52bf71f2577f', // 코카·콜라 제로
  '50a1c76d-e17c-45c2-94f3-c415a4f5f881', // 홈런볼초코
  'e6af8ccd-125c-4239-8a75-f35cfc1ad37d', // 매일두유 오리지널
];

// 검색창 아래 예시어 — 실제로 결과가 나오는 말만.
export const SAMPLE_QUERIES = ['새우깡', '제로', '닭가슴살', '두유', '라면'];

// 검색 첫 화면의 「이렇게 찾습니다」 — 이름 검색과 조건 검색(뜻 검색 · 영양 수식어는 우리 숫자로 줄 세운다)을 같이 보인다.
// 2026-11-03 운영 /products/search/v2 로 전부 결과가 나오는 것을 확인했다(조건 넷은 sort_label 이 붙는다).
export const SEARCH_EXAMPLES: { q: string; hint: string }[] = [
  { q: '당이 낮은 아이스크림', hint: '당류 낮은 순' },
  { q: '단백질 많은 과자', hint: '단백질 높은 순' },
  { q: '나트륨 적은 라면', hint: '나트륨 낮은 순' },
  { q: '저칼로리 음료', hint: '열량 낮은 순' },
  { q: '제로 콜라', hint: '비슷한 제품' },
  { q: '새우깡', hint: '제품 이름' },
];

// 검색창 추천 검색어(2026-11-16) — 내 기준의 「먼저 볼 숫자」마다 그 숫자로 줄 세우는 질의 하나. 운영 /products/search/v2 로 결과를 확인한 것만
// (당질 · 지방 · 탄수화물은 sort_label 이 붙는다 · 식이섬유는 붙지 않지만 시리얼 결과가 나온다 · 당알코올은 맞는 질의가 없어 뺐다).
export const LENS_QUERIES: Partial<Record<string, { q: string; hint: string }>> = {
  carb_net: { q: '순탄수 낮은 과자', hint: '순탄수화물 낮은 순' },
  sugar: { q: '당이 낮은 아이스크림', hint: '당류 낮은 순' },
  kcal: { q: '저칼로리 음료', hint: '열량 낮은 순' },
  protein: { q: '단백질 많은 과자', hint: '단백질 높은 순' },
  sodium: { q: '나트륨 적은 라면', hint: '나트륨 낮은 순' },
  fat: { q: '지방 적은 과자', hint: '지방 낮은 순' },
  carb: { q: '탄수화물 적은 빵', hint: '순탄수화물 낮은 순' },
  fiber: { q: '식이섬유 많은 시리얼', hint: '식이섬유' },
};

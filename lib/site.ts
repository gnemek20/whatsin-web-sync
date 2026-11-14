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

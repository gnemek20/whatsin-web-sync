// 검색엔진(2026-11-18 사용자 「제품 이름으로 검색하면 우리 상세가 나오게 · Google Search Console · Naver Search Advisor 등록」).
// 정식 주소는 www(whatsin.kr 는 Caddy 가 www 로 301). 사이트맵 색인 /sitemap.xml → /sitemaps/static.xml · /sitemaps/products-<n>.xml.
export const SITE_URL = 'https://www.whatsin.kr';

// 소유 확인 — 콘솔이 주는 「HTML 태그」 값의 content 만 넣는다(공개 값이다 · 페이지 <head> 에 그대로 나간다).
// Google 은 도메인 속성(DNS TXT · Cloudflare)으로 확인하면 여기는 비워도 된다. 네이버 서치어드바이저는 이 태그나 HTML 파일.
export const SITE_VERIFICATION = {
  google: '',
  naver: '1f4334cd54ee33fd33329cd1ccb5b0ccfb0fc927',
};

/** 사이트맵 한 파일의 제품 수(규격 상한 50,000 · API 기본과 같다). */
export const SITEMAP_PRODUCTS_PER_FILE = 40000;

export const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// API 주소 — 서버(lib/api)와 브라우저(검색 미리보기 · 신고 · 평가 · 수집) 둘 다 쓴다. lib/api 는 서버 전용이라
// 브라우저 코드는 이 파일만 import 한다(lib/api 를 끌고 오면 응답 정리 · 문구 사전이 클라이언트 번들에 들어간다).
// 로컬 백엔드에 붙이려면 web/.env.local 에 NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 · 없으면 운영 API.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.whatsin.kr/api/v1';

// 브라우저 코드가 쓰는 API 주소 — 개발에서 운영 API 를 붙일 때만 같은 주소의 중계(app/api/proxy)를 거친다(CORS).
export const CLIENT_API = process.env.NEXT_PUBLIC_API_PROXY === '1' ? '/api/proxy' : API_BASE;

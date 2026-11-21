// 서버 전용 설정(2026-11-04). 화면 데이터 CDN — Cloudflare R2 버킷 whatsin-data 의 공개 주소(infra/cdn/env.json 과 같은 값).
// 주소를 바꾸면 이 기본값과 infra/cdn/env.json · 앱 src/format/remote.ts 를 같이 바꾼다(2026-11-10 정식 도메인 data.whatsin.kr). `off` 면 빌드에 든 web/data 만 쓴다.
import 'server-only';

const DEFAULT_DATA_URL = 'https://data.whatsin.kr';
const raw = (process.env.WHATSIN_DATA_URL ?? DEFAULT_DATA_URL).trim();
export const DATA_URL: string | null = raw === '' || raw === 'off' ? null : raw.replace(/\/$/, '');

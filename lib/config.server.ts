// 서버 전용 설정(2026-11-04). 화면 데이터 CDN — Cloudflare R2 버킷 whatsin-data 의 공개 주소(infra/cdn/env.json 과 같은 값).
// 운영용 사용자 도메인이 생기면 이 기본값과 infra/cdn/env.json 을 같이 바꾼다. `off` 면 빌드에 든 web/data 만 쓴다.
import 'server-only';

const DEFAULT_DATA_URL = 'https://whatsin-data.surhomme.ai';
const raw = (process.env.WHATSIN_DATA_URL ?? DEFAULT_DATA_URL).trim();
export const DATA_URL: string | null = raw === '' || raw === 'off' ? null : raw.replace(/\/$/, '');

// 첫 화면 「바로 열어 보기」(2026-11-17 사용자) — 최근 사람들이 관심이 많았던 제품, **실제로 검색해서 연 횟수가 많은 순**.
//   운영 /products/popular(최근 30일 · 검색으로 연 제품 빈도)에서 MIN_VIEWS 번 이상 열린 것만 쓴다 — 한두 번은 「관심」이 아니다.
//   모자란 칸은 **유명 제로 제품**으로 채운다(출시 초기에는 거의 전부 이것 · 사진이 있는 것만 · 2026-11-17 운영 API 로 확인).
import { getPopular, getProduct } from './api';
import type { ProductSummary } from './types';

const SLOTS = 8;
const MIN_VIEWS = 3;

/** 많이 마시고 먹는 제로 제품 — 앞에서부터 채운다(못 받은 것은 건너뛴다). */
export const ZERO_PICKS = [
  '22dc1a8a-2965-4010-b279-52bf71f2577f', // 코카·콜라 제로
  '632e794e-faf5-4eab-8332-fc6099a85110', // 펩시 제로슈거 라임향
  '32b99634-d116-43ee-a935-3954f91431a4', // 칠성사이다 제로
  '1091d419-0750-4c7c-9fbc-0b1ccce3131c', // 밀키스 제로
  '5cfc304d-e470-4438-9b8f-3b1f083ce7d7', // 몬스터 에너지 울트라
  '46a61cfb-62dd-44cc-bdcf-4122c16ed42a', // 제로 아이스 쿠키&크림
  '21c94fcb-4ae1-4903-8d40-2aaabc265120', // 웰치 제로 그레이프맛
  '76763b02-6ea6-40a3-8a2e-5b47f15caff3', // 토레타! 제로
  'f3356f0a-b00b-4529-9efc-8ede0a8a7325', // 스프라이트 제로
  'dc4a4fc5-3d12-4497-9327-dc23afc223d8', // 환타 제로 오렌지
  'c6d8cec6-b4c4-4e22-b798-c26ab6d27285', // 탐스 제로 오렌지향
  '0ae9b418-f2a9-4293-8ba7-37162eb84de5', // 닥터 페퍼 제로
];

export async function homePicks(): Promise<ProductSummary[]> {
  const pop = await getPopular(SLOTS, MIN_VIEWS);
  const hot = (pop.ok ? pop.data : []).filter((p) => p.image_url).slice(0, SLOTS);
  if (hot.length >= SLOTS) return hot;
  const seen = new Set(hot.map((p) => p.id));
  const need = ZERO_PICKS.filter((id) => !seen.has(id));
  const rs = await Promise.all(need.map((id) => getProduct(id)));
  const zero = rs.flatMap((r) => (r.ok && r.data.image_url ? [r.data as ProductSummary] : []));
  return [...hot, ...zero].slice(0, SLOTS);
}

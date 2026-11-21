// 제품 상세 중계 — 상세 화면의 「비교」 창이 고른 제품을 받는다. 내 기준(쿠키)의 피할 성분을 서버가 붙여 받는다(avoided_keys).
import { getProductFor } from '@/lib/api';
import { avoidParam } from '@/lib/lens';
import { readLens } from '@/lib/lens.server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const r = await getProductFor(params.id, avoidParam(readLens()));
  return r.ok ? Response.json(r.data) : Response.json(null, { status: r.status || 502 });
}

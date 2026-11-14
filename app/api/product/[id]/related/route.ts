// 비교할 후보 — 다른 선택(맛이 비슷하고 더 나은 것) + 비슷한 상품. 이름 · 제조사 · 식품유형만.
import { getAlternatives, getSimilar } from '@/lib/api';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const [a, s] = await Promise.all([getAlternatives(params.id), getSimilar(params.id)]);
  const seen = new Set<string>([params.id]);
  const pick = (xs: { id: string; name: string; brand: string; sub: string; image_url?: string | null }[], from: string) =>
    xs.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))).map((x) => ({ id: x.id, name: x.name, brand: x.brand, sub: x.sub, image_url: x.image_url ?? null, from }));
  return Response.json([...pick(a.ok ? a.data : [], '다른 선택'), ...pick(s.ok ? s.data : [], '비슷한 상품')].slice(0, 12));
}

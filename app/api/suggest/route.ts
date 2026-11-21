// 제품 이름 미리보기 중계 — 검색창 · 비교에 더하기 · 커뮤니티 글에 제품 붙이기가 쓴다.
import { API_BASE } from '@/lib/config';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim().slice(0, 60) ?? '';
  if (!q) return Response.json([]);
  try {
    const r = await fetch(`${API_BASE}/products/suggest?q=${encodeURIComponent(q)}`, { next: { revalidate: 300 } });
    if (!r.ok) return Response.json([], { status: 502 });
    const xs = (await r.json()) as { id: string; name: string; brand?: string; sub?: string }[];
    return Response.json(xs.slice(0, 8).map((x) => ({ id: x.id, name: x.name, brand: x.brand ?? '', sub: x.sub ?? '' })));
  } catch {
    return Response.json([], { status: 502 });
  }
}

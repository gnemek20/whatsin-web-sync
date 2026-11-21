// 성분 사전 검색 중계 — 온보딩 「피할 성분」 · 성분 사전 탭이 쓴다. 브라우저가 API 를 직접 부르면 CORS 가 필요해 이 서버를 거친다.
import { API_BASE } from '@/lib/config';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim().slice(0, 40) ?? '';
  if (!q) return Response.json([]);
  try {
    const r = await fetch(`${API_BASE}/ingredients/search?q=${encodeURIComponent(q)}`, { next: { revalidate: 3600 } });
    if (!r.ok) return Response.json([], { status: 502 });
    const xs = (await r.json()) as { key: string; name: string; tag?: string; verdict?: string; plain?: string }[];
    return Response.json(xs.slice(0, 20).map((x) => ({ key: x.key, name: x.name, tag: x.tag ?? '', verdict: x.verdict ?? null, plain: x.plain ?? '' })));
  } catch {
    return Response.json([], { status: 502 });
  }
}

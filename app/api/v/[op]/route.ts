// 방문 집계 중계 — 브라우저(lib/visit.ts) → 이 서버 → API /visits/*. 접속 IP · 브라우저 정보를 붙여 넘긴다(브라우저가 API 를 직접 부르면 CORS 가 필요하다).
import { API_BASE } from '@/lib/config';

const OPS = new Set(['ping', 'app-click', 'install']);

export async function POST(req: Request, { params }: { params: { op: string } }) {
  const { op } = params;
  if (!OPS.has(op)) return new Response(null, { status: 404 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
  try {
    await fetch(`${API_BASE}/visits/${op}`, {
      method: 'POST',
      // Caddy 는 들어온 x-forwarded-for 를 믿지 않고 Vercel IP 로 바꾼다 — 브라우저 IP 는 따로 싣는다(API visits._ip).
      headers: { 'content-type': 'application/json', 'x-wi-client-ip': ip, 'user-agent': req.headers.get('user-agent') ?? '' },
      body: await req.text(),
      cache: 'no-store',
    });
  } catch {}
  return new Response(null, { status: 204 });
}

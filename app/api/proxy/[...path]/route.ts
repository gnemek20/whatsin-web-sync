// 개발용 API 중계(2026-11-14) — 로컬 웹(localhost)에서 운영 API 를 쓸 때 브라우저 요청이 CORS 에 막힌다.
// NEXT_PUBLIC_API_PROXY=1 이면 브라우저 코드(lib/config CLIENT_API)가 이 주소로 보내고, 여기서 운영 API 로 넘긴다.
// 운영(whatsin.kr)은 쓰지 않는다 — 브라우저가 API 를 바로 부르는 편이 한 번 덜 거친다.
import { API_BASE } from '@/lib/config';

export const dynamic = 'force-dynamic';

async function pass(req: Request, path: string[]) {
  const src = new URL(req.url);
  const url = `${API_BASE}/${path.map(encodeURIComponent).join('/')}${src.search}`;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const init: RequestInit = {
    method: req.method,
    headers: {
      'content-type': req.headers.get('content-type') ?? 'application/json',
      'user-agent': req.headers.get('user-agent') ?? '',
      ...(ip ? { 'x-wi-client-ip': ip } : {}),
      ...(req.headers.get('authorization') ? { authorization: req.headers.get('authorization')! } : {}),
    },
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer(),
    cache: 'no-store',
  };
  try {
    const r = await fetch(url, init);
    return new Response(r.body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' } });
  } catch {
    return Response.json({ detail: '연결이 불안정합니다. 다시 시도' }, { status: 502 });
  }
}

export const GET = (req: Request, { params }: { params: { path: string[] } }) => pass(req, params.path);
export const POST = (req: Request, { params }: { params: { path: string[] } }) => pass(req, params.path);
export const PUT = (req: Request, { params }: { params: { path: string[] } }) => pass(req, params.path);
export const DELETE = (req: Request, { params }: { params: { path: string[] } }) => pass(req, params.path);

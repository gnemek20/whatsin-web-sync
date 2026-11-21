// 유입 링크 — whatsin.kr/r/<코드>(2026-11-18 사용자 「ref 기능 · 링크 수정하게」).
// 커뮤니티 글에는 이 짧은 주소를 건다. 여기서 도착 페이지(admin 「유입 링크」에서 고친다)를 묻고 `?ref=<코드>` 를 붙여 보낸다 —
// 그 방문의 유입 경로가 코드가 된다(lib/visit source() → 백엔드 resolve_source 는 utm 다음으로 ref). 글을 다시 고치지 않고 도착지만 바꿀 수 있다.
// 302 라 브라우저는 원래 리퍼러(디시 글 주소)를 도착 페이지에 그대로 넘긴다. API 가 늦거나 죽어도 첫 화면으로 보내 링크가 죽지 않는다.
import { NextResponse, type NextRequest } from 'next/server';
import { API_BASE } from '@/lib/config';

export const dynamic = 'force-dynamic';

const CODE = /^[a-z0-9][a-z0-9-]{1,39}$/;
// 도착 페이지는 우리 사이트 안 경로만(백엔드 ref_target_ok 와 같은 규칙 — 여기서 한 번 더 막는다)
const safe = (t: unknown): t is string => typeof t === 'string' && t.startsWith('/') && !t.startsWith('//') && !t.includes('\\') && t.length <= 300;

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code || '').toLowerCase();
  let target = '/';
  if (CODE.test(code)) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 2000);
      const res = await fetch(`${API_BASE}/visits/ref/${encodeURIComponent(code)}`, { signal: ctl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (res.ok) {
        const j = await res.json();
        if (safe(j?.target)) target = j.target;
      }
    } catch {
      /* 첫 화면으로 */
    }
  }
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'www.whatsin.kr';
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const url = new URL(target, `${proto}://${host}`);
  if (CODE.test(code) && !url.searchParams.has('utm_source')) url.searchParams.set('ref', code);
  return NextResponse.redirect(url, 302);
}

// 서버에서 내 기준 읽기 — 쿠키 wi_lens. 쿠키를 읽는 페이지는 요청마다 그린다(사람마다 맨 위가 다르다).
import 'server-only';
import { cookies } from 'next/headers';
import { LENS_COOKIE, parseLens, type Lens } from './lens';

export function readLens(): Lens | null {
  return parseLens(cookies().get(LENS_COOKIE)?.value);
}

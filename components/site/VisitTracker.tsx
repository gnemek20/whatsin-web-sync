'use client';
// 방문 · 이용 기록(lib/visit.ts) — 페이지가 열릴 때 그날 첫 방문을, 검색 결과 · 제품 페이지면 그날 첫 이용을 보낸다.
// 행동 기록(lib/track.ts · 2026-11-17) — 페이지마다 page_view, 그리고 문서 전체에서 data-ev 가 달린 것을 누르면 한 줄.
//   (검색 · 제품 보기 · 대안 봄은 그 화면이 직접 보낸다 — 찾은 말 · 결과 수 · 제품 이름을 아는 곳이 거기라서.)
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { trackActive, trackVisit } from '@/lib/visit';
import { track, trackClick } from '@/lib/track';

export function VisitTracker() {
  const path = usePathname();
  const q = useSearchParams();
  useEffect(() => {
    trackVisit();
    if (path.startsWith('/p/') || path.startsWith('/i/')) trackActive('product_view');
    else if ((path === '/' || path.startsWith('/search')) && q.get('q')) trackActive('search');
    track({ name: 'page_view', props: q.get('q') ? { q: q.get('q') } : undefined });
  }, [path, q]);
  useEffect(() => {
    // 누르기 — 캡처 단계에서 잡는다(링크가 이동해도 sendBeacon 으로 남는다)
    const on = (e: MouseEvent) => {
      if (e.button !== 0) return;
      trackClick(e.target);
    };
    document.addEventListener('click', on, true);
    return () => document.removeEventListener('click', on, true);
  }, []);
  return null;
}

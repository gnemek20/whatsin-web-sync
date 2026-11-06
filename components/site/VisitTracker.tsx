'use client';
// 방문 · 이용 기록(lib/visit.ts) — 페이지가 열릴 때 그날 첫 방문을, 검색 결과 · 제품 페이지면 그날 첫 이용을 보낸다.
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { trackActive, trackVisit } from '@/lib/visit';

export function VisitTracker() {
  const path = usePathname();
  const q = useSearchParams();
  useEffect(() => {
    trackVisit();
    if (path.startsWith('/p/') || path.startsWith('/i/')) trackActive('product_view');
    else if (path.startsWith('/search') && q.get('q')) trackActive('search');
  }, [path, q]);
  return null;
}

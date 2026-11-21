'use client';
// 사이트 머리 · 바닥 · 방문 집계를 감싼다 — 수집 페이지(/collect)처럼 따로 노는 경로에서는 그리지 않는다.
import { usePathname } from 'next/navigation';

const BARE = ['/collect'];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? '';
  if (BARE.some((p) => path === p || path.startsWith(p + '/'))) return null;
  return <>{children}</>;
}

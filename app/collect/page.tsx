// 바코드 원정대 — 주소로만 들어오는 수집 페이지(사이트 어디에도 잇지 않는다 · 검색엔진에 싣지 않는다 · 2026-11-03 사용자).
// 사이트 머리 · 바닥 · 방문 집계는 이 경로에서 빠진다(components/site/SiteChrome) — 친구들의 접속이 커뮤니티 유입 집계에 섞이지 않게.
import type { Metadata, Viewport } from 'next';
import { Collect } from './Collect';

export const metadata: Metadata = {
  title: '바코드 원정대',
  description: '와츠인 제품 사진 수집',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function Page() {
  return <Collect />;
}

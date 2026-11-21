import type { IconName } from '../ui/Icon';

export type Tab = { href: string; label: string; icon: IconName; match: string[] };

// 탭 다섯(2026-11-17 사용자 넷 + 11-19 건의함) — 홈(검색 · 결과 · 제품 화면) · 기록(브라우저 방문 기록처럼 본 제품 · 찾은 말) · 커뮤니티 · 성분 사전.
export const TABS: Tab[] = [
  { href: '/', label: '홈', icon: 'home', match: ['/', '/search', '/p/'] },
  { href: '/history', label: '기록', icon: 'clock', match: ['/history'] },
  { href: '/community', label: '커뮤니티', icon: 'community', match: ['/community'] },
  { href: '/i', label: '성분 사전', icon: 'book', match: ['/i'] },
  // 2026-11-19 사용자 「헤더 성분 사전 오른쪽으로 건의함」 — 모바일 아래 탭 막대도 같은 목록이라 다섯째 칸으로 붙는다.
  { href: '/suggestions', label: '건의함', icon: 'inbox', match: ['/suggestions'] },
];

export function isActive(path: string, t: Tab): boolean {
  return t.match.some((m) => (m === '/' ? path === '/' : m.endsWith('/') ? path.startsWith(m) : path === m || path.startsWith(m + '/') || path.startsWith(m + '?')));
}

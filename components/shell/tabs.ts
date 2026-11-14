import type { IconName } from '../ui/Icon';

export type Tab = { href: string; label: string; icon: IconName; match: string[] };

// 탭 셋 — 검색(처음 화면 포함) · 커뮤니티 · 성분 사전(비교는 제품 화면 안에서 연다).
export const TABS: Tab[] = [
  { href: '/search', label: '검색', icon: 'search', match: ['/', '/search', '/p/'] },
  { href: '/community', label: '커뮤니티', icon: 'community', match: ['/community'] },
  { href: '/i', label: '성분 사전', icon: 'book', match: ['/i'] },
];

export function isActive(path: string, t: Tab): boolean {
  return t.match.some((m) => (m === '/' ? path === '/' : m.endsWith('/') ? path.startsWith(m) : path === m || path.startsWith(m + '/') || path.startsWith(m + '?')));
}

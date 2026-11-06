// 이 기기 기록 — 최근 본 제품 · 최근 검색어(localStorage). 앱 data/recents · SearchScreen 최근 검색과 같은 뜻: 로그인 무관, 실제로 본 것만.
// 서버로 보내지 않는다. 저장소를 못 쓰는 브라우저(시크릿 · 막힘)에서는 조용히 비어 있다.
import type { ProductSummary } from './types';

const VIEWS = 'wi_recent_views';
const QUERIES = 'wi_recent_q';
const EVENT = 'wi-recents';
const MAX_VIEWS = 12;
const MAX_QUERIES = 8;

export type RecentView = Pick<ProductSummary, 'id' | 'name' | 'brand' | 'sub' | 'image_url' | 'status' | 'axes'> & { ts: number };

function read<T>(key: string): T[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(key: string, v: unknown[]) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export const recentViews = () => read<RecentView>(VIEWS).filter((x) => x && typeof x.id === 'string');
export const recentQueries = () => read<string>(QUERIES).filter((x) => typeof x === 'string' && x.trim());

export function recordView(p: ProductSummary) {
  const item: RecentView = { id: p.id, name: p.name, brand: p.brand, sub: p.sub, image_url: p.image_url ?? null, status: p.status, axes: p.axes ?? null, ts: Date.now() };
  write(VIEWS, [item, ...recentViews().filter((x) => x.id !== p.id)].slice(0, MAX_VIEWS));
}

export function recordQuery(q: string) {
  const t = q.trim();
  if (!t) return;
  write(QUERIES, [t, ...recentQueries().filter((x) => x !== t)].slice(0, MAX_QUERIES));
}

export function removeQuery(q: string) {
  write(QUERIES, recentQueries().filter((x) => x !== q));
}

export function clearViews() {
  write(VIEWS, []);
}

export function onRecents(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

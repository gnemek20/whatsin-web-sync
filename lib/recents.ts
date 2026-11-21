// 이 기기 기록 — 최근 본 제품 · 최근 검색어(localStorage). 앱 data/recents · SearchScreen 최근 검색과 같은 뜻: 로그인 무관, 실제로 본 것만.
// 서버로 보내지 않는다. 저장소를 못 쓰는 브라우저(시크릿 · 막힘)에서는 조용히 비어 있다.
import type { ProductSummary } from './types';

const VIEWS = 'wi_recent_views';
const QUERIES = 'wi_recent_q';
const EVENT = 'wi-recents';
// 「기록」 탭(2026-11-17)이 날짜별로 보여 준다 — 넉넉히 둔다(검색창 · 비교는 앞에서 몇 개만 쓴다).
const MAX_VIEWS = 100;
const MAX_QUERIES = 50;
/** 찾은 말의 시각 — 옛 기록(문자열 목록)과 따로 둔다(옛 판 앱 · 웹이 같은 키를 읽는다). */
const QUERY_TIMES = 'wi_recent_q_ts';

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

function queryTimes(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(QUERY_TIMES) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
function writeTimes(m: Record<string, number>) {
  try {
    localStorage.setItem(QUERY_TIMES, JSON.stringify(m));
  } catch {}
}

/** 찾은 말과 그 시각(모르면 0 — 옛 기록) */
export const recentQueryLog = (): { q: string; ts: number }[] => {
  const m = queryTimes();
  return recentQueries().map((q) => ({ q, ts: Number(m[q]) || 0 }));
};

export function recordQuery(q: string) {
  const t = q.trim();
  if (!t) return;
  const list = [t, ...recentQueries().filter((x) => x !== t)].slice(0, MAX_QUERIES);
  const m = queryTimes();
  m[t] = Date.now();
  writeTimes(Object.fromEntries(list.map((x) => [x, m[x] ?? 0])));
  write(QUERIES, list);
}

export function removeQuery(q: string) {
  write(QUERIES, recentQueries().filter((x) => x !== q));
}

export function removeView(id: string) {
  write(VIEWS, recentViews().filter((x) => x.id !== id));
}

export function clearViews() {
  write(VIEWS, []);
}

export function clearQueries() {
  writeTimes({});
  write(QUERIES, []);
}

export function onRecents(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

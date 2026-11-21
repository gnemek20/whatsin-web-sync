// 행동 기록(2026-11-17 사용자 「진짜 말 그대로의 Analytics」) — 검색 · 결과 누름 · 제품 보기 · 대안 봄/누름 …를 한 번마다 보낸다.
//   서버 정본: backend/app/db/visits.py(web_events · EVENTS 에 없는 이름은 버린다) · 집계 admin 「행동」 탭.
//   하루 첫 방문 · 첫 이용(lib/visit.ts)과 같은 기기 키 · 같은 유입 경로(세션 첫 페이지)를 쓴다 — 경로별로 가를 수 있게.
//   모았다가 한 번에 보낸다(1.5초 · 탭을 떠날 때 sendBeacon). 실패해도 화면은 아무 일 없다.
//   누름은 대개 data-ev 속성으로 단다(components/site/VisitTracker 가 문서 전체에서 한 번에 잡는다 — 서버 컴포넌트도 그대로 둘 수 있다).
import { deviceKey, source } from './visit';

export type EventName =
  | 'page_view' | 'search' | 'search_more' | 'result_click' | 'result_page' | 'result_sort'
  | 'product_view' | 'alt_view' | 'alt_click' | 'alt_tab' | 'similar_click' | 'compare_open'
  | 'pick_click' | 'ask_click' | 'history_click' | 'lens_open' | 'lens_done' | 'report_open' | 'app_click' | 'coupang_click' | 'photo_open' | 'photo_send';

export type Ev = {
  name: EventName;
  path?: string;
  product_id?: string;
  target_id?: string;
  q?: string;
  pos?: number;
  tab?: string;
  props?: Record<string, string | number | boolean | null>;
};

const SESSION_KEY = 'wi_sid';
const FLUSH_MS = 1500;
let queue: Ev[] = [];
let timer = 0;
let hooked = false;

function sessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = 's' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return '';
  }
}

async function flush(beacon = false) {
  window.clearTimeout(timer);
  timer = 0;
  if (!queue.length) return;
  const events = queue.splice(0, 60);
  const s = source();
  const body = JSON.stringify({
    platform: 'web',
    device_key: await deviceKey(),
    session_id: sessionId() || undefined,
    utm_source: s.utm_source,
    utm_campaign: s.utm_campaign,
    ref: s.ref,
    referrer: s.referrer,
    events,
  });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon('/api/v/events', new Blob([body], { type: 'application/json' }))) {
      if (queue.length) void flush(beacon);
      return;
    }
  } catch {}
  fetch('/api/v/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  if (queue.length) void flush(beacon);
}

// 같은 행동이 1초 안에 두 번이면 한 번(개발 모드의 effect 두 번 실행 · 두 번 누름이 수치를 부풀리지 않게)
const recent = new Map<string, number>();

export function track(ev: Ev) {
  if (typeof window === 'undefined') return;
  const sig = [ev.name, ev.product_id, ev.target_id, ev.q, ev.pos, ev.tab, location.pathname + location.search].join('|');
  const now = Date.now();
  if ((recent.get(sig) ?? 0) > now - 1000) return;
  recent.set(sig, now);
  if (recent.size > 200) recent.clear();
  queue.push({ path: location.pathname, ...ev });
  if (!hooked) {
    hooked = true;
    // 탭을 떠나거나 숨기면 남은 것을 바로 보낸다
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && void flush(true));
    window.addEventListener('pagehide', () => void flush(true));
  }
  if (queue.length >= 20) void flush();
  else if (!timer) timer = window.setTimeout(() => void flush(), FLUSH_MS);
}

/** data-ev 가 달린 요소를 누르면 보낸다 — data-pid(제품) · data-tid(대상) · data-pos(몇 번째 · 없으면 가장 가까운 [data-i]+1) · data-tab · data-q */
export function trackClick(target: EventTarget | null) {
  const el = (target as Element | null)?.closest?.('[data-ev]') as HTMLElement | null;
  if (!el) return;
  const d = el.dataset;
  const name = d.ev as EventName;
  const cell = el.closest('[data-i]') as HTMLElement | null;
  const pos = d.pos != null ? Number(d.pos) : cell?.dataset.i != null ? Number(cell.dataset.i) + 1 : undefined;
  track({
    name,
    product_id: d.pid || undefined,
    target_id: d.tid || undefined,
    q: d.q || new URLSearchParams(location.search).get('q') || undefined,
    pos: Number.isFinite(pos) ? pos : undefined,
    tab: d.tab || undefined,
  });
}

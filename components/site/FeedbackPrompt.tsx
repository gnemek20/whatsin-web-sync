'use client';
// 서비스 별점 · 의견 창(2026-11-03 사용자). 서버 정본 backend/app/db/feedback.py · 조회 admin 「평가」.
//   PC     — 어느 페이지든 들어오고 2초 뒤 왼쪽 아래 카드로 서서히 나타난다(마스크 없음).
//   모바일 — 앱 별점처럼, 검색을 한 번 하고 제품을 한 번 연 뒤 모달로 뜬다. **마스크를 눌러도 닫히지 않는다**(X · 「접속 중 보지 않기」 · 보내기만).
// X · 「접속 중 보지 않기」 = **이번 접속 동안만** — 페이지 메모리에만 기억해서 화면을 옮기거나 탭을 바꿔도 안 뜨고, 새로고침해 새로 불러오면 다시 뜬다
// (2026-11-03 사용자 「sessionStorage 느낌이지만 새로고침하면 다시」 — 그래서 저장소에 쓰지 않는다). 보내면 30일 동안 다시 묻지 않는다(localStorage).
// 수집 페이지(/collect)에는 없다 — SiteChrome 안에서만 그린다.
import { usePathname, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

// 창 본체는 뜰 때 받는다 — 2초(PC) · 사용 뒤(모바일) 기다리는 동안 미리 받아 두어 뜨는 순간 늦지 않다.
const loadCard = () => import('./FeedbackCard');
const FeedbackCard = dynamic(loadCard, { ssr: false });

let snoozed = false;                // 접속 중 보지 않기 · X — 모듈 메모리(새로고침하면 사라진다)
const DONE = 'wi_fb_done';         // localStorage — 보낸 날(ms)
const USAGE = 'wi_fb_usage';       // sessionStorage — 모바일 사용 흔적 {s: 검색 수, v: 제품 본 수}
const DONE_DAYS = 30;

function blocked(): boolean {
  try {
    if (snoozed) return true;
    const d = Number(localStorage.getItem(DONE) || 0);
    if (d && Date.now() - d < DONE_DAYS * 864e5) return true;
  } catch {}
  return false;
}

export function FeedbackPrompt() {
  const path = usePathname() ?? '';
  const q = useSearchParams().get('q');
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const closedRef = useRef(false); // X 로 닫으면 이 접속(새로고침 전)에는 다시 열지 않는다
  const trigger = useRef<'pc_timer' | 'mobile_usage'>('pc_timer');

  // PC — 처음 들어오고 2초 뒤
  useEffect(() => {
    const m = matchMedia('(max-width: 1023px), (pointer: coarse)').matches;
    setMobile(m);
    if (m || blocked()) return;
    trigger.current = 'pc_timer';
    void loadCard();
    const t = window.setTimeout(() => !closedRef.current && !blocked() && setOpen(true), 2000);
    return () => window.clearTimeout(t);
  }, []);

  // 모바일 — 검색 한 번 + 제품 한 번 본 뒤(화면을 옮길 때마다 센다)
  useEffect(() => {
    if (!mobile || closedRef.current || blocked()) return;
    let u = { s: 0, v: 0 };
    try { u = { ...u, ...JSON.parse(sessionStorage.getItem(USAGE) || '{}') }; } catch {}
    if (path === '/search' && q) u.s += 1;
    if (path.startsWith('/p/')) u.v += 1;
    try { sessionStorage.setItem(USAGE, JSON.stringify(u)); } catch {}
    if (u.s >= 1 && u.v >= 1) {
      trigger.current = 'mobile_usage';
      void loadCard();
      const t = window.setTimeout(() => !closedRef.current && !blocked() && setOpen(true), 2500);
      return () => window.clearTimeout(t);
    }
  }, [mobile, path, q]);

  const close = useCallback(() => { snoozed = true; closedRef.current = true; setOpen(false); }, []);

  if (!open) return null;
  return <FeedbackCard mobile={mobile} trigger={trigger.current} onClose={close} />;
}

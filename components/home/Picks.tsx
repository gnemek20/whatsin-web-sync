'use client';
// 바로 열어 보기 카드 줄(2026-11-17).
//   PC — 네 칸(넓으면 여덟 칸) 그대로.
//   모바일 — 가로 스크롤 대신 가운데 카드가 살짝 큰 회전판(Wheel · 아래). 끝 다음에는 처음이 온다.
//     손으로 밀면 한 칸씩 넘어가고, 손을 떼고 잠시 뒤 다시 돈다.
// 조건으로 찾기 카드(AskLink) — 누르면 바로 「찾는 중」(뜻 검색이라 결과가 몇백 ms 뒤에 온다 · 사용자 2026-11-17 「로딩을 알 수 있게」).
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FoodTile, foodKind, type FoodKind } from '../FoodTile';
import { Icon } from '../Icon';
import s from './landing.module.css';

export type PickCard = { id: string; name: string; image_url?: string | null; sub?: string | null; fact: string };

// 모바일 회전판(2026-11-17 사용자 「중앙이 살짝 크고 · 하나씩 훨씬 빠르게 · 처음부터 중앙에 하나」).
//   스크롤이 아니라 transform 으로 한 칸씩 끊어 넘긴다. 세 벌을 이어 붙이고 가운데 벌의 첫 카드에서 시작 —
//   넘겨서 셋째 벌에 들어가면(또는 첫째 벌로 돌아가면) 애니메이션 없이 같은 그림의 가운데 벌로 돌아간다.
//   위치는 CSS 변수 --i 하나라 서버 그림부터 가운데에 선다(첫 화면이 밀리지 않는다).
const STEP_MS = 1500;   // 옛 2.6초 흘러가기 → 1.5초마다 한 칸
const IDLE_MS = 2500;   // 손을 떼고 이만큼 뒤 다시 돈다
const SWIPE_PX = 28;

function Card({ p, hidden }: { p: PickCard; hidden?: boolean }) {
  return (
    <Link href={`/p/${p.id}`} className={s.pick} tabIndex={hidden ? -1 : undefined} draggable={false} data-ev="pick_click" data-tid={p.id}>
      <span className={s.pickImg}>
        <FoodTile src={p.image_url} type={p.sub} size={104} />
      </span>
      <span className={s.pickText}>
        <span className={s.pickName}>{p.name}</span>
        <span className={s.pickFact}>{p.fact}</span>
      </span>
    </Link>
  );
}

export function Picks({ items }: { items: PickCard[] }) {
  return (
    <>
      <ul className={s.picks}>
        {items.map((p) => (
          <li key={p.id}>
            <Card p={p} />
          </li>
        ))}
      </ul>
      {items.length > 1 ? <Wheel items={items} /> : null}
    </>
  );
}

function Wheel({ items }: { items: PickCard[] }) {
  const n = items.length;
  const [i, setI] = useState(n);          // 가운데 벌의 첫 카드
  const [jump, setJump] = useState(false); // 같은 그림으로 몰래 돌아가는 한 프레임
  const [drag, setDrag] = useState(0);
  const held = useRef(false);
  const idle = useRef(0);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  // 돌기 — 화면에 보일 때만(PC 에서는 이 판이 숨어 있다)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 759px)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setInterval(() => {
      if (!mq.matches || reduce || held.current || document.hidden) return;
      setI((x) => x + 1);
    }, STEP_MS);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(idle.current);
    };
  }, []);

  // 첫째 · 셋째 벌에 들어가면 가운데 벌로
  const settle = () => {
    if (i >= 2 * n || i < n) {
      setJump(true);
      setI((x) => (x >= 2 * n ? x - n : x < n ? x + n : x));
    }
  };
  useEffect(() => {
    if (!jump) return;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setJump(false)));
    return () => cancelAnimationFrame(r);
  }, [jump]);

  const hold = () => {
    held.current = true;
    window.clearTimeout(idle.current);
  };
  const release = () => {
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => (held.current = false), IDLE_MS);
  };

  const list = [...items, ...items, ...items];
  return (
    <div
      className={`${s.wheel} ${jump ? s.wheelJump : ''} ${drag ? s.wheelDrag : ''}`}
      style={{ ['--i' as string]: i, ['--drag' as string]: `${drag}px` } as CSSProperties}
      onPointerDown={(e) => {
        hold();
        start.current = { x: e.clientX, y: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        const st = start.current;
        if (!st) return;
        const dx = e.clientX - st.x;
        if (!st.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - st.y)) st.moved = true;
        if (st.moved) setDrag(dx);
      }}
      onPointerUp={() => {
        const st = start.current;
        start.current = null;
        if (st?.moved) {
          if (drag <= -SWIPE_PX) setI((x) => x + 1);
          else if (drag >= SWIPE_PX) setI((x) => x - 1);
        }
        setDrag(0);
        release();
      }}
      onPointerCancel={() => {
        start.current = null;
        setDrag(0);
        release();
      }}
      onClickCapture={(e) => {
        // 밀다가 놓은 것은 누른 것이 아니다
        if (drag) e.preventDefault();
      }}
    >
      <ul className={s.wheelTrack} onTransitionEnd={(e) => e.target === e.currentTarget && settle()}>
        {list.map((p, k) => {
          const on = k === i;
          const own = k >= n && k < 2 * n; // 가운데 벌만 읽어 준다
          return (
            <li key={`${k}`} className={on ? s.wheelOn : undefined} aria-hidden={!own || undefined}>
              <Card p={p} hidden={!own} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// type · sub(2026-11-18 분류 허브) — 식품유형 말이면 그 분류 그림 · 이름 아래 한 줄(「100g당 당류 적은 순」)
export function AskLink({ href, kind, type, sub, children }: { href: string; kind?: FoodKind; type?: string; sub?: string; children: ReactNode }) {
  const k: FoodKind = type ? foodKind(type) : kind ?? 'other';
  const [busy, setBusy] = useState(false);
  return (
    <Link
      href={href}
      data-ev="ask_click"
      className={`${s.ask} ${busy ? s.askBusy : ''}`}
      aria-busy={busy || undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        setBusy(true);
      }}
      style={{ ['--ask-bg' as string]: `var(--tile-${k}-bg)`, ['--ask-ink' as string]: `var(--tile-${k}-ink)` } as CSSProperties}
    >
      {type ? <FoodTile type={type} size={56} /> : <FoodTile kind={k} size={56} />}
      <span className={s.askText}>
        <span className={s.askQ}>{children}</span>
        {busy ? <span className={s.askWait}>찾는 중</span> : sub ? <span className={s.askSub}>{sub}</span> : null}
      </span>
      <span className={s.askGo} aria-hidden>
        {busy ? <span className={s.spin} /> : <Icon name="next" size={18} />}
      </span>
    </Link>
  );
}

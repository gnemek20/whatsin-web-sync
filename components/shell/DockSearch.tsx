'use client';
// 모바일 아래 검색창(2026-11-17 사용자 「기록에서도 검색 input 은 하단에 · 제품 상세에서는 스크롤할 때 잠깐 사라졌다가 완전히 멈추면 다시」).
//   첫 화면(Landing .dock)과 같은 자리 · 같은 모양 — 탭 막대 바로 위에 떠 있다. 누르면 전체 화면 시트(SearchBox dock).
//   autoHide — 스크롤하는 동안 아래로 내려가 숨고, 스크롤이 멈추고 잠시 뒤 다시 올라온다.
//   이 화면들에서는 머리 바의 모바일 검색 줄을 숨긴다(site/HeaderSearch DOCKED) — 같은 상자가 둘 보이지 않게. PC 는 머리 검색 그대로.
import { useEffect, useRef, useState } from 'react';
import { SearchBox } from '../SearchBox';
import s from './dock.module.css';

const SETTLE_MS = 280;

export function DockSearch({ autoHide = false, spacer = false }: { autoHide?: boolean; spacer?: boolean }) {
  const [away, setAway] = useState(false);
  const [hand, setHand] = useState<{ q: string } | null>(null); // 검색창을 눌러 넘어왔을 때 이어받을 검색어
  const box = useRef<HTMLDivElement>(null);
  const wantFocus = useRef<string | null>(null); // 초점을 줄 검색어(바뀐 key 의 새 입력칸이 그려진 뒤에 준다)

  // 검색창을 눌러 넘어온 기록 화면(?focus=1&q=) — 같은 검색창이 초점을 이어받고 임시 입력칸을 치운다. 주소는 깨끗하게(/history).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('focus') !== '1') return;
    wantFocus.current = sp.get('q') ?? '';
    setHand({ q: wantFocus.current });
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  const q = hand?.q ?? '';
  useEffect(() => {
    if (wantFocus.current == null || !hand) return;
    wantFocus.current = null;
    const input = box.current?.querySelector('input');
    input?.focus({ preventScroll: true });
    if (input && q) input.setSelectionRange(q.length, q.length);
    document.querySelectorAll('[data-search-proxy]').forEach((el) => el.remove());
  }, [hand, q]);
  // 혹시 남은 임시 입력칸은 떠날 때 치운다
  useEffect(() => () => document.querySelectorAll('[data-search-proxy]').forEach((el) => el.remove()), []);

  useEffect(() => {
    if (!autoHide) return;
    let t = 0;
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 2) return;
      last = y;
      setAway(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setAway(false), SETTLE_MS);
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      window.removeEventListener('scroll', on);
      window.clearTimeout(t);
    };
  }, [autoHide]);

  return (
    <>
      {/* 한 화면에 맞춘 화면(기록)은 떠 있는 검색창 높이만큼 안에서 비운다(모바일만) · 길게 내려가는 화면은 바닥글이 비운다 */}
      {spacer ? <div className={s.spacer} aria-hidden /> : null}
      <div ref={box} className={`search-host ${s.dock} ${away ? s.away : ''}`}>
        <SearchBox key={hand ? `h|${q}` : 'base'} dock size="md" defaultValue={q} engagedInit={!!hand} placeholder="제품 이름, 원하는 조건" />
      </div>
    </>
  );
}

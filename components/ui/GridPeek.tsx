'use client';
// 여러 항목을 칩으로 늘어놓지 않고 보여 주는 칸(2026-11-18 사용자 「라벨을 늘어놓는 방법 절대 쓰지 말 것 · 3열 미리보기 · 많으면 자체 팝 박스」).
//   미리보기 = 3열 격자 칸(칸마다 아이콘 · 이름 · 한 줄 보조). 넘치면 마지막 칸이 「+N 전체 보기」 → 팝 박스(PC 가운데 카드 · 모바일 아래 시트)에 전부.
//   팝 박스는 body 로 띄운다(부모의 overflow · transform 에 갇히지 않게). Esc · 바깥 누르기 · 닫기로 닫힌다.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '../Icon';
import s from './gridPeek.module.css';

export type PeekItem = { key: string; title: string; sub?: string; long?: string; tone?: 'hit' | 'ok' | 'warn' | 'plain'; icon?: IconName };

function Cell({ it, full = false }: { it: PeekItem; full?: boolean }) {
  return (
    <div className={`${s.cell} ${it.tone ? s[it.tone] : ''} ${full ? s.cellFull : ''}`} title={full ? undefined : [it.title, it.long ?? it.sub].filter(Boolean).join('\n')}>
      {it.icon ? <span className={s.icon} aria-hidden><Icon name={it.icon} size={16} strokeWidth={2.2} /></span> : null}
      <span className={s.text}>
        <span className={s.title}>{it.title}</span>
        {full && it.long ? <span className={s.long}>{it.long}</span> : it.sub ? <span className={s.sub}>{it.sub}</span> : null}
      </span>
    </div>
  );
}

export function GridPeek({ items, preview = 3, popTitle, className }: { items: PeekItem[]; preview?: number; popTitle: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const over = items.length > preview;
  const shown = over ? items.slice(0, preview - 1) : items;
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open]);
  return (
    <>
      <div className={`${s.grid} ${className ?? ''}`}>
        {shown.map((it) => <Cell key={it.key} it={it} />)}
        {over ? (
          <button type="button" className={`${s.cell} ${s.more}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
            <span className={s.text}>
              <span className={s.title}>+{items.length - shown.length}개</span>
              <span className={s.sub}>전체 보기</span>
            </span>
            <Icon name="next" size={14} className={s.moreChev} />
          </button>
        ) : null}
      </div>
      {open
        ? createPortal(
            <div className={s.scrim} onClick={() => setOpen(false)}>
              <div className={s.pop} role="dialog" aria-modal="true" aria-label={popTitle} onClick={(e) => e.stopPropagation()}>
                <div className={s.popHead}>
                  <h2 className={s.popTitle}>{popTitle}</h2>
                  <span className={s.popN}>{items.length}개</span>
                  <button type="button" className={s.close} onClick={() => setOpen(false)} aria-label="닫기"><Icon name="close" size={18} /></button>
                </div>
                <div className={`scroll-y ${s.popBody}`}>
                  {items.map((it) => <Cell key={it.key} it={it} full />)}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

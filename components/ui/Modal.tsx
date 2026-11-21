'use client';
// 자체 팝 박스(2026-11-18) — PC 가운데 카드 · 모바일 아래 시트. GridPeek 의 팝 박스와 같은 모양을 다른 화면(원재료 · 영양성분 전체)도 쓰게 꺼냈다.
// Esc · 바깥 누르면 닫힌다. 열려 있는 동안 뒤 페이지가 스크롤되지 않는다.
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import s from './modal.module.css';

export function Modal({ open, onClose, title, meta, children }: { open: boolean; onClose: () => void; title: string; meta?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className={s.scrim} onClick={onClose}>
      <div className={s.pop} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <h2 className={s.title}>{title}</h2>
          {meta ? <span className={s.meta}>{meta}</span> : null}
          <button type="button" className={s.close} onClick={onClose} aria-label="닫기"><Icon name="close" size={18} /></button>
        </div>
        <div className={`scroll-y ${s.body}`}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

'use client';
// 세 축 — 위 타일 세 칸(한눈 요약) + 고른 칸의 근거 패널 하나(2026-11-14 사용자 「너무 길고 방대해서 한 눈에 안 들어와」).
// 타일과 패널은 서버가 그려 넘기고(ReactNode), 여기서는 어느 패널을 보일지만 바꾼다 — 누르는 즉시 바뀐다(INP).
// 패널은 전부 그려 두고 hidden 으로 가린다(다시 불러오지 않는다).
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from './axisTabs.module.css';

export type AxisTab = { key: string; tile: ReactNode; panel: ReactNode };

export function AxisTabs({ tabs, initial }: { tabs: AxisTab[]; initial: number }) {
  const [sel, setSel] = useState(initial);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (sel + d + tabs.length) % tabs.length;
    setSel(n);
    refs.current[n]?.focus();
  };
  return (
    <div className={`card ${styles.board}`}>
      <div className={styles.tiles} role="tablist" aria-label="세 가지 판정" onKeyDown={onKey}>
        {tabs.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={`axt-${t.key}`}
            aria-selected={i === sel}
            aria-controls={`axp-${t.key}`}
            tabIndex={i === sel ? 0 : -1}
            className={`${styles.tile} ${i === sel ? styles.tileOn : ''}`}
            onClick={() => setSel(i)}
          >
            {t.tile}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.key} role="tabpanel" id={`axp-${t.key}`} aria-labelledby={`axt-${t.key}`} hidden={i !== sel} className={styles.panel}>
          {t.panel}
        </div>
      ))}
    </div>
  );
}

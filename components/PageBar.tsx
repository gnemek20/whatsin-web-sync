// 화면 맨 위 줄 — 이전(왼쪽) + 그 화면의 행동(오른쪽 · 공유 등). 모든 화면이 같은 자리 · 같은 모양(2026-11-06 사용자).
// 색 면(제품 틴트 · 잉크 · 브랜드) 안에 넣지 않고 그 위 바탕에 둔다.
import type { ReactNode } from 'react';
import { BackButton } from './BackButton';
import styles from './PageBar.module.css';

export function PageBar({ fallback = '/search', children, className }: { fallback?: string; children?: ReactNode; className?: string }) {
  return (
    <nav className={`${styles.bar} ${className ?? ''}`} aria-label="화면 이동">
      <BackButton fallback={fallback} />
      {children ? <div className={styles.actions}>{children}</div> : null}
    </nav>
  );
}

export const pillClass = styles.pill;

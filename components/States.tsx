// 빈 상태와 실패 상태 — 둘을 섞지 않는다(「없다」와 「못 불러왔다」는 다른 말이다).
// 실패는 「다시 시도」로 끝난다 — 빈 화면을 남기지 않는다(§8).
import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './States.module.css';
import { Rich } from './Rich';

export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className={styles.box}>
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true" className={styles.art}>
        <rect x="18" y="14" width="44" height="58" rx="10" stroke="currentColor" strokeWidth="2" />
        <path d="M28 30h24M28 40h18M28 50h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="58" cy="56" r="12" fill="var(--bg)" stroke="var(--brand)" strokeWidth="2.5" />
        <path d="m67 65 8 8" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <h2 className="t-display">{title}</h2>
      {body ? <p className="t-body c-t2"><Rich text={body} /></p> : null}
      {children}
    </div>
  );
}

export function ErrorState({ title, body, retryHref }: { title: string; body: string; retryHref: string }) {
  return (
    <div className={styles.box}>
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true" className={styles.art}>
        <path d="M16 52a20 20 0 0 1 8-39 24 24 0 0 1 44 6 16 16 0 0 1-4 33" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M38 50l12 12M50 50 38 62" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <h2 className="t-display">{title}</h2>
      <p className="t-body c-t2"><Rich text={body} /></p>
      <Link href={retryHref} className={styles.retry} prefetch={false}>
        다시 시도
      </Link>
    </div>
  );
}

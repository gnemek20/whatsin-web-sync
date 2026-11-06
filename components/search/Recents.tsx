'use client';
// 최근 검색 · 최근 본 제품 — 이 기기 기록(lib/recents). 앱 SearchScreen 「최근 검색」 · 홈 「최근 본 제품」과 같은 자리.
// 서버 렌더에는 없고(기기마다 다르다) 붙은 뒤 그린다 — 기록이 없으면 섹션째 그리지 않는다(빈 자리를 남기지 않는다).
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProductList } from '../ProductRow';
import { Icon } from '../Icon';
import { clearViews, onRecents, recentQueries, recentViews, recordQuery, recordView, removeQuery, type RecentView } from '@/lib/recents';
import type { ProductSummary } from '@/lib/types';
import styles from './search.module.css';

function useRecents() {
  const [state, set] = useState<{ views: RecentView[]; queries: string[] } | null>(null);
  useEffect(() => {
    const load = () => set({ views: recentViews(), queries: recentQueries() });
    load();
    return onRecents(load);
  }, []);
  return state;
}

export function RecentQueries() {
  const r = useRecents();
  if (!r || r.queries.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="recent-q">
      <h2 id="recent-q" className={`t-headline ${styles.sectionTitle}`}>최근 검색</h2>
      <ul className={styles.card}>
        {r.queries.map((q) => (
          <li key={q} className={styles.qRow}>
            <Link href={`/search?q=${encodeURIComponent(q)}`} className={styles.qLink}>
              <Icon name="clock" size={20} className="c-t3" />
              <span className={`t-body ${styles.ellipsis}`}>{q}</span>
            </Link>
            <button type="button" className={styles.qRemove} onClick={() => removeQuery(q)} aria-label={`${q} 지우기`}>
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecentViews({ max = 5 }: { max?: number }) {
  const r = useRecents();
  if (!r || r.views.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="recent-v">
      <div className={styles.sectionHead}>
        <h2 id="recent-v" className="t-headline">최근 본 제품</h2>
        <button type="button" className={`t-caption ${styles.textBtn}`} onClick={clearViews}>지우기</button>
      </div>
      <ProductList items={r.views.slice(0, max)} />
    </section>
  );
}

/** 제품 화면에 붙인다 — 본 제품을 이 기기 기록에 남긴다. */
export function RecordView({ p }: { p: ProductSummary }) {
  useEffect(() => {
    recordView(p);
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** 검색 결과 화면에 붙인다 — 링크로 들어온 검색어(예시 · 공유 주소)도 최근 검색에 남긴다. */
export function RecordQuery({ q }: { q: string }) {
  useEffect(() => {
    recordQuery(q);
  }, [q]);
  return null;
}

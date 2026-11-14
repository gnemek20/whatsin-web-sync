'use client';
// 검색 결과 · 둘러보기 정렬(2026-11-14) — 소비자가 세우는 기준(대안 「다른 선택」과 같은 말)으로 알약 탭을 고르면 **순서만** 바꾼다.
// 제품 줄은 서버가 한 번 그려 넘기고(ReactNode), 기준마다의 정렬 값과 바닥 한 줄도 미리 받는다 — 누르는 즉시 바뀐다(INP).
// 바닥 한 줄은 줄마다 기준별로 미리 그려 두고 목록의 data-sort 로 하나만 보인다(카드 높이가 그대로 · ProductRow notes).
// 주소는 history.replaceState 로 조용히 맞춘다(새로고침 · 공유해도 같은 정렬). 순위 숫자는 CSS 카운터라 순서를 따라온다.
import { Fragment, useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { SortId, SortOpt } from '@/lib/sort';
import rowStyles from '../ProductRow.module.css';
import styles from './search.module.css';

/** 기준별 정렬 값 — 작을수록 앞(null 은 맨 뒤). lens 는 [피할 성분 들어 있음 0/1, 첫 영양소 값]. */
export type SortKeys = { rel: number; lensHit: number; lens: number | null; diet: number | null; glucose: number; additive: number; nutrition: number };
export type SortRow = { id: string; node: ReactNode; keys: SortKeys };

export function SortableResults({
  rows,
  options,
  initialSort,
  lensDesc = false,
  rankedByDefault,
  serverSorted = null,
  serverChips = [],
  foot,
}: {
  rows: SortRow[];
  options: SortOpt[];
  initialSort: SortId;
  lensDesc?: boolean;
  rankedByDefault: boolean;
  /** 서버가 이 칩 기준으로 세워 보낸 목록이면 그 칩(순서를 다시 세우지 않는다 · 「내 기준」은 피할 성분 든 것만 뒤로) */
  serverSorted?: SortId | null;
  /** 서버가 세울 수 있는 칩 — 누르면 서버에 다시 묻는다(검색어가 정한 집합 전체를 그 값으로 · 2026-11-14) */
  serverChips?: SortId[];
  foot?: ReactNode;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortId>(options.some((o) => o.id === initialSort) ? initialSort : '');
  // 서버에 다시 묻는 동안 — 고른 칩만 먼저 켜고 목록은 새 목록이 올 때까지 그대로(옛 60개를 브라우저가 세운 순서를 잠깐이라도 보이지 않게)
  const [want, setWant] = useState<SortId | null>(null);
  const [pending, startTransition] = useTransition();
  const opt = options.find((o) => o.id === sort) ?? options[0];

  const shown = useMemo(() => {
    if (!sort) return rows;
    if (sort === serverSorted) {
      // 서버 순서 그대로 — 「내 기준」만 피할 성분이 든 제품을 뒤로(서버는 피할 성분을 모른다 · 안정 정렬이라 서버 순서가 남는다)
      return sort === 'lens' ? [...rows].sort((a, b) => a.keys.lensHit - b.keys.lensHit) : rows;
    }
    const cmpNum = (a: number | null, b: number | null, desc = false) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return desc ? b - a : a - b;
    };
    return [...rows].sort((a, b) => {
      const x = a.keys, y = b.keys;
      const c =
        sort === 'lens' ? x.lensHit - y.lensHit || cmpNum(x.lens, y.lens, lensDesc)
          : sort === 'diet' ? cmpNum(x.diet, y.diet)
            : x[sort] - y[sort];
      return c || x.rel - y.rel;
    });
  }, [rows, sort, lensDesc, serverSorted]);

  const pick = (id: SortId) => {
    const u = new URL(window.location.href);
    if (id) u.searchParams.set('sort', id);
    else u.searchParams.delete('sort');
    u.searchParams.delete('by');
    // 서버가 세우는 칩으로 가거나, 지금 목록이 서버가 칩으로 세운 것이면(다른 기준은 관련도 목록에서 세워야 한다) 서버에 다시 묻는다
    if (serverChips.includes(id) || serverSorted) {
      setWant(id);
      startTransition(() => router.replace(u.pathname + u.search, { scroll: false }));
      return;
    }
    setSort(id);
    window.history.replaceState(window.history.state, '', u.toString());
  };

  return (
    <>
      <div className={styles.sortChips} role="tablist" aria-label="어떤 기준으로 볼까요">
        {options.map((o) => (
          <button key={o.id || 'rel'} type="button" role="tab" aria-selected={o.id === (want ?? sort)} className={`${styles.sortChip} ${o.id === (want ?? sort) ? styles.sortChipOn : ''}`} onClick={() => pick(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      <p className={`t-caption c-t3 ${styles.sortSub}`}>{`${rows.length}개 중 ${opt.sub}`}</p>
      <ul className={`${rowStyles.list} ${rowStyles.grid2} ${rankedByDefault || sort ? rowStyles.ranked : ''}`} data-sort={sort || 'rel'} aria-busy={pending} style={pending ? { opacity: 0.5 } : undefined}>
        {shown.map((r) => (
          <Fragment key={r.id}>{r.node}</Fragment>
        ))}
      </ul>
      {foot}
    </>
  );
}

'use client';
// 검색 결과 · 둘러보기 목록(2026-11-17 전면 개편).
//   상황 카드 — 뜻 검색(조건 · 분류 질의)과 둘러보기에서만 나온다. 고르면 **순서만** 바꾼다(제품 카드는 서버가 한 번 그려 넘긴다 · INP).
//     찾은 말과 이름이 같은 제품(keys.pin = 0)은 어느 정렬에서도 맨 앞(2026-11-17 사용자).
//   스크롤 영역 — 페이지가 길어지지 않게 결과만 영역 안에서 내린다.
//   쪽 — 화면에 보이는 개수(PC 8 · 모바일 4 — 고정)마다 한 쪽. 계속 내릴 수 있고, 아래 쪽 번호가 지금 쪽을 표시 · 누르면 그 쪽으로.
//     지금 쪽은 주소(pg)에 남는다 — 상세에 갔다 돌아와도 보던 쪽으로 돌아온다.
import { track } from '@/lib/track';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import type { SortId, SortOpt } from '@/lib/sort';
import s from './results.module.css';

/** 기준별 정렬 값 — 작을수록 앞(null 은 맨 뒤). pin 0 = 찾은 말과 이름이 같다(늘 맨 앞). */
export type SortKeys = { pin: number; rel: number; lensHit: number; lens: number | null; diet: number | null; glucose: number; additive: number; nutrition: number };
export type SortRow = { id: string; node: ReactNode; keys: SortKeys };

const PER = { pc: 8, mobile: 4 } as const;
const MOBILE = '(max-width: 759px)';

function setParam(k: string, v: string | null) {
  const u = new URL(window.location.href);
  if (v) u.searchParams.set(k, v);
  else u.searchParams.delete(k);
  window.history.replaceState(window.history.state, '', u.toString());
}

export function SortableResults({
  rows,
  options,
  initialSort,
  lensDesc = false,
  tail,
  serverSorted = null,
  serverChips = [],
}: {
  rows: SortRow[];
  /** 서버가 이 칩 기준으로 세워 보낸 목록이면 그 칩(순서를 다시 세우지 않는다 · 「내 기준」은 피할 성분 든 것만 뒤로 · main 2026-11-14) */
  serverSorted?: SortId | null;
  /** 서버가 세울 수 있는 칩 — 누르면 서버에 다시 묻는다(검색어가 정한 집합 전체를 그 값으로) */
  serverChips?: SortId[];
  /** 목록 끝에 붙는 칸(결과가 몇 개뿐일 때 남는 자리를 채운다 — 이름 검색의 「더 찾아볼까요?」) */
  tail?: ReactNode;
  /** null — 상황 카드 없이(제품 이름 검색) */
  options: SortOpt[] | null;
  initialSort: SortId;
  lensDesc?: boolean;
}) {
  const valid = (v: string | null): v is SortId => !!options && options.some((o) => o.id === v);
  const [sort, setSort] = useState<SortId>(valid(initialSort) ? initialSort : '');
  const router = useRouter();
  const [want, setWant] = useState<SortId | null>(null);   // 서버에 다시 묻는 동안 켜 둘 칩
  const [waiting, startTransition] = useTransition();
  const active = want ?? sort;
  const [per, setPer] = useState<number>(PER.pc);
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  // 받은 뒤 바뀐 정렬(앞 단계 화면에서 눌렀다) · 화면 폭에 따른 쪽 크기
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('sort');
    if (valid(v) && v !== sort) setSort(v);
    const m = window.matchMedia(MOBILE);
    const f = () => setPer(m.matches ? PER.mobile : PER.pc);
    f();
    setMounted(true);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = useMemo(() => {
    const cmpNum = (a: number | null, b: number | null, desc = false) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return desc ? b - a : a - b;
    };
    // 서버가 이 칩으로 세운 목록 — 순서는 그대로(찾은 제품만 앞 · 「내 기준」은 피할 성분 든 것만 뒤로 · 안정 정렬이라 서버 순서가 남는다)
    if (sort && sort === serverSorted) {
      return [...rows].sort((a, b) => a.keys.pin - b.keys.pin || (sort === 'lens' ? a.keys.lensHit - b.keys.lensHit : 0));
    }
    return [...rows].sort((a, b) => {
      const x = a.keys, y = b.keys;
      if (x.pin !== y.pin) return x.pin - y.pin;
      const c = !sort
        ? 0
        : sort === 'lens'
          ? x.lensHit - y.lensHit || cmpNum(x.lens, y.lens, lensDesc)
          : sort === 'diet'
            ? cmpNum(x.diet, y.diet)
            : x[sort] - y[sort];
      return c || x.rel - y.rel;
    });
  }, [rows, sort, lensDesc, serverSorted]);

  const pages = Math.max(1, Math.ceil(shown.length / per));

  // 쪽 → 그 쪽 첫 카드(또는 쪽 경계 선)로 영역을 내린다
  const go = useCallback(
    (p: number, smooth = true) => {
      const sc = scroller.current;
      if (!sc) return;
      const q = Math.max(0, Math.min(pages - 1, p));
      const el = q === 0 ? null : (sc.querySelector(`[data-mark="${q}"]`) as HTMLElement | null) ?? (sc.querySelector(`[data-i="${q * per}"]`) as HTMLElement | null);
      sc.scrollTo({ top: el ? el.offsetTop - 6 : 0, behavior: smooth ? 'smooth' : 'auto' });
      if (smooth) track({ name: 'result_page', pos: q + 1 });   // 사람이 쪽을 넘긴 것만(보던 쪽 복원은 빼고)
      setPage(q);
    },
    [pages, per],
  );

  // 보던 쪽으로 돌아오기(한 번)
  useEffect(() => {
    if (!mounted || restored.current) return;
    restored.current = true;
    const pg = Number(new URLSearchParams(window.location.search).get('pg'));
    if (pg > 1) requestAnimationFrame(() => go(pg - 1, false));
  }, [mounted, go]);

  // 스크롤하면 지금 쪽을 따라간다
  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let p = 0;
        if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) p = pages - 1;
        else {
          const top = sc.scrollTop + 24;
          const cards = sc.querySelectorAll<HTMLElement>('[data-i]');
          for (const el of Array.from(cards)) {
            if (el.offsetTop + el.offsetHeight / 2 > top) {
              p = Math.floor(Number(el.dataset.i) / per);
              break;
            }
          }
        }
        setPage((old) => (old === p ? old : p));
      });
    };
    sc.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      sc.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pages, per]);

  // 지금 쪽 → 주소 · 쪽 번호 띠에서 보이게
  useEffect(() => {
    if (!mounted) return;
    setParam('pg', page > 0 ? String(page + 1) : null);
    const b = pagesRef.current?.querySelector<HTMLElement>(`[data-p="${page}"]`);
    const box = pagesRef.current;
    if (b && box) box.scrollTo({ left: b.offsetLeft - box.clientWidth / 2 + b.offsetWidth / 2, behavior: 'smooth' });
  }, [page, mounted]);

  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    if (!sheet) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [sheet]);
  const cur = options?.find((o) => o.id === active) ?? options?.[0];

  const pick = (id: SortId) => {
    track({ name: 'result_sort', tab: id || 'rel' });
    setSheet(false);
    // 서버가 세우는 칩으로 가거나, 지금 목록이 서버가 칩으로 세운 것이면 서버에 다시 묻는다(main 2026-11-14) —
    // 고른 칩만 먼저 켜고 목록은 새 목록이 올 때까지 그대로(브라우저가 60개만 다시 세운 순서를 잠깐이라도 보이지 않게)
    if (serverChips.includes(id) || serverSorted) {
      setWant(id);
      setParam('sort', id || null);
      setParam('by', null);
      setParam('pg', null);
      startTransition(() => router.replace(window.location.pathname + window.location.search, { scroll: false }));
      return;
    }
    setSort(id);
    setParam('sort', id || null);
    setParam('by', null);
    scroller.current?.scrollTo({ top: 0 });
    setPage(0);
  };

  return (
    <>
      {/* 모바일 — 가로로 밀지 않게 지금 기준 하나만 보이고, 누르면 아래에서 기준 목록이 열린다 */}
      {options && cur ? (
        <button type="button" className={s.sortPick} onClick={() => setSheet(true)} aria-haspopup="dialog">
          <span className={`${s.sortIcon} ${s.sortIconOn}`} aria-hidden>
            <Icon name={cur.icon} size={20} strokeWidth={2} />
          </span>
          <span className={s.sortText}>
            <span className={s.sortLabel}>{cur.label}</span>
            <span className={s.sortDesc}>{cur.desc}</span>
          </span>
          <span className={s.sortPickGo}>
            기준 바꾸기
            <Icon name="down" size={16} />
          </span>
        </button>
      ) : null}
      {options && sheet ? (
        <div className={s.sheetBack} onClick={() => setSheet(false)}>
          <div className={s.sheet} role="dialog" aria-modal="true" aria-label="어떤 기준으로 볼까요" onClick={(e) => e.stopPropagation()}>
            <p className={s.sheetTitle}>어떤 기준으로 볼까요?</p>
            <div className={s.sheetList}>
              {options.map((o) => {
                const on = o.id === active;
                return (
                  <button key={o.id || 'rel'} type="button" className={`${s.sheetRow} ${on ? s.sheetRowOn : ''}`} aria-pressed={on} onClick={() => pick(o.id)}>
                    <span className={`${s.sortIcon} ${on ? s.sortIconOn : ''}`} aria-hidden>
                      <Icon name={o.icon} size={20} strokeWidth={on ? 2 : 1.75} />
                    </span>
                    <span className={s.sortText}>
                      <span className={s.sortLabel}>{o.label}</span>
                      <span className={s.sortDesc}>{o.desc}</span>
                    </span>
                    {on ? <Icon name="check" size={18} strokeWidth={2.2} /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      {options ? (
        <div className={s.sorts} role="tablist" aria-label="어떤 기준으로 볼까요">
          {options.map((o) => {
            const on = o.id === active;
            return (
              <button key={o.id || 'rel'} type="button" role="tab" aria-selected={on} className={`${s.sort} ${on ? s.sortOn : ''}`} onClick={() => pick(o.id)}>
                <span className={s.sortIcon} aria-hidden>
                  <Icon name={o.icon} size={20} strokeWidth={on ? 2 : 1.75} />
                </span>
                <span className={s.sortText}>
                  <span className={s.sortLabel}>{o.label}</span>
                  <span className={s.sortDesc}>{o.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div ref={scroller} className={s.scroller}>
        <ul className={s.grid} data-sort={sort || 'rel'} aria-busy={waiting || undefined} style={waiting ? { opacity: 0.55, transition: 'opacity 160ms' } : undefined}>
          {shown.map((r, i) => (
            <Fragment key={r.id}>
              {mounted && i > 0 && i % per === 0 ? (
                <li className={s.mark} data-mark={i / per} aria-hidden>
                  {i / per + 1}쪽
                </li>
              ) : null}
              <li className={s.cell} data-i={i}>
                {r.node}
              </li>
            </Fragment>
          ))}
          {tail ? <li className={s.cellTail}>{tail}</li> : null}
        </ul>
      </div>

      {/* 쪽 번호는 서버에서도 그린다(PC 기준 쪽 수) — 받은 뒤 나타나 영역 높이가 바뀌지 않게 */}
      {pages > 1 ? (
        <nav className={s.pager} aria-label="쪽">
          <button type="button" className={s.pageNav} onClick={() => go(page - 1)} disabled={page === 0} aria-label="앞 쪽">
            <Icon name="back" size={16} />
          </button>
          <span className={s.pageNow}>
            <b>{page + 1}</b> / {pages}쪽
          </span>
          <div ref={pagesRef} className={s.pages}>
            {Array.from({ length: pages }, (_, p) => (
              <button key={p} type="button" data-p={p} className={`${s.pageBtn} ${p === page ? s.pageOn : ''}`} aria-current={p === page ? 'page' : undefined} onClick={() => go(p)}>
                {p + 1}
              </button>
            ))}
          </div>
          <button type="button" className={s.pageNav} onClick={() => go(page + 1)} disabled={page >= pages - 1} aria-label="다음 쪽">
            <Icon name="next" size={16} />
          </button>
        </nav>
      ) : null}
    </>
  );
}

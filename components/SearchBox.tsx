'use client';
// 검색창 — 검색은 홈에서 한다(/?q= · 2026-11-16 사용자 「검색 페이지는 별도로 없이 홈에서 바로」). 자바스크립트가 있으면 클라이언트 이동,
// 없으면 평범한 GET 폼으로 /?q= 로 간다. 누르는 즉시 버튼이 「찾는 중」으로 바뀐다(INP).
// 열면(초점) — 빈 칸이면 최근 검색 · 추천 검색어(내 기준의 먼저 볼 숫자로 줄 세우는 질의)를 보이고, 치기 시작하면 250ms 뒤 연관 제품을 미리 보인다
//   (`/products/suggest` · 앞 요청은 취소 · 검색어 기록 안 함). ↑↓ 로 제품을 고르고 Enter, 고른 것이 없으면 전체 검색. Esc · 바깥 누르면 닫힌다.
// PC — 검색창 아래로 펼친다.
// 모바일 아래 고정 검색창(dock) — 누르면 기록 화면(/history)으로 넘어간다(2026-11-17 사용자 「검색 input 을 누르면 기록 화면으로 전환」).
//   키보드가 끊기지 않게 누르는 순간 화면 밖 임시 입력칸으로 초점을 옮겨 두고, 기록 화면의 같은 검색창이 초점을 받으면 치운다(shell/DockSearch).
//   기록 화면에서는 빈 칸이면 기록이 곧 펼친 판이고, 치기 시작하면 전체 화면 시트로 제품을 미리 보인다(입력칸 · 취소는 아래).
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Icon } from './Icon';
import { FoodTile } from './FoodTile';
import { useLens } from './lens/LensProvider';
import { CLIENT_API as API_BASE } from '@/lib/config';
import { onRecents, recentQueries, recordQuery, removeQuery } from '@/lib/recents';
import { LENS_QUERIES, SEARCH_EXAMPLES } from '@/lib/site';
import type { ProductSummary } from '@/lib/types';
import styles from './SearchBox.module.css';

const DEBOUNCE_MS = 250;
const MOBILE = '(max-width: 759px)';
const searchHref = (q: string) => `/?q=${encodeURIComponent(q)}`;
const TAP_KEY = 'wi_search_tap';

/** 모바일 기록 화면은 시트 없이(빈 칸) 기록을 그대로 보인다 — PC 너비면 평소 판 */
function sheetless() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE).matches;
}

/** 아래 검색창을 누르면 기록 화면으로 — 키보드를 끊지 않게 임시 입력칸에 초점을 옮겨 둔다(DockSearch 가 치운다). */
function toHistory(q: string, push: (href: string) => void) {
  const proxy = document.createElement('input');
  proxy.setAttribute('aria-hidden', 'true');
  proxy.tabIndex = -1;
  proxy.dataset.searchProxy = '';
  proxy.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0';
  document.body.appendChild(proxy);
  proxy.focus();
  try {
    sessionStorage.setItem(TAP_KEY, '1');
  } catch {}
  push(`/history?focus=1${q ? `&q=${encodeURIComponent(q)}` : ''}`);
}

/** 검색창을 눌러 기록 화면에 왔는가 — 한 번 읽으면 지운다 */
export function consumeTapBack(): boolean {
  try {
    const v = sessionStorage.getItem(TAP_KEY) === '1';
    sessionStorage.removeItem(TAP_KEY);
    return v;
  } catch {
    return false;
  }
}

function brandOf(b?: string | null) {
  return (b ?? '').split(/[/_]|\s{2,}/)[0].replace(/^F\d+\(\d+\):/, '').trim();
}

export function SearchBox({
  defaultValue = '',
  size = 'lg',
  autoFocus = false,
  placeholder = '제품 이름, 원하는 조건',
  hero = false,
  dock = false,
  engagedInit = false,
}: {
  defaultValue?: string;
  size?: 'lg' | 'md' | 'sm';
  autoFocus?: boolean;
  placeholder?: string;
  /** 첫 화면의 큰 검색창 — 이게 보이는 동안 헤더 검색(site/HeaderSearch)은 숨는다 */
  hero?: boolean;
  /** 모바일에서 화면 아래에 고정된 검색창 — 누르면 전체 화면 시트로 펼친다 */
  dock?: boolean;
  /** 처음부터 열린 상태(기록 화면이 검색창의 초점을 이어받을 때 · shell/DockSearch) */
  engagedInit?: boolean;
}) {
  const router = useRouter();
  const onHistory = usePathname() === '/history';
  const [pending, start] = useTransition();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [engaged, setEngaged] = useState(engagedInit); // 사용자가 열어 둔 상태(초점 · 바깥 누르기 · Esc · 이동으로 닫힌다)
  const [sheet, setSheet] = useState(false);     // 모바일 전체 화면 시트
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const typed = useRef(false); // 사람이 친 뒤에만 미리보기(결과 화면의 기본값으로는 열지 않는다)
  const abort = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || !q) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(async () => {
      // 입력이 멈추면 결과 화면을 미리 받아 둔다(운영 빌드) — Enter 를 누르는 순간 뼈대가 바로 뜨고 결과가 빨리 온다(INP)
      router.prefetch(searchHref(q));
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      try {
        const r = await fetch(`${API_BASE}/products/suggest?q=${encodeURIComponent(q)}&limit=8`, { signal: ac.signal });
        if (!r.ok) throw new Error(String(r.status));
        const data: ProductSummary[] = await r.json();
        setItems(data);
        setActive(-1);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setItems([]);
      } finally {
        if (abort.current === ac) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // 화면을 떠나면 날아가던 미리보기 요청도 끊는다(응답이 와도 받을 곳이 없다)
  useEffect(() => () => abort.current?.abort(), []);

  // 바깥을 누르면 닫는다(시트는 「취소」로 닫는다 — 시트가 화면 전체라 바깥이 없다)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setEngaged(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  // 시트가 열린 동안 — 뒤 화면을 굴리지 않고, 시트를 품은 첫 화면 묶음을 머리 · 탭 막대 위로 올린다(globals.css .search-host)
  useEffect(() => {
    if (!sheet) return;
    const root = document.documentElement;
    const prev = document.body.style.overflow;
    root.dataset.searchSheet = '';
    document.body.style.overflow = 'hidden';
    // 입력칸이 시트 아래에 있다(2026-11-17 사용자 「모바일은 아래에서 바로 누르게」) — 키보드가 올라오면 보이는 높이만큼만 써서 입력칸이 키보드 바로 위에 붙는다
    const vv = window.visualViewport;
    const fit = () => {
      if (vv) root.style.setProperty('--sheet-h', `${Math.round(vv.height)}px`);
    };
    fit();
    vv?.addEventListener('resize', fit);
    return () => {
      delete root.dataset.searchSheet;
      document.body.style.overflow = prev;
      vv?.removeEventListener('resize', fit);
      root.style.removeProperty('--sheet-h');
    };
  }, [sheet]);

  const close = () => {
    setEngaged(false);
    setSheet(false);
  };

  const go = (href: string) => {
    close();
    (document.activeElement as HTMLElement | null)?.blur(); // 모바일 — 결과가 키보드에 가리지 않게
    start(() => router.push(href));
  };

  const search = (q: string) => {
    const t = q.trim();
    if (!t) return;
    recordQuery(t);
    setValue(t);
    go(searchHref(t));
  };

  const mobileDock = () => dock && window.matchMedia(MOBILE).matches;
  const open = () => {
    setEngaged(true);
    if (!mobileDock()) return;
    if (onHistory) {
      if (value.trim() && typed.current) setSheet(true);
      return;
    }
    toHistory(value.trim(), (href) => router.push(href));
  };

  const showList = engaged && !!value.trim() && items.length > 0;
  // 모바일 기록 화면은 화면 자체가 최근 기록이다 — 빈 칸일 때 따로 판을 띄우지 않는다
  const showSuggest = engaged && !value.trim() && !(dock && onHistory && sheetless());

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${dock ? styles.dockMode : ''} ${sheet ? styles.sheet : ''} ${engaged ? styles.engaged : ''}`}
      data-hero-search={hero ? '' : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          close();
          inputRef.current?.blur();
        }
      }}
    >
      <div className={styles.barRow}>
        <form
          action="/"
          method="get"
          role="search"
          className={`${styles.form} ${styles[size]}`}
          onSubmit={(e) => {
            const q = value.trim();
            if (!q) return;
            e.preventDefault();
            if (showList && active >= 0 && items[active]) return go(`/p/${items[active].id}`);
            search(q);
          }}
        >
          <Icon name="search" size={20} className={styles.icon} />
          <label htmlFor={`q-${size}`} className="visually-hidden">
            제품 이름 또는 조건으로 검색
          </label>
          <input
            ref={inputRef}
            id={`q-${size}`}
            name="q"
            type="search"
            value={value}
            onChange={(e) => {
              typed.current = true;
              setValue(e.target.value);
              setEngaged(true);
              if (onHistory && mobileDock()) setSheet(!!e.target.value.trim());
            }}
            onFocus={open}
            onClick={open}
            onKeyDown={(e) => {
              if (!showList) return;
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(-1, i - 1)); }
            }}
            placeholder={placeholder}
            autoComplete="off"
            enterKeyHint="search"
            autoFocus={autoFocus}
            required
            minLength={1}
            className={styles.input}
            role="combobox"
            aria-expanded={showList || showSuggest}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          />
          {/* 진행 표시 · 지우기 — 늘 자리를 두고 visibility 로만 켠다(입력칸 폭이 흔들리지 않게 · 레이아웃 규칙 ②) */}
          <span className={styles.spin} aria-hidden style={{ visibility: loading && value.trim() ? 'visible' : 'hidden' }} />
          <button
            type="button"
            className={styles.clear}
            style={{ visibility: value ? 'visible' : 'hidden' }}
            tabIndex={value ? 0 : -1}
            aria-label="검색어 지우기"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              abort.current?.abort();
              setValue('');
              setItems([]);
              setLoading(false);
              setEngaged(true);
              inputRef.current?.focus();
            }}
          >
            <Icon name="close" size={16} />
          </button>
          {/* 글자 대신 돋보기(2026-11-17 사용자) — 읽는 이름은 aria-label */}
          <button type="submit" className={styles.submit} aria-busy={pending} aria-label={pending ? '찾는 중' : '검색'}>
            <Icon name="search" size={20} strokeWidth={2.2} />
          </button>
        </form>
        {sheet || (dock && onHistory && engaged) ? (
          <button
            type="button"
            className={styles.cancel}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              close();
              inputRef.current?.blur();
              // 검색창을 눌러 기록 화면으로 왔으면 취소는 원래 화면으로
              if (onHistory && consumeTapBack()) router.back();
            }}
          >
            취소
          </button>
        ) : null}
      </div>

      {/* 펼친 칸 — 누르는 동안 입력칸 초점을 잃지 않게(onPointerDown) · 아래 본문을 밀지 않는다(떠 있는 판 · 시트에서는 화면을 채운다) */}
      {showSuggest ? (
        <div id={listId} className={styles.panel} onPointerDown={(e) => e.preventDefault()}>
          <Suggest onPick={search} />
        </div>
      ) : showList ? (
        <ul id={listId} role="listbox" className={styles.panel} aria-label="미리 보는 제품" onPointerDown={(e) => e.preventDefault()}>
          {items.map((p, i) => (
            <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <a
                href={`/p/${p.id}`}
                className={`${styles.opt} ${i === active ? styles.optOn : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={(e) => { e.preventDefault(); go(`/p/${p.id}`); }}
              >
                <FoodTile type={p.sub} src={p.image_url} size={56} named />
                <span className={styles.optText}>
                  <span className={`t-strong ${styles.optName}`}>{p.name}</span>
                  <span className={`t-caption c-t3 ${styles.optName}`}>{[brandOf(p.brand), p.sub].filter(Boolean).join(', ')}</span>
                </span>
              </a>
            </li>
          ))}
          <li role="option" aria-selected={false}>
            <a
              href={searchHref(value.trim())}
              className={`t-caption ${styles.optAll}`}
              onClick={(e) => { e.preventDefault(); search(value); }}
            >
              ‘{value.trim()}’ 전체 결과 보기
              <Icon name="next" size={16} />
            </a>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

// 빈 칸일 때 — 최근 검색(이 기기) · 추천 검색어(내 기준의 먼저 볼 숫자 순 → 모자라면 검색 예시).
function Suggest({ onPick }: { onPick: (q: string) => void }) {
  const { lens } = useLens();
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    const read = () => setRecent(recentQueries().slice(0, 5));
    read();
    return onRecents(read);
  }, []);

  const picks: { q: string; hint: string }[] = [];
  for (const k of lens?.focus ?? []) {
    const x = LENS_QUERIES[k];
    if (x && !picks.some((p) => p.q === x.q)) picks.push(x);
  }
  for (const x of SEARCH_EXAMPLES) {
    if (picks.length >= 5) break;
    if (!picks.some((p) => p.q === x.q)) picks.push(x);
  }

  return (
    <>
      {recent.length ? (
        <section className={styles.group} aria-label="최근 검색">
          <p className={styles.groupHead}>최근 검색</p>
          <ul className={styles.rows}>
            {recent.map((q) => (
              <li key={q} className={styles.rowLi}>
                <button type="button" className={styles.row} onClick={() => onPick(q)}>
                  <Icon name="clock" size={18} className={styles.rowIcon} />
                  <span className={styles.rowQ}>{q}</span>
                </button>
                <button type="button" className={styles.rowX} aria-label={`${q} 지우기`} onClick={() => removeQuery(q)}>
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className={styles.group} aria-label="추천 검색어">
        <p className={styles.groupHead}>{lens ? '내 기준 추천' : '추천 검색어'}</p>
        <ul className={styles.rows}>
          {picks.map((x) => (
            <li key={x.q} className={styles.rowLi}>
              <button type="button" className={styles.row} onClick={() => onPick(x.q)}>
                <Icon name="search" size={18} className={styles.rowIcon} />
                <span className={styles.rowQ}>{x.q}</span>
                <span className={styles.rowHint}>{x.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

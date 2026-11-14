'use client';
// 검색창 — 자바스크립트가 있으면 페이지를 새로 받지 않고 클라이언트 이동(startTransition)으로 간다.
// 누르는 즉시 버튼이 「찾는 중」으로 바뀌어 반응이 보인다(INP). 자바스크립트가 없어도 평범한 GET 폼으로 /search?q= 로 간다.
// 입력을 250ms 멈추면 연관 제품을 미리 보인다(2026-11-03 사용자 · `/products/suggest` · 앞 요청은 취소 · 검색어 기록 안 함).
// ↑↓ 로 고르고 Enter 면 그 제품, 고른 것이 없으면 전체 검색. Esc · 바깥 누르면 닫힌다.
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Icon } from './Icon';
import { FoodTile } from './FoodTile';
import { CLIENT_API as API_BASE } from '@/lib/config';
import { recordQuery } from '@/lib/recents';
import type { ProductSummary } from '@/lib/types';
import styles from './SearchBox.module.css';

const DEBOUNCE_MS = 250;

function brandOf(b?: string | null) {
  return (b ?? '').split(/[/_]|\s{2,}/)[0].replace(/^F\d+\(\d+\):/, '').trim();
}

export function SearchBox({
  defaultValue = '',
  size = 'lg',
  autoFocus = false,
  placeholder = '제품 이름, 원하는 조건',
  hero = false,
}: {
  defaultValue?: string;
  size?: 'lg' | 'md' | 'sm';
  autoFocus?: boolean;
  placeholder?: string;
  /** 첫 화면의 큰 검색창 — 이게 보이는 동안 헤더 검색(site/HeaderSearch)은 숨는다 */
  hero?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const typed = useRef(false); // 사람이 친 뒤에만 미리보기(첫 화면의 기본값으로는 열지 않는다)
  const abort = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLFormElement>(null);
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
      router.prefetch(`/search?q=${encodeURIComponent(q)}`);
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      try {
        const r = await fetch(`${API_BASE}/products/suggest?q=${encodeURIComponent(q)}&limit=8`, { signal: ac.signal });
        if (!r.ok) throw new Error(String(r.status));
        const data: ProductSummary[] = await r.json();
        setItems(data);
        setActive(-1);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setItems([]);
      } finally {
        if (abort.current === ac) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value]);

  // 화면을 떠나면 날아가던 미리보기 요청도 끊는다(응답이 와도 받을 곳이 없다)
  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    (document.activeElement as HTMLElement | null)?.blur(); // 모바일 — 결과가 키보드에 가리지 않게
    start(() => router.push(href));
  };

  const showList = open && value.trim() && items.length > 0;

  return (
    <form
      ref={boxRef}
      action="/search"
      method="get"
      role="search"
      className={`${styles.form} ${styles[size]} ${showList ? styles.withList : ''}`}
      data-hero-search={hero ? '' : undefined}
      onSubmit={(e) => {
        const q = value.trim();
        if (!q) return;
        e.preventDefault();
        if (showList && active >= 0 && items[active]) return go(`/p/${items[active].id}`);
        recordQuery(q);
        go(`/search?q=${encodeURIComponent(q)}`);
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
        }}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(-1, i - 1)); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
        required
        minLength={1}
        className={styles.input}
        role="combobox"
        aria-expanded={!!showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      />
      {/* 진행 표시 · 지우기 — 늘 자리를 두고 visibility 로만 켠다(입력칸 폭이 흔들리지 않게 · 레이아웃 규칙 ②) */}
      <span className={styles.spin} aria-hidden style={{ visibility: loading && value.trim() ? 'visible' : 'hidden' }} />
      {/* 지우기 — 내용이 있을 때만 · 누르면 바로 비우고 다시 입력할 수 있게 초점을 둔다 */}
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
            setOpen(false);
            setLoading(false);
            inputRef.current?.focus();
          }}
        >
          <Icon name="close" size={16} />
        </button>
      <button type="submit" className={styles.submit} aria-busy={pending}>
        {pending ? '찾는 중' : '검색'}
      </button>
      {showList ? (
        <ul id={listId} role="listbox" className={styles.list} aria-label="미리 보는 제품">
          {items.map((p, i) => (
            <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <a
                href={`/p/${p.id}`}
                className={`${styles.opt} ${i === active ? styles.optOn : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={(e) => { e.preventDefault(); go(`/p/${p.id}`); }}
              >
                <FoodTile type={p.sub} src={p.image_url} size={40} />
                <span className={styles.optText}>
                  <span className={`t-strong ${styles.optName}`}>{p.name}</span>
                  <span className={`t-caption c-t3 ${styles.optName}`}>{[brandOf(p.brand), p.sub].filter(Boolean).join(', ')}</span>
                </span>
              </a>
            </li>
          ))}
          <li role="option" aria-selected={false}>
            <a
              href={`/search?q=${encodeURIComponent(value.trim())}`}
              className={`t-caption ${styles.optAll}`}
              onClick={(e) => { e.preventDefault(); recordQuery(value.trim()); go(`/search?q=${encodeURIComponent(value.trim())}`); }}
            >
              ‘{value.trim()}’ 전체 결과 보기
              <Icon name="next" size={16} />
            </a>
          </li>
        </ul>
      ) : null}
    </form>
  );
}

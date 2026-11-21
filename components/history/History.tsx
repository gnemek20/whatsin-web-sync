'use client';
// 기록 탭(2026-11-17 사용자 「검색 탭보다는 기록 — 인터넷 방문 기록처럼」).
//   본 제품 · 찾은 말을 날짜별로(오늘 · 어제 · 11월 15일 (토)) 묶고 시각을 붙인다. 하나씩 지우거나 모두 지운다.
//   이 브라우저(localStorage)에만 있다 — lib/recents. 화면은 머리 바 아래 한 덩어리 · 목록만 영역 안에서 내린다(검색 결과와 같은 원칙).
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { FoodTile, foodKind } from '@/components/FoodTile';
import { Icon } from '@/components/Icon';
import { brandName } from '@/components/ProductRow';
import { clearQueries, clearViews, onRecents, recentQueryLog, recentViews, removeQuery, removeView, type RecentView } from '@/lib/recents';
import s from './history.module.css';

type Tab = 'views' | 'queries';
type Entry = { key: string; ts: number; node: React.ReactNode };

const DAY = 86400000;
const time = (ts: number) => new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(ts);
function dayLabel(ts: number): string {
  if (!ts) return '이전 기록';
  const d = new Date(ts);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (ts >= start.getTime()) return '오늘';
  if (ts >= start.getTime() - DAY) return '어제';
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(d);
}

function group(entries: Entry[]): { label: string; items: Entry[] }[] {
  const out: { label: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const label = dayLabel(e.ts);
    const g = out[out.length - 1];
    if (g && g.label === label) g.items.push(e);
    else out.push({ label, items: [e] });
  }
  return out;
}

export function History() {
  const [tab, setTab] = useState<Tab>('views');
  const [data, setData] = useState<{ views: RecentView[]; queries: { q: string; ts: number }[] } | null>(null);

  useEffect(() => {
    // 검색창을 눌러 넘어왔으면 찾은 말부터(다시 찾기 쉽게)
    if (new URLSearchParams(window.location.search).get('focus') === '1') setTab('queries');
    const load = () => setData({ views: recentViews(), queries: recentQueryLog() });
    load();
    return onRecents(load);
  }, []);

  const groups = useMemo(() => {
    if (!data) return [];
    if (tab === 'views') {
      return group(
        [...data.views].sort((a, b) => (b.ts || 0) - (a.ts || 0)).map((v) => ({
          key: v.id,
          ts: v.ts || 0,
          node: (
            <div className={s.row} style={{ ['--k-bg' as string]: `var(--tile-${foodKind(v.sub)}-bg)` } as React.CSSProperties}>
              <span className={s.time}>{v.ts ? time(v.ts) : ''}</span>
              <Link href={`/p/${v.id}`} className={s.main} data-ev="history_click" data-tid={v.id} data-tab="views">
                <span className={`${s.thumb} ${v.image_url ? s.thumbPhoto : ''}`}>
                  <FoodTile src={v.image_url} type={v.sub} size={48} />
                </span>
                <span className={s.text}>
                  <span className={s.name}>{v.name}</span>
                  <span className={s.meta}>{[brandName(v.brand), v.sub].filter(Boolean).join(', ')}</span>
                </span>
              </Link>
              <button type="button" className={s.remove} onClick={() => removeView(v.id)} aria-label={`${v.name} 기록 지우기`}>
                <Icon name="close" size={16} />
              </button>
            </div>
          ),
        })),
      );
    }
    return group(
      [...data.queries].sort((a, b) => b.ts - a.ts).map((x) => ({
        key: x.q,
        ts: x.ts,
        node: (
          <div className={s.row}>
            <span className={s.time}>{x.ts ? time(x.ts) : ''}</span>
            <Link href={`/?q=${encodeURIComponent(x.q)}`} className={s.main} data-ev="history_click" data-q={x.q} data-tab="queries">
              <span className={s.qIcon} aria-hidden>
                <Icon name="search" size={18} />
              </span>
              <span className={s.text}>
                <span className={s.name}>{x.q}</span>
              </span>
            </Link>
            <button type="button" className={s.remove} onClick={() => removeQuery(x.q)} aria-label={`${x.q} 기록 지우기`}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ),
      })),
    );
  }, [data, tab]);

  const count = data ? (tab === 'views' ? data.views.length : data.queries.length) : 0;
  const clear = () => {
    if (!window.confirm(tab === 'views' ? '본 제품 기록을 모두 지울까요?' : '최근 검색어를 모두 지울까요?')) return;
    if (tab === 'views') clearViews();
    else clearQueries();
  };

  return (
    <div className={s.view}>
      {/* PC — 왼쪽 단(제목 · 종류 · 지우기) | 오른쪽 목록. 모바일 — 위아래 한 줄(2026-11-17 사용자 「PC 는 적절한 크기로」) */}
      <aside className={s.side}>
      <header className={s.head}>
        <h1 className={s.title}>기록</h1>
        <p className={s.sub}>이 브라우저에만 남는 기록입니다.</p>
      </header>

      <div className={s.seg} role="tablist" aria-label="기록 종류">
        {(
          [
            ['views', '본 제품', data?.views.length],
            ['queries', '최근 검색어', data?.queries.length],
          ] as const
        ).map(([k, label, n]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`${s.segBtn} ${tab === k ? s.segOn : ''}`} onClick={() => setTab(k)}>
            {label}
            {n ? <span className={s.segN}>{n}</span> : null}
          </button>
        ))}
      </div>

      {/* 목록 머리 — 오른쪽 밑줄 글자 「모두 지우기」(2026-11-17 사용자 「리스트 우측 상단에 텍스트 언더라인」 · 두 탭 다) */}
      <div className={s.listBar}>
        {count ? (
          <button type="button" className={s.clear} onClick={clear}>
            모두 지우기
          </button>
        ) : null}
      </div>

      </aside>

      <div className={s.scroller}>
        {!data ? null : groups.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyIcon} aria-hidden>
              <Icon name="clock" size={24} />
            </span>
            <p className={s.emptyTitle}>{tab === 'views' ? '아직 본 제품이 없습니다' : '아직 최근 검색어가 없습니다'}</p>
            <Link href="/" className={s.emptyGo}>
              제품 찾으러 가기
              <Icon name="next" size={16} />
            </Link>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.label} className={s.group}>
              <h2 className={s.day}>{g.label}</h2>
              <ul className={`${s.list} ${tab === 'views' ? s.listViews : ''}`}>
                {g.items.map((e) => (
                  <li key={e.key}>{e.node}</li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

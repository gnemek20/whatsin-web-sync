'use client';
// 성분 사전 찾기 — 이름을 치면 사전에서 바로 찾는다(/api/ingredients). 비어 있으면 자주 묻는 성분 묶음.
// 2026-11-14 개편 — 검색 알약(지우기 칸은 늘 자리를 둔다) · 결과는 목록 카드 하나 · 묶음은 카드마다 칩.
// 아래 칸(결과 또는 묶음)은 최소 높이를 잡아 둬서 바뀌어도 바닥이 출렁이지 않는다(레이아웃 규칙 ②).
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { ListCard, ListRow } from '../ui/ListCard';
import s from './dict.module.css';

type Hit = { key: string; name: string; tag: string; verdict: string | null; plain: string };

const TONE: Record<string, number> = { risk: 4, caution: 3, good: 1 };

export function DictSearch({ groups }: { groups: { title: string; items: string[] }[] }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  useEffect(() => {
    const t = q.trim();
    if (!t) {
      setHits(null);
      return;
    }
    const ctl = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/ingredients?q=${encodeURIComponent(t)}`, { signal: ctl.signal });
        setHits(r.ok ? await r.json() : []);
      } catch {
        if (!ctl.signal.aborted) setHits([]);
      }
    }, 180);
    return () => {
      ctl.abort();
      window.clearTimeout(id);
    };
  }, [q]);
  return (
    <div className={s.wrap}>
      <label className={s.search}>
        <Icon name="search" size={22} className={s.searchIcon} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="성분 이름 (예: 말티톨, 카라기난)" aria-label="성분 이름으로 찾기" autoFocus />
        {/* 지우기 칸은 늘 자리를 둔다 — 글자를 치는 순간 입력칸 폭이 줄지 않게 */}
        <button
          type="button"
          onClick={() => setQ('')}
          aria-label="지우기"
          className={s.clear}
          style={{ visibility: q ? 'visible' : 'hidden' }}
          tabIndex={q ? 0 : -1}
        >
          <Icon name="close" size={18} />
        </button>
      </label>

      <div className={s.body} aria-live="polite">
        {hits !== null ? (
          hits.length === 0 ? (
            <div className={`card ${s.none}`}>
              <span className={s.noneIcon}><Icon name="search" size={22} /></span>
              <span className={s.noneText}>
                <span className="t-strong">사전에서 「{q}」를 찾지 못했습니다.</span>
                <span className="t-caption c-t2">다른 표기로 찾아 보시기 바랍니다.</span>
              </span>
            </div>
          ) : (
            <div className={s.results}>
              <p className="t-caption c-t3 num">{hits.length}개</p>
              <ListCard>
                {hits.map((h) => {
                  const tone = h.verdict ? TONE[h.verdict] : undefined;
                  return (
                    <ListRow
                      key={h.key}
                      href={`/i/${encodeURIComponent(h.key)}`}
                      leading={
                        <span className={s.hitIcon} style={tone ? { color: `var(--band-${tone})` } : undefined}>
                          <Icon name="flask" size={20} />
                        </span>
                      }
                      title={
                        <>
                          {h.name}
                          {h.tag ? <span className={`t-caption c-t3 ${s.hitTag}`}>{h.tag}</span> : null}
                        </>
                      }
                      sub={h.plain ? h.plain.replace(/\*\*/g, '').replace(/\s+/g, ' ') : undefined}
                    />
                  );
                })}
              </ListCard>
            </div>
          )
        ) : (
          <div className={s.groups}>
            {groups.map((g) => (
              <section key={g.title} className={`card ${s.group}`} aria-label={g.title}>
                <h2 className={`t-headline ${s.groupTitle}`}>{g.title}</h2>
                <div className={s.chips}>
                  {g.items.map((n) => (
                    <Link key={n} href={`/i/${encodeURIComponent(n)}`} className={`chip ${s.chip}`}>{n}</Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

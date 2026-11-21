'use client';
// 성분 사전 찾기 — 이름을 치면 사전에서 바로 찾는다(/api/ingredients). 비어 있으면 자주 묻는 성분 묶음.
// 2026-11-14 개편 — 검색 알약(지우기 칸은 늘 자리를 둔다) · 결과는 목록 카드 하나 · 묶음은 카드마다 칩.
// 아래 칸(결과 또는 묶음)은 최소 높이를 잡아 둬서 바뀌어도 바닥이 출렁이지 않는다(레이아웃 규칙 ②).
// 2026-11-18 — 묶음은 분류 전환(대체당 · 당류 · 첨가물 · 기름) + 고른 분류의 성분 목록(이름 · 역할 · 무엇인지 한 줄). PC 두 칸.
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import { ListCard, ListRow } from '../ui/ListCard';
import s from './dict.module.css';

type Hit = { key: string; name: string; tag: string; verdict: string | null; plain: string };
export type DictItem = { href: string; name: string; tag: string; verdict: string | null; plain: string };

const TONE: Record<string, number> = { risk: 4, caution: 3, good: 1 };

export function DictSearch({ groups }: { groups: { title: string; items: DictItem[] }[] }) {
  const [q, setQ] = useState('');
  const [gi, setGi] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  // PC 만 바로 입력 — 모바일은 아래 칸이라 열자마자 자판이 올라오면 목록을 가린다
  useEffect(() => { if (matchMedia('(min-width: 760px)').matches) input.current?.focus(); }, []);
  const cur = groups[gi] ?? groups[0];
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
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="성분 이름" aria-label="성분 이름으로 찾기" />
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
            <div className={s.seg} role="tablist" aria-label="성분 분류">
              {groups.map((g, i) => (
                <button
                  key={g.title}
                  type="button"
                  role="tab"
                  aria-selected={i === gi}
                  className={`${s.segBtn} ${i === gi ? s.segOn : ''}`}
                  onClick={() => setGi(i)}
                >
                  <span className={s.segLabel}>{g.title}</span>
                  <span className={s.segN}>{g.items.length}</span>
                </button>
              ))}
            </div>
            {cur ? (
              <ul className={s.items} role="tabpanel" aria-label={cur.title}>
                {cur.items.map((it) => {
                  const tone = it.verdict ? TONE[it.verdict] : undefined;
                  return (
                    <li key={it.href}>
                      <Link href={`/i/${encodeURIComponent(it.href)}`} className={s.item}>
                        <span className={s.itemHead}>
                          <span className={`t-strong ${s.itemName}`}>{it.name}</span>
                          {it.tag ? (
                            <span className={s.itemTag} style={tone ? ({ '--tone': `var(--band-${tone})` } as React.CSSProperties) : undefined}>{it.tag}</span>
                          ) : null}
                          <Icon name="next" size={14} className={`c-t3 ${s.itemChev}`} />
                        </span>
                        {it.plain ? <span className={`t-caption c-t2 ${s.itemPlain}`}>{it.plain.replace(/\*\*/g, '')}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

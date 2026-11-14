'use client';
// 원재료 칩 — 라벨 순서대로. 2026-11-13 사용자 「여러 라벨이 놓인 곳에 검색을 붙여 원하는 걸 빠르게」 — 카드 머리에 찾기 칸.
// 이름 · 용도(감미료 · 유화제 …) · 사람들이 쓰는 말(「색소」 → 착색료 · 「당」 → 당류 · 당알코올 · 감미료 · 「첨가물」 → 첨가물 전부)로 걸러 보인다.
// 「못 찾음」은 「없다」가 아니다 — 원재료 목록에서 못 찾았다고만 말한다(복합원료 속은 모른다).
// 브라우저 번들을 가볍게 — 판정 이름표 · 색은 여기서 작게 다시 적는다(lib/axes 는 문구 사전을 끌고 온다).
import Link from 'next/link';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Ingredient, IngredientVerdict } from '@/lib/types';
import { Icon } from '../Icon';
import styles from './product.module.css';

const LABEL: Record<IngredientVerdict, string> = { risk: '특히 조심', caution: '주의', ok: '첨가물', good: '일반 원재료', unknown: '세부 미확인' };
const tone = (v: IngredientVerdict) => (v === 'risk' ? 4 : v === 'caution' ? 3 : v === 'good' ? 1 : null);
const ingHref = (name: string) => `/i/${encodeURIComponent(name)}`;
const norm = (t: string) => t.toLowerCase().replace(/[\s,()·\-_/]/g, '');

// 사람들이 쓰는 말 → 원재료의 이름 · 용도에서 찾을 말
const ALIAS: Record<string, string[]> = {
  당: ['당', '설탕', '과당', '포도당', '물엿', '시럽', '올리고당', '감미료', '톨', '꿀'],
  대체당: ['감미료', '톨', '알룰로', '스테비', '수크랄로스', '아스파탐', '아세설팜'],
  색소: ['착색료', '색소', '황색', '적색', '청색', '카라멜색'],
  방부제: ['보존료', '소브산', '안식향산', '프로피온산'],
  기름: ['유지', '오일', '유', '쇼트닝', '마가린', '버터'],
  msg: ['글루탐산', '글루타민산', '향미증진'],
};
const ADDITIVE_WORDS = ['첨가물', '첨가제'];
const QUICK = ['감미료', '색소', '첨가물', '유지'];

function matches(it: Ingredient, q: string): boolean {
  const t = norm(q);
  if (!t) return true;
  const hay = [it.name, it.tag, ...(it.function_classes ?? [])].map(norm);
  if (hay.some((h) => h.includes(t))) return true;
  if (ADDITIVE_WORDS.some((w) => norm(w).startsWith(t) && t.length >= 2) && (it.kind === 'function' || it.kind === 'additive')) return true;
  const alias = Object.entries(ALIAS).find(([k]) => norm(k) === t)?.[1];
  return !!alias && alias.some((a) => hay.some((h) => h.includes(norm(a))));
}

export function IngredientChips({ items }: { items: Ingredient[] }) {
  // 같은 원재료가 두 번 적힌 라벨이 있다(복합조미식품 ×2) — 칩은 한 번만.
  const list = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((it) => (seen.has(it.key) ? false : (seen.add(it.key), true)));
  }, [items]);
  const [q, setQ] = useState('');
  const shown = useMemo(() => list.filter((it) => matches(it, q)), [list, q]);
  // 레이아웃 고정 규칙 ④ — 거르기 전 목록 높이를 최소 높이로 붙잡는다(목록이 줄어 아래 카드가 올라붙지 않게)
  const box = useRef<HTMLDivElement>(null);
  const [frozen, setFrozen] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!q && box.current) setFrozen(box.current.offsetHeight);
  }, [q, list.length]);
  if (list.length === 0) return null;
  const present = (['risk', 'caution', 'unknown'] as IngredientVerdict[]).filter((v) => list.some((it) => it.verdict === v));
  const searchable = list.length > 6;
  return (
    <section className={`card ${styles.block}`} aria-labelledby="ing-h">
      <div className={styles.blockHead}>
        <h2 id="ing-h" className="t-headline">원재료</h2>
        <span className="t-caption c-t2">{q ? `${list.length}종 중 ${shown.length}종` : `라벨 순서대로 ${list.length}종`}</span>
      </div>
      {searchable ? (
        <div className={styles.chipFind}>
          <label className={styles.chipSearch}>
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="원재료에서 찾기 (예: 팜유, 색소, 감미료)" aria-label="원재료에서 찾기" />
            {/* 지우기 단추는 자리를 늘 둔다(규칙 ②) */}
            <button type="button" onClick={() => setQ('')} aria-label="지우기" tabIndex={q ? 0 : -1} style={q ? undefined : { visibility: 'hidden' }}><Icon name="close" size={16} /></button>
          </label>
          <div className={styles.chipQuick}>
            {QUICK.map((w) => (
              <button key={w} type="button" className={`t-caption ${styles.chipQuickBtn} ${q === w ? styles.chipQuickOn : ''}`} aria-pressed={q === w} onClick={() => setQ(q === w ? '' : w)}>{w}</button>
            ))}
          </div>
        </div>
      ) : null}
      <div ref={box} style={q && frozen ? { minHeight: frozen } : undefined}>
      {shown.length === 0 ? (
        <p className="t-caption c-t2">원재료 목록에서 「{q}」를 찾지 못했습니다. 다른 이름으로 적혀 있거나 복합원료 안에 있을 수 있습니다.</p>
      ) : (
        <ul className={`${styles.chips} ${shown.length === 1 ? styles.chipsOne : ''} ${shown.length > 12 ? styles.chipsScroll : ''}`}>
          {shown.map((it) => {
            const tn = it.verdict === 'risk' || it.verdict === 'caution' ? tone(it.verdict) : null;
            // 내 피할 성분(서버 avoided_keys)이면 붉은 테두리 + 「피할 성분」
            const sub = [it.avoided ? '피할 성분' : it.tag, it.percent != null ? `${it.percent}%` : null].filter(Boolean).join(' ');
            const pos = list.indexOf(it) + 1;
            return (
              <li key={it.key}>
                <Link href={ingHref(it.name)} className={`${styles.chip} ${it.verdict === 'unknown' ? styles.chipUnknown : ''} ${it.avoided ? styles.chipAvoid : ''}`} title={it.plain}>
                  <span className="t-body" style={it.avoided ? { color: 'var(--hit)', fontWeight: 600 } : tn ? { color: `var(--band-${tn}-t)` } : it.verdict === 'unknown' ? { color: 'var(--t2)' } : undefined}>
                    {it.name}
                  </span>
                  <span className="t-caption c-t3">{q ? `${pos}번째${sub ? `, ${sub}` : ''}` : sub}</span>
                  <span className="visually-hidden">{`, ${LABEL[it.verdict]}`}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      </div>
      {present.length > 0 ? (
        <ul className={styles.legend} aria-label="색의 뜻">
          {present.map((v) => {
            const tn = tone(v);
            return (
              <li key={v}>
                <span
                  className={`t-caption ${styles.vtag}`}
                  style={tn ? { color: `var(--band-${tn}-t)`, borderColor: `color-mix(in srgb, var(--band-${tn}) 45%, transparent)`, background: `color-mix(in srgb, var(--band-${tn}) 8%, var(--surface))` } : { color: 'var(--t3)', borderStyle: 'dashed' }}
                >
                  {LABEL[v]}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

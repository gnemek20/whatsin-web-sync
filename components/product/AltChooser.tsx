'use client';
// 다른 선택 — 「세 축으로 더 낫다」를 대뜸 내밀지 않고, 사람이 고르는 기준으로 줄 세운다(2026-11-03 사용자).
//   맛 비슷한 순 · 영양 균형 좋은 순 · 다이어트할 때 · 혈당 관리할 때 · 첨가물 적게
// 후보는 모두 「맛 프로필이 비슷한 제품」(추천 v3 감각 프로필)이고, 탭은 그 안에서 순서만 바꾼다. 점수 · 등급은 내지 않는다.
import { useState } from 'react';
import { bandOf } from '@/lib/bands';
import { SHORT_WORD } from '@/lib/content/words';
import type { Alternative } from '@/lib/types';
import { AltTrack } from './AltTrack';
import styles from './detail.module.css';

type Key = 'taste' | 'nutrition' | 'diet' | 'glucose' | 'additive';
const n1 = (v: number) => (v < 10 ? Math.round(v * 10) / 10 : Math.round(v));
const carb = (a: Alternative) => {
  const g = a.axes?.glycemic;
  return g?.band === 'amount' && g.carb_g != null ? g.carb_g : g?.band === 'n/a' ? 0 : null;
};
const last = (v: number | null | undefined) => (v == null ? Infinity : v);
const unit = (a: Alternative) => (a.per100_unit === 'ml' ? '100mL' : '100g');

const TABS: { key: Key; label: string; sub: string; sort: (a: Alternative, b: Alternative) => number; note?: (a: Alternative) => string }[] = [
  { key: 'taste', label: '맛 비슷한 순', sub: '맛, 식감이 가장 비슷한 것부터', sort: (a, b) => (b.similarity ?? 0) - (a.similarity ?? 0) },
  {
    key: 'nutrition', label: '영양 균형 좋은 순', sub: '영양 균형 칸이 좋은 것부터',
    sort: (a, b) => last(bandOf(a.axes?.nutrition)) - last(bandOf(b.axes?.nutrition)) || (b.similarity ?? 0) - (a.similarity ?? 0),
  },
  {
    key: 'diet', label: '다이어트할 때', sub: '열량이 낮은 것부터',
    sort: (a, b) => last(a.kcal100) - last(b.kcal100),
    note: (a) => (a.kcal100 != null ? `${unit(a)}당 ${Math.round(a.kcal100)}kcal` : '열량 미확인'),
  },
  {
    key: 'glucose', label: '혈당 관리할 때', sub: '1회분 당질이 적은 것부터',
    sort: (a, b) => last(carb(a)) - last(carb(b)),
    note: (a) => (carb(a) != null ? `1회분 당질 ${n1(carb(a)!)}g` : '당질 양 미확인'),
  },
  {
    key: 'additive', label: '첨가물 적게', sub: '성분 칸이 좋은 것부터',
    sort: (a, b) => last(bandOf(a.axes?.ingredient)) - last(bandOf(b.axes?.ingredient)),
    note: (a) => {
      const b = bandOf(a.axes?.ingredient);
      return b ? `성분 ${SHORT_WORD(b)}` : '성분 미확인';
    },
  },
];

export function AltChooser({ items }: { items: Alternative[] }) {
  const [key, setKey] = useState<Key>('taste');
  const tab = TABS.find((t) => t.key === key)!;
  const list = [...items].sort(tab.sort).slice(0, 8);
  return (
    <div className={styles.chooser}>
      <div className={styles.chips} role="tablist" aria-label="다른 선택 기준">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={t.key === key} className={`t-caption ${styles.chip} ${t.key === key ? styles.chipOn : ''}`} onClick={() => setKey(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="t-caption c-t3">{`맛이 비슷한 제품 ${items.length}개 중 ${tab.sub}`}</p>
      <AltTrack items={list} label={tab.label} noteOf={tab.note} />
    </div>
  );
}

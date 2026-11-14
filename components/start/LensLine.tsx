'use client';
// 검색창 아래 — 「지금 이 기준으로 보여 드립니다」 한 줄. 누르면 고친다. 색은 놓인 면의 글자색을 따른다(오렌지 면 · 바탕 면 둘 다).
import { NUTRIENTS } from '@/lib/lens';
import { useLens } from '../lens/LensProvider';
import s from './start.module.css';

export function LensLine({ className }: { className?: string }) {
  const { lens, openEditor } = useLens();
  if (!lens) return null;
  return (
    <div className={`ui ${s.lensLine} ${className ?? ''}`}>
      <span className={s.lensLabel}>내 기준</span>
      {lens.focus.map((k) => (
        <span key={k} className={s.lensChip}>{NUTRIENTS[k].label}</span>
      ))}
      {lens.avoid.slice(0, 3).map((a) => (
        <span key={a.k} className={`${s.lensChip} ${s.lensAvoid}`}>{a.l} 피하기</span>
      ))}
      {lens.avoid.length > 3 ? <span className={`${s.lensChip} ${s.lensAvoid} num`}>+{lens.avoid.length - 3}</span> : null}
      <button type="button" className={s.lensEdit} onClick={() => openEditor()}>고치기</button>
    </div>
  );
}

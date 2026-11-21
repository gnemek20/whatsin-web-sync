'use client';
// 검색창 곁 — 「지금 이 기준으로 보여 드립니다」 한 줄 단추. 누르면 고친다.
// 2026-11-16 — 먼저 볼 숫자 · 피할 성분을 알약으로 늘어놓던 것을 한 문장으로(사용자 「태그나 라벨처럼 단순 나열하는 거 안 좋아해」).
import { NUTRIENTS } from '@/lib/lens';
import { useLens } from '../lens/LensProvider';
import { Icon } from '../Icon';
import s from './start.module.css';

export function LensLine({ className }: { className?: string }) {
  const { lens, openEditor } = useLens();
  if (!lens) return null;
  const n = lens.avoid.length;
  return (
    <button type="button" className={`ui ${s.lensRow} ${className ?? ''}`} onClick={() => openEditor()} aria-label="내 기준 고치기">
      <span className={s.lensIcon} aria-hidden>
        <Icon name="sliders" size={18} />
      </span>
      <span className={s.lensText}>
        <span className={s.lensMain}>{lens.focus.map((k) => NUTRIENTS[k].label).join(', ')} 먼저</span>
        <span className={s.lensSub}>{n ? `피할 성분 ${n}개` : '내 기준'}</span>
      </span>
      <Icon name="next" size={18} className={s.lensGo} />
    </button>
  );
}

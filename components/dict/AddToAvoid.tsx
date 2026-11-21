'use client';
// 성분 사전에서 바로 「피할 성분」에 넣기 · 빼기 — 내 기준을 고쳐 저장한다.
// 내 기준이 아직 없으면(온보딩 중) 단추 자리만 잡아 둔다 — 기준을 저장하는 순간 단추가 끼어들며 아래를 밀지 않게(레이아웃 규칙 ②).
// 폭은 가장 긴 글 기준으로 고정한다(넣기 ↔ 있음이 바뀌어도 그대로).
import { MAX_AVOID } from '@/lib/lens';
import { useLens } from '../lens/LensProvider';
import { Icon } from '../ui/Icon';
import s from './dict.module.css';

export function AddToAvoid({ k, label, className }: { k: string; label: string; className?: string }) {
  const { lens, save } = useLens();
  const on = !!lens && lens.avoid.some((a) => a.k === k);
  const full = !!lens && !on && lens.avoid.length >= MAX_AVOID;
  return (
    <button
      type="button"
      className={`btn btn-lg ${on ? 'btn-primary' : 'btn-ghost'} ${s.avoidBtn} ${lens ? '' : s.avoidHidden} ${className ?? ''}`}
      disabled={!lens || full}
      aria-hidden={lens ? undefined : true}
      tabIndex={lens ? undefined : -1}
      aria-pressed={on}
      onClick={() => {
        if (!lens) return;
        save({ ...lens, avoid: on ? lens.avoid.filter((a) => a.k !== k) : [...lens.avoid, { k, l: label, t: 'i' }] });
      }}
    >
      <Icon name={on ? 'check' : 'plus'} size={18} />
      {on ? '내 피할 성분에 있음' : full ? `피할 성분은 ${MAX_AVOID}개까지` : '피할 성분에 넣기'}
    </button>
  );
}

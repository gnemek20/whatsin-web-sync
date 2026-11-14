'use client';
// 머리 「내 기준」 — 먼저 볼 영양 · 피할 성분 수를 보이고, 누르면 고친다(온보딩 창의 확인 단계).
// 글자 길이가 바뀌어도 단추 폭이 흔들리지 않게 값 칸은 최대 폭 안에서 말줄임한다.
import { NUTRIENTS } from '@/lib/lens';
import { useLens } from '../lens/LensProvider';
import { Icon } from '../Icon';
import s from './shell.module.css';

export function LensButton() {
  const { lens, openEditor } = useLens();
  const n = lens?.avoid.length ?? 0;
  return (
    <button type="button" className={s.lensBtn} onClick={() => openEditor()} aria-label="내 기준 보기, 고치기">
      <Icon name="sliders" size={17} />
      <span className={s.lensLabel}>내 기준</span>
      <span className={s.lensValue}>{lens ? lens.focus.map((k) => NUTRIENTS[k].label).join(', ') : '정하기'}</span>
      <span className={`${s.lensCount} num`} aria-label={`피할 성분 ${n}개`} style={{ visibility: n ? 'visible' : 'hidden' }}>{n}</span>
    </button>
  );
}

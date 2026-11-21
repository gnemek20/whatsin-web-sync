'use client';
// 머리 「내 기준」 — 누르면 고친다(온보딩 창의 확인 단계 · 기준이 없으면 처음부터).
// 2026-11-16 — 값(먼저 볼 숫자) · 피할 성분 수를 머리에서 뺐다(사용자 「헤더가 여전히 마음에 안 들어」 · 값은 첫 화면 LensLine · 상세 「내 기준」에 있다).
import { useLens } from '../lens/LensProvider';
import { Icon } from '../Icon';
import s from './shell.module.css';

export function LensButton() {
  const { lens, openEditor } = useLens();
  return (
    <button type="button" className={s.lensBtn} onClick={() => openEditor()} aria-label={lens ? '내 기준 보기, 고치기' : '내 기준 정하기'}>
      <Icon name="sliders" size={16} />
      <span className={s.lensLabel}>내 기준</span>
    </button>
  );
}

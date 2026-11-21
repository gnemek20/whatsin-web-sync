'use client';
// 내 기준이 없을 때 제품 상세 맨 위 오른쪽 칸(2026-11-18 사용자) — 「내 기준을 설정하고, 원하는 정보를 빠르게 확인해 보세요!」 + 내 기준 정하기.
//   11-17 엔 이 칸을 아예 숨겼다(제품 카드만 한 줄) → 11-18 사용자가 같은 자리에 설정으로 이어 주는 칸을 넣자고 했다.
//   누르면 온보딩(LensProvider.openEditor)이 열리고, 열림은 온보딩이 lens_open 으로 남긴다(경로 /p/… 로 이 칸에서 연 것을 가른다).
import { useLens } from '../lens/LensProvider';
import { Icon } from '../Icon';
import s from './p.module.css';

export function LensPrompt() {
  const { openEditor } = useLens();
  return (
    <section className={s.prompt} aria-label="내 기준">
      <span className={s.promptIcon} aria-hidden><Icon name="sliders" size={22} /></span>
      <p className={s.promptText}>
        내 기준을 설정하고,
        <br />
        원하는 정보를 빠르게 확인해 보세요!
      </p>
      <button type="button" className={s.promptBtn} onClick={() => openEditor()}>
        내 기준 정하기
        <Icon name="next" size={16} />
      </button>
    </section>
  );
}

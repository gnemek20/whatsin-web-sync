// 직접 그린 UI 아이콘 — 24 격자 · 선 1.75 · 둥근 끝 · 채움 없음(DESIGN_RULES §6).
// 크기는 16 · 20 · 24 셋뿐. 경로는 앱 app/src/components/Icon.tsx 와 같다(2026-11-02 전부 새로 그림).
import type { SVGProps } from 'react';

export type IconName =
  | 'search' | 'back' | 'next' | 'close' | 'check' | 'info' | 'arrowUp' | 'arrowRight'
  | 'apple' | 'bowl' | 'flask' | 'scan' | 'sliders' | 'doc' | 'barcode' | 'phone' | 'cup' | 'alert' | 'share' | 'clock' | 'sun' | 'moon' | 'system';

// 점(ⓘ·기포)은 선보다 0.8 굵게 — 굵기를 받아 그린다.
const P: Record<IconName, (sw: number) => JSX.Element> = {
  // 돋보기
  search: (_sw) => <><circle cx="10.5" cy="10.5" r="6.25" /><path d="m15.2 15.2 4.8 4.8" /></>,
  // 왼쪽 꺾쇠
  back: (_sw) => <><path d="M15 5.5 8.5 12l6.5 6.5" /></>,
  // 오른쪽 꺾쇠
  next: (_sw) => <><path d="M9 5.5 15.5 12 9 18.5" /></>,
  // X
  close: (_sw) => <><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></>,
  // 체크
  check: (_sw) => <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  // ⓘ
  cup: (_sw) => <><path d="M6.5 8.5h11l-1.2 10.9a1.6 1.6 0 0 1-1.6 1.4H9.3a1.6 1.6 0 0 1-1.6-1.4z" /><path d="M7 12.5h10" /><path d="M13 8.5 14.6 3.5H17" /></>,
  alert: (sw) => <><path d="M10.6 4.6a1.6 1.6 0 0 1 2.8 0l7.2 12.8a1.6 1.6 0 0 1-1.4 2.4H4.8a1.6 1.6 0 0 1-1.4-2.4z" /><path d="M12 9.5v4.5" /><path d="M12 16.8v.01" strokeWidth={sw + 0.8} /></>,
  info: (sw) => <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><path d="M12 7.75v.01" strokeWidth={sw + 0.8} /></>,
  // 위 화살표(더 나음)
  arrowUp: (_sw) => <><path d="M12 19.5v-15" /><path d="M6 10.5l6-6 6 6" /></>,
  // 오른쪽 화살표
  arrowRight: (_sw) => <><path d="M4.5 12h15" /><path d="M13.5 6l6 6-6 6" /></>,
  // 사과(영양 축)
  apple: (_sw) => <><path d="M12 8c-1.5-1.2-4.4-1.5-6 .4-1.9 2.2-1.4 6.2.5 9.2 1.3 2 2.9 3.5 4.3 3.1.5-.1.8-.4 1.2-.4s.7.3 1.2.4c1.4.4 3-1.1 4.3-3.1 1.9-3 2.4-7 .5-9.2-1.6-1.9-4.5-1.6-6-.4z" /><path d="M12 8c0-1.7.4-3.1 1.3-4.3" /><path d="M13.4 5.6c.9-1.6 2.6-2.4 4.3-2.1-.4 1.7-2 2.6-4.3 2.1z" /></>,
  // 고봉밥 그릇(탄수화물 축)
  bowl: (_sw) => <><path d="M6 9.75c0-1.9 1.1-3.2 2.5-3.5.6-1.5 1.9-2.5 3.5-2.5s2.9 1 3.5 2.5c1.4.3 2.5 1.6 2.5 3.5" /><path d="M3.5 9.75h17" /><path d="M4.2 9.75c.5 4.3 3.6 7.5 7.8 7.5s7.3-3.2 7.8-7.5" /><path d="M9.5 19.75h5" /></>,
  // 플라스크 + 액면·기포(성분 축)
  flask: (sw) => <><path d="M9.5 3.5h5" /><path d="M10.5 3.5v5.5L5.2 17.8A1.9 1.9 0 0 0 6.8 20.5h10.4a1.9 1.9 0 0 0 1.6-2.7L13.5 9V3.5" /><path d="M7.6 14.5h8.8" /><path d="M10.5 17.5v.01M13.5 17v.01" strokeWidth={sw + 0.8} /></>,
  // 스캔 틀 + 바코드 막대
  scan: (_sw) => <><path d="M3.5 8V6a2.5 2.5 0 0 1 2.5-2.5h2" /><path d="M16 3.5h2A2.5 2.5 0 0 1 20.5 6v2" /><path d="M20.5 16v2a2.5 2.5 0 0 1-2.5 2.5h-2" /><path d="M8 20.5H6A2.5 2.5 0 0 1 3.5 18v-2" /><path d="M8 8.5v7M10.75 8.5v7M13.25 8.5v7M16 8.5v7" /></>,
  // 조절 슬라이더 2줄(섭취량 바꾸기)
  sliders: (_sw) => <><path d="M4 7.5h9M17 7.5h3" /><circle cx="15" cy="7.5" r="2" /><path d="M4 16.5h3M11 16.5h9" /><circle cx="9" cy="16.5" r="2" /></>,
  // 접힌 문서 + 글줄
  doc: (_sw) => <><path d="M7.5 3.5h6l5 5v10a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" /><path d="M13.5 3.5v5h5" /><path d="M9 13h6M9 16.5h4" /></>,
  // 바코드(막대 높낮이)
  barcode: (_sw) => <><path d="M4 5v14M7 5v14M9.5 5v10.5M12 5v14M14.5 5v10.5M17 5v14M20 5v14" /></>,
  // 공유(상자 + 위 화살표 · 웹 전용 — 공유 시트 버튼)
  share: (_sw) => <><path d="M12 3.5v11" /><path d="M8 7.5l4-4 4 4" /><path d="M8.5 10.5H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5" /></>,
  // 시계(최근 검색 · 앱 Icon clock 과 같은 자리)
  clock: (_sw) => <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  // 해 · 달(앱 Icon sun · moon 과 같은 경로) · 시스템(모니터 — 기기 설정을 따름) — 테마 고르기(components/ThemeToggle)
  sun: (_sw) => <><circle cx="12" cy="12" r="4" /><path d="M19.2 12L21 12M17.09 17.09L18.36 18.36M12 19.2L12 21M6.91 17.09L5.64 18.36M4.8 12L3 12M6.91 6.91L5.64 5.64M12 4.8L12 3M17.09 6.91L18.36 5.64" /></>,
  moon: (_sw) => <><path d="M19.5 14.2A7.8 7.8 0 1 1 9.8 4.5a6.2 6.2 0 0 0 9.7 9.7z" /></>,
  system: (_sw) => <><rect x="3.5" y="4.5" width="17" height="11.5" rx="2" /><path d="M9 20h6M12 16v4" /></>,
  // 스마트폰
  phone: (_sw) => <><rect x="6.5" y="3" width="11" height="18" rx="2.5" /><path d="M10.5 18.5h3" /></>,
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.75,
  ...rest
}: { name: IconName; size?: 16 | 20 | 24; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {P[name](strokeWidth)}
    </svg>
  );
}

/** 애플 로고 — App Store 버튼 전용(Apple 배지 가이드의 로고 자리). */
export function AppleMark({ size = 20 }: { size?: 16 | 20 | 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.32-3.52zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.22z" />
    </svg>
  );
}

// 바코드 원정대 그림 — 이 페이지 전용 일러스트(공용 아이콘 한 벌 components/Icon 과 따로 · 24 격자 규칙 밖).
// 색은 토큰만 쓴다(currentColor · var(--brand) 등) — 다크에서도 그대로 맞는다.
import type { Slot } from '@/lib/collect';

type Mood = 'idle' | 'read' | 'happy' | 'oops';

/** 마스코트 「와츠」 — 둥근 라벨 조각. 읽는 중이면 돋보기를 들고, 성공이면 눈웃음. */
export function Mascot({ mood = 'idle', size = 72 }: { mood?: Mood; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden>
      <ellipse cx="48" cy="88" rx="24" ry="4" fill="currentColor" opacity="0.08" />
      <path
        d="M48 10c17 0 32 11 32 33 0 22-12 39-32 39S16 65 16 43C16 21 31 10 48 10z"
        fill="var(--brand)"
      />
      <path d="M30 22c4-5 10-7 16-7" stroke="#fff" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* 배 — 작은 바코드 */}
      <rect x="35" y="55" width="26" height="15" rx="4" fill="#fff" opacity="0.92" />
      {[39, 42, 44, 47, 50, 52, 55, 57].map((x, i) => (
        <rect key={x} x={x} y="58" width={i % 3 === 0 ? 1.8 : 1.1} height="9" fill="#1a1a18" opacity="0.75" />
      ))}
      {mood === 'happy' ? (
        <>
          <path d="M33 39q4-5 8 0M55 39q4-5 8 0" stroke="#1a1a18" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M42 46q6 6 12 0" stroke="#1a1a18" strokeWidth="2.6" strokeLinecap="round" fill="#1a1a18" />
        </>
      ) : mood === 'oops' ? (
        <>
          <path d="M33 37l7 4M40 37l-7 4M56 37l7 4M63 37l-7 4" stroke="#1a1a18" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M43 49q5-3 10 0" stroke="#1a1a18" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="37" cy={mood === 'read' ? 40 : 39} rx="3.6" ry="4.6" fill="#1a1a18" />
          <ellipse cx="59" cy={mood === 'read' ? 40 : 39} rx="3.6" ry="4.6" fill="#1a1a18" />
          <circle cx="38.3" cy="37.4" r="1.3" fill="#fff" />
          <circle cx="60.3" cy="37.4" r="1.3" fill="#fff" />
          <path d="M44 46q4 3 8 0" stroke="#1a1a18" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>
      )}
      <ellipse cx="29" cy="47" rx="4.5" ry="2.6" fill="#fff" opacity="0.35" />
      <ellipse cx="67" cy="47" rx="4.5" ry="2.6" fill="#fff" opacity="0.35" />
      {mood === 'read' && (
        <g>
          <circle cx="72" cy="58" r="10" fill="#fff" fillOpacity="0.55" stroke="#1a1a18" strokeWidth="3.2" />
          <path d="M79 65l8 8" stroke="#1a1a18" strokeWidth="4.2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

const CROWN: Record<1 | 2 | 3, { fill: string; gem: string }> = {
  1: { fill: '#f5b62a', gem: '#ee6a35' },
  2: { fill: '#c9cdd3', gem: '#7a8fb0' },
  3: { fill: '#d99a63', gem: '#b4553a' },
};

/** 리더보드 왕관 — 1 금 · 2 은 · 3 동. */
export function Crown({ rank, size = 30 }: { rank: 1 | 2 | 3; size?: number }) {
  const c = CROWN[rank];
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 40 31" aria-hidden>
      <path d="M4 10l8 7 8-13 8 13 8-7-3 17H7z" fill={c.fill} stroke="#1a1a18" strokeOpacity="0.18" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="7" y="24" width="26" height="5" rx="2" fill={c.fill} stroke="#1a1a18" strokeOpacity="0.18" strokeWidth="1.2" />
      <circle cx="4" cy="9" r="2.6" fill={c.fill} />
      <circle cx="20" cy="3.6" r="2.6" fill={c.fill} />
      <circle cx="36" cy="9" r="2.6" fill={c.fill} />
      <circle cx="20" cy="18" r="2.8" fill={c.gem} />
      <path d="M12 14l1.6 2.6M28 14l-1.6 2.6" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** 사진 칸 그림 — 무엇을 찍을지 한눈에. */
export function SlotArt({ slot, size = 52 }: { slot: Slot; size?: number }) {
  const ink = 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {slot === 'front' && (
        <>
          <path d="M16 12h24l3 6v26a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4V18z" fill="var(--tile-snack-bg)" />
          <path d="M13 18h30" />
          <circle cx="28" cy="31" r="7" fill="var(--brand)" stroke="none" />
          <path d="M24.5 31.5l2.4 2.4 4.6-5" stroke="#fff" />
        </>
      )}
      {slot === 'label' && (
        <>
          <rect x="11" y="8" width="34" height="40" rx="4" fill="var(--tile-drink-bg)" />
          <path d="M16 15h14M16 20h24M16 25h20" />
          <rect x="16" y="30" width="24" height="13" rx="2" fill="var(--surface)" />
          <path d="M19 34h10M33 34h4M19 38.5h8M33 38.5h4" strokeWidth="1.8" />
        </>
      )}
      {slot === 'barcode' && (
        <>
          <rect x="9" y="13" width="38" height="30" rx="5" fill="var(--tile-dairy-bg)" />
          {[15, 19, 22, 26, 29, 33, 36, 40].map((x, i) => (
            <path key={x} d={`M${x} 19v14`} strokeWidth={i % 3 === 0 ? 3 : 1.8} />
          ))}
          <path d="M15 38h26" strokeWidth="1.6" strokeDasharray="2 2.6" />
        </>
      )}
    </svg>
  );
}

export function Coin({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#f5b62a" />
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="#c98a12" strokeWidth="1.4" />
      <path d="M8.6 9.2l1.4 5.6 2-4.4 2 4.4 1.4-5.6M8 11.6h8" stroke="#8a5a08" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function CameraGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 8.5A2 2 0 0 1 6.5 6.5h1.8l1.4-2h4.6l1.4 2h1.8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

export function AlbumGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4.5" width="16" height="15" rx="2.5" />
      <circle cx="9" cy="9.5" r="1.6" />
      <path d="M4.5 17l4.5-4.5 3.5 3.5 2.5-2.5 4.5 4.5" />
    </svg>
  );
}

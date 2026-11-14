// 로고 마크(2026-11-14 개편) — 둥근 네모 안의 라벨 줄 셋. 맨 위 줄 끝의 점이 「찾았다」를 뜻한다.
// 색은 토큰을 따른다(라이트 · 다크 모두 주황 위 흰 줄).
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <rect x="8" y="9.5" width="11" height="3" rx="1.5" fill="var(--on-brand)" />
      <circle cx="23" cy="11" r="2.4" fill="var(--on-brand)" />
      <rect x="8" y="14.5" width="16" height="3" rx="1.5" fill="var(--on-brand)" opacity="0.72" />
      <rect x="8" y="19.5" width="12" height="3" rx="1.5" fill="var(--on-brand)" opacity="0.46" />
    </svg>
  );
}

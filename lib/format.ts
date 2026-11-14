// 표시용 작은 도우미 — 서버 · 브라우저 공용.

/** 제조사 칸에 주소 · 공장명이 붙어 온다(「코카-콜라㈜_충남 천안시 …」 · 「F7(6931):씨에이…」) — 첫 조각만. */
export function brandName(brand?: string | null): string {
  return (brand ?? '').split(/[/_]|\s{2,}/)[0].replace(/^F\d+\(\d+\):/, '').trim();
}

/** 「제조사, 식품유형」 — 가운뎃점 대신 쉼표. */
export const subLine = (brand?: string | null, sub?: string | null) => [brandName(brand), sub].filter(Boolean).join(', ');

/** 상대 시각 — 커뮤니티 글. */
export function ago(ts: number, now = Date.now()): string {
  const m = Math.floor((now - ts) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  const dt = new Date(ts);
  return `${dt.getFullYear()}.${dt.getMonth() + 1}.${dt.getDate()}`;
}

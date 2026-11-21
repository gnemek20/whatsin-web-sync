'use client';
// 판정 기준(/score) 되살리기(2026-11-20 핫픽스) — 2026-11-02 웹 개편 때 지워진 옛 페이지가 쓰던 것을 이 화면 안에서만 다시 둔다.
//   앱 「판정 읽는 법」 시트 · 제품 화면 세 축 아래 「판정 기준 ›」(app ReadingNotice SCORE_URL = whatsin.kr/score)가 이 주소를 연다 — 개편 뒤 404 였다.
//   옛 lib/products(등급 이름 · 색) · components/icons(SearchIcon) · lib/api(클라이언트 호출)는 지금 코드에 없어 여기로 옮겼다(공용 lib 은 건드리지 않는다).
import { CLIENT_API } from '@/lib/config';
import { Icon } from '@/components/Icon';
import type { ProductSummary, ScoreExplain } from '@/lib/scoreTypes';

export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'E';
type Grade = { label: string; dot: string; text: string };
// 등급 색 — 지금 판정 띠 토큰(band 1~4)에 맞춘다
const GRADE: Record<GradeLetter, Grade> = {
  A: { label: '아주 좋아요', dot: 'var(--band-1)', text: 'var(--band-1-t)' },
  B: { label: '괜찮아요', dot: 'var(--band-1)', text: 'var(--band-1-t)' },
  C: { label: '보통이에요', dot: 'var(--band-2)', text: 'var(--band-2-t)' },
  D: { label: '조심하세요', dot: 'var(--band-3)', text: 'var(--band-3-t)' },
  E: { label: '피하세요', dot: 'var(--band-4)', text: 'var(--band-4-t)' },
};
export function gradeOf(letter: GradeLetter): Grade {
  return GRADE[letter] ?? GRADE.C;
}

export function SearchIcon(props: { stroke?: string }) {
  return <Icon name="search" size={20} style={props.stroke ? { color: props.stroke } : undefined} />;
}

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(`${status} ${detail}`);
  }
}
async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${CLIENT_API}${path}`, { cache: 'no-store' });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new ApiError(r.status, (j && (j.detail as string)) || r.statusText);
  }
  return r.json();
}
/** 지금 검색 API 는 {items} 로 준다(옛 판은 목록) — 둘 다 받는다 */
export async function searchProducts(q: string): Promise<ProductSummary[]> {
  const d = await get<ProductSummary[] | { items: ProductSummary[] }>(`/products/search?q=${encodeURIComponent(q)}`);
  return Array.isArray(d) ? d : d.items ?? [];
}
export function getScoreExplain(id: string): Promise<ScoreExplain> {
  return get<ScoreExplain>(`/products/${id}/score-explain`);
}

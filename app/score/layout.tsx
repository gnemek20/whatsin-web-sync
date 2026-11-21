// 판정 기준(/score · 2026-11-20 되살림) — 앱 「판정 기준 ›」이 여는 주소. 화면은 클라이언트라 제목은 여기서.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '판정 기준',
  description: '제품을 골라 점수가 어떻게 계산되는지 단계별로 봅니다.',
  alternates: { canonical: '/score' },
};

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}

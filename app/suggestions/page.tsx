// 건의함(2026-11-19 사용자 「헤더 성분 사전 오른쪽으로 건의함」) — 머리 메뉴 · 모바일 아래 탭의 다섯째. 화면은 components/suggestions/SuggestBox.
import type { Metadata } from 'next';
import { PageHero, PageSheet } from '@/components/shell/PageHero';
import { SuggestBox } from '@/components/suggestions/SuggestBox';

export const metadata: Metadata = {
  title: '건의함',
  description: '와츠인에 바라는 기능, 틀린 정보, 찾는 제품을 알려 주세요.',
  alternates: { canonical: '/suggestions' },
};

export default function SuggestionsPage() {
  return (
    <main className="ui">
      <PageHero narrow tone="tint" title="건의함" sub="바라는 기능, 틀린 정보, 찾는 제품을 알려 주세요. 답변은 이 화면 아래에 달아 드립니다." />
      <PageSheet narrow>
        <SuggestBox />
      </PageSheet>
    </main>
  );
}

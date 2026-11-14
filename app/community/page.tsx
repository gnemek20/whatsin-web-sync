// 커뮤니티 — 2026-11-13 시험판(이 브라우저에만 저장 · lib/community). 2026-11-14 디자인 v4 — 머리(PageHero) + 두 단(글 목록 | 옆 단).
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CommunityList, CommunityListSkeleton } from '@/components/community/CommunityList';
import { PageHero, PageSheet } from '@/components/shell/PageHero';
import { Icon } from '@/components/Icon';

export const metadata: Metadata = { title: '커뮤니티', description: '성분표 보는 요령, 장보기 꿀팁, 궁금한 것을 나눕니다.' };

export default function CommunityPage() {
  return (
    <main className="ui">
      <PageHero
        tone="warm"
        eyebrow="커뮤니티"
        title="꿀팁 나누기"
        sub="성분표 보는 요령, 장보기 꿀팁, 궁금한 것을 나눕니다."
        action={
          <Link href="/community/write" className="btn btn-primary btn-lg">
            <Icon name="edit" size={18} />글쓰기
          </Link>
        }
      />
      <PageSheet>
        <Suspense fallback={<CommunityListSkeleton />}>
          <CommunityList />
        </Suspense>
      </PageSheet>
    </main>
  );
}

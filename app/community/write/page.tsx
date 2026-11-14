import type { Metadata } from 'next';
import { Composer } from '@/components/community/Composer';
import { PageHero, PageSheet } from '@/components/shell/PageHero';

export const metadata: Metadata = { title: '글쓰기' };

export default function WritePage() {
  return (
    <main className="ui">
      <PageHero narrow tone="warm" eyebrow="커뮤니티" title="꿀팁 남기기" sub="확인한 방법과 사실을 나눠 주세요. 출처가 있으면 같이 적으면 좋습니다." />
      <PageSheet narrow>
        <Composer />
      </PageSheet>
    </main>
  );
}

import type { Metadata } from 'next';
import { Composer } from '@/components/community/Composer';
import { PageHero, PageSheet } from '@/components/shell/PageHero';

export const metadata: Metadata = { title: '글쓰기' };

export default function WritePage() {
  return (
    <main className="ui">
      <PageHero narrow tone="warm" eyebrow="커뮤니티" title="꿀팁 남기기" />
      <PageSheet narrow>
        <Composer />
      </PageSheet>
    </main>
  );
}

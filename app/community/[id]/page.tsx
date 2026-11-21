import type { Metadata } from 'next';
import { PostView } from '@/components/community/PostView';
import { PageSheet } from '@/components/shell/PageHero';

export const metadata: Metadata = { title: '커뮤니티' };

export default function PostPage({ params }: { params: { id: string } }) {
  return (
    <main className="ui">
      <PageSheet narrow>
        <PostView id={params.id} />
      </PageSheet>
    </main>
  );
}

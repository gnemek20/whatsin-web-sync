'use client';
// 커뮤니티 꿀팁 — 공감 많은 글 셋(검색 첫 화면 옆 단). 섹션 · 목록 카드 공용 조각을 쓴다.
import { useEffect, useState } from 'react';
import { catLabel, listPosts, onCommunity, type Post } from '@/lib/community';
import { ago } from '@/lib/format';
import { Section } from '../ui/Section';
import { ListCard, ListRow, TextAction } from '../ui/ListCard';

export function LatestPosts() {
  const [xs, setXs] = useState<Post[] | null>(null);
  useEffect(() => {
    const sync = () => setXs(listPosts({ sort: 'top' }).slice(0, 3));
    sync();
    return onCommunity(sync);
  }, []);
  if (!xs || !xs.length) return null;
  return (
    <Section id="cm-h" title="커뮤니티 꿀팁" action={<TextAction href="/community">더 보기</TextAction>}>
      <ListCard>
        {xs.map((p) => (
          <ListRow key={p.id} href={`/community/${p.id}`} title={p.title} sub={`${catLabel(p.cat)}, 공감 ${p.likes}, ${ago(p.at)}`} />
        ))}
      </ListCard>
    </Section>
  );
}

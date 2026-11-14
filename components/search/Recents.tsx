'use client';
// 최근 검색 · 최근 본 제품 — 이 기기 기록(lib/recents). 앱 SearchScreen 「최근 검색」 · 홈 「최근 본 제품」과 같은 자리.
// 서버 렌더에는 없고(기기마다 다르다) 붙은 뒤 그린다 — 기록이 없으면 섹션째 그리지 않는다(빈 자리를 남기지 않는다).
import { useEffect, useState } from 'react';
import { ProductList } from '../ProductRow';
import { Icon } from '../Icon';
import { clearViews, onRecents, recentQueries, recentViews, recordQuery, recordView, removeQuery, type RecentView } from '@/lib/recents';
import type { ProductSummary } from '@/lib/types';
import { Section } from '../ui/Section';
import { ListCard, ListRow, TextAction } from '../ui/ListCard';

function useRecents() {
  const [state, set] = useState<{ views: RecentView[]; queries: string[] } | null>(null);
  useEffect(() => {
    const load = () => set({ views: recentViews(), queries: recentQueries() });
    load();
    return onRecents(load);
  }, []);
  return state;
}

export function RecentQueries() {
  const r = useRecents();
  if (!r || r.queries.length === 0) return null;
  return (
    <Section id="recent-q" title="최근 검색">
      <ListCard>
        {r.queries.map((q) => (
          <ListRow
            key={q}
            href={`/search?q=${encodeURIComponent(q)}`}
            leading={<Icon name="clock" size={20} />}
            title={q}
            chevron={false}
            trailing={
              <TextAction onClick={() => removeQuery(q)}>
                <Icon name="close" size={16} />
                <span className="visually-hidden">{q} 지우기</span>
              </TextAction>
            }
          />
        ))}
      </ListCard>
    </Section>
  );
}

export function RecentViews({ max = 5 }: { max?: number }) {
  const r = useRecents();
  if (!r || r.views.length === 0) return null;
  return (
    <Section id="recent-v" title="최근 본 제품" action={<TextAction onClick={clearViews}>지우기</TextAction>}>
      <ProductList items={r.views.slice(0, max)} />
    </Section>
  );
}

/** 제품 화면에 붙인다 — 본 제품을 이 기기 기록에 남긴다. */
export function RecordView({ p }: { p: ProductSummary }) {
  useEffect(() => {
    recordView(p);
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** 검색 결과 화면에 붙인다 — 링크로 들어온 검색어(예시 · 공유 주소)도 최근 검색에 남긴다. */
export function RecordQuery({ q }: { q: string }) {
  useEffect(() => {
    recordQuery(q);
  }, [q]);
  return null;
}

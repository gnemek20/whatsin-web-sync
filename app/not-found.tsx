// 없는 페이지 — 가운데 빈 상태 + 갈 곳 두 개(검색 · 성분 사전). 2026-11-14 새 디자인(알약 단추).
import Link from 'next/link';
import { EmptyState } from '@/components/States';
import { Icon } from '@/components/Icon';

export default function NotFound() {
  return (
    <main
      className="container"
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '60vh', paddingTop: 'var(--s-section)', paddingBottom: 'var(--s-band)' }}
    >
      <EmptyState title="없는 페이지" body="주소가 바뀌었거나 자료에 없는 페이지입니다.">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 'var(--s-tight)' }}>
          <Link href="/search" className="btn btn-primary">
            <Icon name="search" size={18} />
            검색으로
          </Link>
          <Link href="/i" className="btn btn-ghost">
            <Icon name="flask" size={18} />
            성분 사전
          </Link>
        </div>
      </EmptyState>
    </main>
  );
}
